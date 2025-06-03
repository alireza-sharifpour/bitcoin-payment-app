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
 * Extracts the target address from webhook payload
 *
 * Priority:
 * 1. Direct address field in payload
 * 2. Address from transaction outputs
 *
 * @param payload - Validated BlockCypher webhook payload
 * @returns Bitcoin address or null if not found
 */
export function extractAddress(
  payload: BlockcypherWebhookPayload
): string | null {
  // First, try the direct address field
  if (payload.address) {
    return payload.address as string;
  }

  // If no direct address, try to extract from outputs
  if (payload.outputs && payload.outputs.length > 0) {
    // Look for the first output with addresses
    for (const output of payload.outputs) {
      if (output.addresses && output.addresses.length > 0) {
        return output.addresses[0]; // Return first address
      }
    }
  }

  return null;
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
