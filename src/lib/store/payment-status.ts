/**
 * In-Memory Payment Status Store
 * 
 * Task 5.2.1: Create in-memory payment status store
 * 
 * This module implements a simple in-memory store for tracking payment statuses
 * by Bitcoin address. The store is updated by webhook events and queried by
 * the client through the status API endpoint.
 * 
 * Key features:
 * - Simple Map-based storage for payment statuses
 * - Thread-safe operations (JavaScript is single-threaded)
 * - Status types: AWAITING_PAYMENT, PAYMENT_DETECTED, CONFIRMED, ERROR
 * - Stores transaction details including confirmations and transaction ID
 * 
 * Security considerations:
 * - Only stores public information (addresses, transaction IDs)
 * - No private keys or sensitive data
 * - Data is ephemeral (lost on server restart)
 */

import { PaymentStatus, type PaymentStatusResponse } from "../../../types";

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
 * In-memory store for payment statuses
 * Key: Bitcoin testnet address
 * Value: Payment status data
 */
const paymentStatusStore = new Map<string, PaymentStatusData>();

/**
 * Initialize a new payment status entry
 * Called when a payment request is created
 * 
 * @param address - Bitcoin testnet address
 * @param expectedAmount - Expected payment amount in BTC (optional)
 * @param webhookId - BlockCypher webhook ID (optional)
 */
export function initializePaymentStatus(
  address: string,
  expectedAmount?: number,
  webhookId?: string
): void {
  const now = Date.now();
  
  const initialStatus: PaymentStatusData = {
    address,
    status: PaymentStatus.AWAITING_PAYMENT,
    expectedAmount,
    webhookId,
    createdAt: now,
    lastUpdated: now,
  };

  paymentStatusStore.set(address, initialStatus);
  
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
export function updatePaymentStatus(
  address: string,
  status: PaymentStatus,
  transactionId: string,
  confirmations: number = 0,
  receivedAmount?: number,
  confidence?: number,
  isDoubleSpend?: boolean
): void {
  const existingStatus = paymentStatusStore.get(address);
  
  if (!existingStatus) {
    console.warn(
      "[PAYMENT_STORE] Attempted to update non-existent payment status for address:",
      address
    );
    // Initialize with the update data if not exists
    const now = Date.now();
    paymentStatusStore.set(address, {
      address,
      status,
      transactionId,
      confirmations,
      receivedAmount,
      confidence,
      isDoubleSpend,
      createdAt: now,
      lastUpdated: now,
    });
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

  paymentStatusStore.set(address, updatedStatus);
  
  console.log("[PAYMENT_STORE] Updated payment status for address:", address, {
    status,
    transactionId,
    confirmations,
    receivedAmount,
    isDoubleSpend,
  });
}

/**
 * Get payment status for a specific address
 * Returns a client-safe subset of the stored data
 * 
 * @param address - Bitcoin testnet address
 * @returns Payment status response or null if not found
 */
export function getPaymentStatus(address: string): PaymentStatusResponse | null {
  const statusData = paymentStatusStore.get(address);
  
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
export function hasPaymentStatus(address: string): boolean {
  return paymentStatusStore.has(address);
}

/**
 * Delete payment status for an address
 * Useful for cleanup or testing
 * 
 * @param address - Bitcoin testnet address
 * @returns True if deleted, false if not found
 */
export function deletePaymentStatus(address: string): boolean {
  const deleted = paymentStatusStore.delete(address);
  
  if (deleted) {
    console.log("[PAYMENT_STORE] Deleted payment status for address:", address);
  }
  
  return deleted;
}

/**
 * Clear all payment statuses
 * Useful for testing or cleanup
 */
export function clearAllPaymentStatuses(): void {
  const count = paymentStatusStore.size;
  paymentStatusStore.clear();
  console.log(`[PAYMENT_STORE] Cleared all ${count} payment statuses`);
}

/**
 * Get all payment statuses (for debugging/monitoring)
 * Returns a safe copy of the data
 * 
 * @returns Array of all payment statuses
 */
export function getAllPaymentStatuses(): PaymentStatusData[] {
  return Array.from(paymentStatusStore.values()).map(status => ({ ...status }));
}

/**
 * Get store statistics (for monitoring)
 * 
 * @returns Store statistics
 */
export function getStoreStats(): {
  totalEntries: number;
  statusCounts: Record<PaymentStatus, number>;
  oldestEntry?: number;
  newestEntry?: number;
} {
  const statuses = Array.from(paymentStatusStore.values());
  
  const statusCounts = statuses.reduce((acc, status) => {
    acc[status.status] = (acc[status.status] || 0) + 1;
    return acc;
  }, {} as Record<PaymentStatus, number>);

  const timestamps = statuses.map(s => s.createdAt).sort();
  
  return {
    totalEntries: paymentStatusStore.size,
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
export function cleanupOldEntries(maxAgeMs: number): number {
  const now = Date.now();
  const cutoffTime = now - maxAgeMs;
  let removedCount = 0;

  for (const [address, status] of paymentStatusStore.entries()) {
    if (status.createdAt < cutoffTime) {
      paymentStatusStore.delete(address);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(
      `[PAYMENT_STORE] Cleaned up ${removedCount} old entries older than ${maxAgeMs}ms`
    );
  }

  return removedCount;
}