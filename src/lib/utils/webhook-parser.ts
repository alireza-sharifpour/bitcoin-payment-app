/**
 * Webhook Parser Utility for BlockCypher Payment Updates
 *
 * Task 5.1.3: Parse transaction data from webhook
 *
 * This utility extracts relevant transaction data from validated BlockCypher
 * webhook payloads and maps them to internal payment status types.
 *
 * Features:
 * - Extract transaction hash, confirmations, and address
 * - Map BlockCypher events to PaymentStatus enum
 * - Handle different event types (unconfirmed-tx, confirmed-tx, tx-confirmation)
 * - Validate payment amounts and outputs
 */

import type { BlockcypherWebhookPayload } from "@/lib/validation/webhook";
import { PaymentStatus } from "../../../types";

/**
 * Parsed transaction data extracted from webhook
 */
export interface ParsedTransactionData {
  /** Transaction hash from BlockCypher */
  transactionHash: string;
  /** Number of confirmations (0 for unconfirmed) */
  confirmations: number;
  /** Bitcoin address that received payment */
  address: string;
  /** Payment status mapped from BlockCypher event */
  status: PaymentStatus;
  /** Total amount received in satoshis */
  totalAmount?: number;
  /** Transaction fees in satoshis */
  fees?: number;
  /** Confidence level for unconfirmed transactions (0-100) */
  confidence?: number;
  /** Whether this is a double spend attempt */
  isDoubleSpend: boolean;
  /** Timestamp when webhook was processed */
  lastUpdated: number;
}

/**
 * Maps BlockCypher webhook events to internal PaymentStatus enum
 *
 * @param event - BlockCypher event type
 * @param confirmations - Number of confirmations
 * @param isDoubleSpend - Whether this is a double spend
 * @returns Mapped PaymentStatus
 */
export function mapEventToPaymentStatus(
  event: string,
  confirmations: number = 0,
  isDoubleSpend: boolean = false
): PaymentStatus {
  // Handle double spend attempts
  if (isDoubleSpend) {
    return PaymentStatus.ERROR;
  }

  switch (event) {
    case "unconfirmed-tx":
      return PaymentStatus.PAYMENT_DETECTED;

    case "confirmed-tx":
    case "tx-confirmation":
      // Consider transactions with 1+ confirmations as confirmed
      return confirmations >= 1
        ? PaymentStatus.CONFIRMED
        : PaymentStatus.PAYMENT_DETECTED;

    case "double-spend-tx":
      return PaymentStatus.ERROR;

    case "new-block":
      // Block events don't directly affect payment status
      // Return current status based on confirmations
      return confirmations >= 1
        ? PaymentStatus.CONFIRMED
        : PaymentStatus.PAYMENT_DETECTED;

    default:
      console.warn(`[WEBHOOK_PARSER] Unknown event type: ${event}`);
      return confirmations >= 1
        ? PaymentStatus.CONFIRMED
        : PaymentStatus.PAYMENT_DETECTED;
  }
}

/**
 * Extracts all receiving addresses from webhook payload outputs
 *
 * For payment monitoring, we need to find which of our registered addresses
 * received funds in this transaction.
 *
 * @param payload - Validated BlockCypher webhook payload
 * @returns Array of addresses that received funds in this transaction
 */
export function extractReceivingAddresses(
  payload: BlockcypherWebhookPayload
): string[] {
  const addresses: string[] = [];

  // If there's a direct address field and it's the recipient, include it
  if (payload.address) {
    addresses.push(payload.address as string);
  }

  // Extract all addresses from outputs (recipients of the transaction)
  if (payload.outputs && payload.outputs.length > 0) {
    for (const output of payload.outputs) {
      if (output.addresses && output.addresses.length > 0) {
        addresses.push(...output.addresses);
      }
    }
  }

  // Return unique addresses
  return [...new Set(addresses)];
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use extractReceivingAddresses instead
 */
export function extractAddress(
  payload: BlockcypherWebhookPayload
): string | null {
  const addresses = extractReceivingAddresses(payload);
  return addresses.length > 0 ? addresses[0] : null;
}

/**
 * Calculates total amount received for a specific address
 *
 * @param payload - Validated BlockCypher webhook payload
 * @param targetAddress - Address to calculate amount for
 * @returns Total amount in satoshis, or undefined if cannot determine
 */
export function calculateAmountReceived(
  payload: BlockcypherWebhookPayload,
  targetAddress: string
): number | undefined {
  // If payload has a total and address matches, use that
  if (payload.total !== undefined && payload.address === targetAddress) {
    return payload.total;
  }

  // Otherwise, sum from outputs
  if (payload.outputs && payload.outputs.length > 0) {
    let totalAmount = 0;

    for (const output of payload.outputs) {
      if (output.addresses && output.addresses.includes(targetAddress)) {
        totalAmount += output.value;
      }
    }

    return totalAmount > 0 ? totalAmount : undefined;
  }

  return payload.total;
}

/**
 * Main parsing function that extracts all relevant transaction data
 * from a validated BlockCypher webhook payload
 *
 * @param payload - Validated BlockCypher webhook payload
 * @param eventType - Event type from webhook headers
 * @returns Parsed transaction data or null if address cannot be determined
 */
export function parseWebhookTransaction(
  payload: BlockcypherWebhookPayload,
  eventType: string
): ParsedTransactionData | null {
  const address = extractAddress(payload);

  if (!address) {
    console.warn(
      "[WEBHOOK_PARSER] Could not determine target address from webhook payload"
    );
    return null;
  }

  const confirmations = payload.confirmations ?? 0;
  const isDoubleSpend = payload.double_spend ?? false;
  const status = mapEventToPaymentStatus(
    eventType,
    confirmations,
    isDoubleSpend
  );
  const totalAmount = calculateAmountReceived(payload, address);

  const parsedData: ParsedTransactionData = {
    transactionHash: payload.hash,
    confirmations,
    address,
    status,
    totalAmount,
    fees: payload.fees,
    confidence: payload.confidence as number,
    isDoubleSpend,
    lastUpdated: Date.now(),
  };

  console.log("[WEBHOOK_PARSER] Parsed transaction data:", {
    transactionHash: parsedData.transactionHash,
    address: parsedData.address,
    status: parsedData.status,
    confirmations: parsedData.confirmations,
    totalAmount: parsedData.totalAmount,
    event: eventType,
  });

  return parsedData;
}

/**
 * Parses webhook transaction data for multiple receiving addresses
 * 
 * This function extracts transaction data for all addresses that received
 * funds in the transaction, allowing us to update payment status for any
 * monitored addresses.
 *
 * @param payload - Validated BlockCypher webhook payload
 * @param eventType - Event type from webhook headers
 * @returns Array of parsed transaction data for each receiving address
 */
export function parseWebhookTransactionForAllAddresses(
  payload: BlockcypherWebhookPayload,
  eventType: string
): ParsedTransactionData[] {
  const addresses = extractReceivingAddresses(payload);

  if (addresses.length === 0) {
    console.warn(
      "[WEBHOOK_PARSER] No receiving addresses found in webhook payload"
    );
    return [];
  }

  const confirmations = payload.confirmations ?? 0;
  const isDoubleSpend = payload.double_spend ?? false;
  const status = mapEventToPaymentStatus(
    eventType,
    confirmations,
    isDoubleSpend
  );

  const parsedDataArray: ParsedTransactionData[] = [];

  // Create parsed data for each receiving address
  for (const address of addresses) {
    const totalAmount = calculateAmountReceived(payload, address);
    
    // Skip addresses that didn't receive any funds
    if (totalAmount === undefined || totalAmount === 0) {
      continue;
    }

    const parsedData: ParsedTransactionData = {
      transactionHash: payload.hash,
      confirmations,
      address,
      status,
      totalAmount,
      fees: payload.fees,
      confidence: payload.confidence as number,
      isDoubleSpend,
      lastUpdated: Date.now(),
    };

    console.log("[WEBHOOK_PARSER] Parsed transaction data for address:", {
      transactionHash: parsedData.transactionHash,
      address: parsedData.address,
      status: parsedData.status,
      confirmations: parsedData.confirmations,
      totalAmount: parsedData.totalAmount,
      event: eventType,
    });

    parsedDataArray.push(parsedData);
  }

  return parsedDataArray;
}

/**
 * Validates that a parsed transaction meets minimum requirements
 *
 * @param data - Parsed transaction data
 * @returns True if valid, false otherwise
 */
export function isValidTransaction(data: ParsedTransactionData): boolean {
  // Must have valid transaction hash
  if (!data.transactionHash || data.transactionHash.length < 10) {
    return false;
  }

  // Must have valid address
  if (
    !data.address ||
    (!data.address.startsWith("tb1") &&
      !data.address.startsWith("2") &&
      !data.address.startsWith("m") &&
      !data.address.startsWith("n"))
  ) {
    return false;
  }

  // Confirmations must be non-negative
  if (data.confirmations < 0) {
    return false;
  }

  // If amount is specified, it must be positive
  if (data.totalAmount !== undefined && data.totalAmount <= 0) {
    return false;
  }

  return true;
}
