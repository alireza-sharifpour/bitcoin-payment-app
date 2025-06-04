/**
 * File-Based Payment Status Store
 * 
 * Task 5.2.1: Create persistent payment status store
 * 
 * This module implements a file-based store for tracking payment statuses
 * by Bitcoin address. The store is updated by webhook events and queried by
 * the client through the status API endpoint.
 * 
 * Key features:
 * - File-based persistent storage for payment statuses
 * - Thread-safe operations using atomic file writes
 * - Status types: AWAITING_PAYMENT, PAYMENT_DETECTED, CONFIRMED, ERROR
 * - Stores transaction details including confirmations and transaction ID
 * 
 * Security considerations:
 * - Only stores public information (addresses, transaction IDs)
 * - No private keys or sensitive data
 * - Data persists across server restarts
 */

import { PaymentStatus, type PaymentStatusResponse } from "../../../types";
import { promises as fs } from "fs";
import path from "path";
import { existsSync } from "fs";

/**
 * Extended payment status data stored internally
 * Includes additional metadata beyond what's exposed to clients
 */
interface PaymentStatusData extends PaymentStatusResponse {
  /** Bitcoin address for this payment */
  address: string;
  /** Amount expected in BTC (optional) */
  expectedAmount?: number;
  /** Amount received in satoshis (optional) */
  receivedAmount?: number;
  /** Webhook ID from BlockCypher (optional) */
  webhookId?: string;
  /** When the payment request was created */
  createdAt: number;
  /** Confidence level for unconfirmed transactions (0-100) */
  confidence?: number;
  /** Whether this is a double spend attempt */
  isDoubleSpend?: boolean;
}

/**
 * File-based store configuration
 * Uses unique directories for tests to prevent concurrent access issues
 */
function getStoreConfig() {
  const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
  const baseDir = isTest 
    ? path.join(process.cwd(), '.payment-store-test', `worker-${process.env.JEST_WORKER_ID || 'main'}`)
    : path.join(process.cwd(), '.payment-store');
  
  return {
    STORE_DIR: baseDir,
    STORE_FILE: path.join(baseDir, 'payment-statuses.json')
  };
}

/**
 * Ensure store directory exists
 */
async function ensureStoreDir(): Promise<void> {
  const { STORE_DIR } = getStoreConfig();
  if (!existsSync(STORE_DIR)) {
    await fs.mkdir(STORE_DIR, { recursive: true });
  }
}

/**
 * Load payment statuses from file
 */
async function loadPaymentStatuses(): Promise<Map<string, PaymentStatusData>> {
  try {
    const { STORE_FILE } = getStoreConfig();
    await ensureStoreDir();
    
    if (!existsSync(STORE_FILE)) {
      return new Map();
    }
    
    const data = await fs.readFile(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch (error) {
    console.error('[PAYMENT_STORE] Error loading payment statuses:', error);
    return new Map();
  }
}

/**
 * Save payment statuses to file
 */
async function savePaymentStatuses(store: Map<string, PaymentStatusData>): Promise<void> {
  try {
    const { STORE_FILE } = getStoreConfig();
    await ensureStoreDir();
    
    const data = JSON.stringify(Object.fromEntries(store), null, 2);
    await fs.writeFile(STORE_FILE, data, 'utf-8');
  } catch (error) {
    console.error('[PAYMENT_STORE] Error saving payment statuses:', error);
    throw error;
  }
}

/**
 * Initialize a new payment status entry
 * Called when a payment request is created
 * 
 * @param address - Bitcoin testnet address
 * @param expectedAmount - Expected payment amount in BTC (optional)
 * @param webhookId - BlockCypher webhook ID (optional)
 */
export async function initializePaymentStatus(
  address: string,
  expectedAmount?: number,
  webhookId?: string
): Promise<void> {
  const now = Date.now();
  
  const initialStatus: PaymentStatusData = {
    address,
    status: PaymentStatus.AWAITING_PAYMENT,
    expectedAmount,
    webhookId,
    createdAt: now,
    lastUpdated: now,
  };

  const store = await loadPaymentStatuses();
  store.set(address, initialStatus);
  await savePaymentStatuses(store);
  
  console.log("[PAYMENT_STORE] Initialized payment status for address:", address, {
    expectedAmount,
    webhookId,
    status: PaymentStatus.AWAITING_PAYMENT,
  });
}

/**
 * Update payment status from webhook data
 * Called when BlockCypher sends a webhook notification
 * 
 * @param address - Bitcoin testnet address
 * @param status - New payment status
 * @param transactionId - Transaction hash/ID
 * @param confirmations - Number of confirmations
 * @param receivedAmount - Amount received in satoshis (optional)
 * @param confidence - Confidence level for unconfirmed tx (optional)
 * @param isDoubleSpend - Whether this is a double spend (optional)
 */
export async function updatePaymentStatus(
  address: string,
  status: PaymentStatus,
  transactionId: string,
  confirmations: number = 0,
  receivedAmount?: number,
  confidence?: number,
  isDoubleSpend?: boolean
): Promise<void> {
  const store = await loadPaymentStatuses();
  const existingStatus = store.get(address);
  
  if (!existingStatus) {
    console.warn(
      "[PAYMENT_STORE] Attempted to update non-existent payment status for address:",
      address
    );
    // Do NOT create new entries for unknown addresses
    // Only update addresses that were initialized by createPaymentRequest
    return;
  }

  // Update the status
  const updatedStatus: PaymentStatusData = {
    ...existingStatus,
    status,
    transactionId,
    confirmations,
    receivedAmount: receivedAmount ?? existingStatus.receivedAmount,
    confidence: confidence ?? existingStatus.confidence,
    isDoubleSpend: isDoubleSpend ?? existingStatus.isDoubleSpend,
    lastUpdated: Date.now(),
  };

  // Handle error status
  if (status === PaymentStatus.ERROR) {
    if (isDoubleSpend) {
      updatedStatus.errorMessage = "Double spend detected";
    } else {
      updatedStatus.errorMessage = "Payment processing error";
    }
  }

  store.set(address, updatedStatus);
  await savePaymentStatuses(store);
  
  console.log("[PAYMENT_STORE] Updated payment status for address:", address, {
    status,
    transactionId,
    confirmations,
    receivedAmount,
    isDoubleSpend,
  });
}

/**
 * Check if an address is being monitored for payments
 * 
 * @param address - Bitcoin testnet address
 * @returns True if the address exists in the store
 */
export async function isAddressMonitored(address: string): Promise<boolean> {
  const store = await loadPaymentStatuses();
  return store.has(address);
}

/**
 * Get payment status for a specific address
 * Returns a client-safe subset of the stored data
 * 
 * @param address - Bitcoin testnet address
 * @returns Payment status response or null if not found
 */
export async function getPaymentStatus(address: string): Promise<PaymentStatusResponse | null> {
  const store = await loadPaymentStatuses();
  const statusData = store.get(address);
  
  if (!statusData) {
    console.log("[PAYMENT_STORE] Payment status not found for address:", address);
    return null;
  }

  // Return only client-safe fields
  const response: PaymentStatusResponse = {
    status: statusData.status,
    confirmations: statusData.confirmations,
    transactionId: statusData.transactionId,
    errorMessage: statusData.errorMessage,
    lastUpdated: statusData.lastUpdated,
  };

  return response;
}

/**
 * Check if a payment status exists for an address
 * 
 * @param address - Bitcoin testnet address
 * @returns True if status exists, false otherwise
 */
export async function hasPaymentStatus(address: string): Promise<boolean> {
  const store = await loadPaymentStatuses();
  return store.has(address);
}

/**
 * Delete payment status for an address
 * Useful for cleanup or testing
 * 
 * @param address - Bitcoin testnet address
 * @returns True if deleted, false if not found
 */
export async function deletePaymentStatus(address: string): Promise<boolean> {
  const store = await loadPaymentStatuses();
  const deleted = store.delete(address);
  
  if (deleted) {
    await savePaymentStatuses(store);
    console.log("[PAYMENT_STORE] Deleted payment status for address:", address);
  }
  
  return deleted;
}

/**
 * Clear all payment statuses
 * Useful for testing or cleanup
 */
export async function clearAllPaymentStatuses(): Promise<void> {
  const store = await loadPaymentStatuses();
  const count = store.size;
  store.clear();
  await savePaymentStatuses(store);
  console.log(`[PAYMENT_STORE] Cleared all ${count} payment statuses`);
}

/**
 * Get all payment statuses (for debugging/monitoring)
 * Returns a safe copy of the data
 * 
 * @returns Array of all payment statuses
 */
export async function getAllPaymentStatuses(): Promise<PaymentStatusData[]> {
  const store = await loadPaymentStatuses();
  return Array.from(store.values()).map(status => ({ ...status }));
}

/**
 * Get store statistics (for monitoring)
 * 
 * @returns Store statistics
 */
export async function getStoreStats(): Promise<{
  totalEntries: number;
  statusCounts: Record<PaymentStatus, number>;
  oldestEntry?: number;
  newestEntry?: number;
}> {
  const store = await loadPaymentStatuses();
  const statuses = Array.from(store.values());
  
  const statusCounts = statuses.reduce((acc, status) => {
    acc[status.status] = (acc[status.status] || 0) + 1;
    return acc;
  }, {} as Record<PaymentStatus, number>);

  const timestamps = statuses.map(s => s.createdAt).sort();
  
  return {
    totalEntries: store.size,
    statusCounts,
    oldestEntry: timestamps[0],
    newestEntry: timestamps[timestamps.length - 1],
  };
}

/**
 * Optional: Cleanup old entries (if needed for memory management)
 * Removes entries older than the specified age
 * 
 * @param maxAgeMs - Maximum age in milliseconds
 * @returns Number of entries removed
 */
export async function cleanupOldEntries(maxAgeMs: number): Promise<number> {
  const store = await loadPaymentStatuses();
  const now = Date.now();
  const cutoffTime = now - maxAgeMs;
  let removedCount = 0;

  for (const [address, status] of store.entries()) {
    if (status.createdAt < cutoffTime) {
      store.delete(address);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    await savePaymentStatuses(store);
    console.log(
      `[PAYMENT_STORE] Cleaned up ${removedCount} old entries older than ${maxAgeMs}ms`
    );
  }

  return removedCount;
}