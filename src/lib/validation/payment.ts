import { z } from "zod";
import { isValidTestnetAddress } from "../bitcoin/wallet";

/**
 * Bitcoin Payment Form Validation Schema
 *
 * This schema validates Bitcoin payment requests for testnet payments.
 * Key considerations:
 * - Bitcoin has 8 decimal places maximum (satoshis)
 * - Minimum amount to avoid dust transactions
 * - Maximum amount based on reasonable limits for testnet
 * - Proper decimal validation to prevent floating point issues
 */

// Bitcoin constants
const SATOSHIS_PER_BTC = 100_000_000; // 1 BTC = 100,000,000 satoshis
const MIN_BTC_AMOUNT = 0.00000546; // 546 satoshis (dust limit for P2WPKH)
const MAX_BTC_AMOUNT = 21_000_000; // Total Bitcoin supply
const MAX_DECIMAL_PLACES = 8;

/**
 * Validates BTC amount with proper decimal precision
 */
const btcAmountSchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .refine((val) => {
    // Check if it's a valid number
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num);
  }, "Amount must be a valid number")
  .refine((val) => {
    const num = parseFloat(val);
    return num > 0;
  }, "Amount must be greater than 0")
  .refine((val) => {
    // Check decimal places first, before other validations
    const decimalMatch = val.match(/\.(\d+)$/);
    if (decimalMatch) {
      return decimalMatch[1].length <= MAX_DECIMAL_PLACES;
    }
    return true;
  }, `Amount cannot have more than ${MAX_DECIMAL_PLACES} decimal places`)
  .refine((val) => {
    const num = parseFloat(val);
    return num >= MIN_BTC_AMOUNT;
  }, `Amount must be at least ${MIN_BTC_AMOUNT} BTC (dust limit)`)
  .refine((val) => {
    const num = parseFloat(val);
    return num <= MAX_BTC_AMOUNT;
  }, `Amount cannot exceed ${MAX_BTC_AMOUNT} BTC`)
  .refine((val) => {
    // Ensure the amount can be converted to satoshis without precision loss
    const num = parseFloat(val);
    const satoshis = Math.round(num * SATOSHIS_PER_BTC);
    const backToAmount = satoshis / SATOSHIS_PER_BTC;
    return Math.abs(num - backToAmount) < 1e-8;
  }, "Amount precision exceeds Bitcoin satoshi precision")
  .transform((val) => parseFloat(val));

/**
 * Validates BTC amount as number (for internal use)
 */
const btcAmountNumberSchema = z
  .number()
  .min(
    MIN_BTC_AMOUNT,
    `Amount must be at least ${MIN_BTC_AMOUNT} BTC (dust limit)`
  )
  .max(MAX_BTC_AMOUNT, `Amount cannot exceed ${MAX_BTC_AMOUNT} BTC`)
  .refine((val) => {
    // Ensure the amount can be converted to satoshis without precision loss
    const satoshis = Math.round(val * SATOSHIS_PER_BTC);
    const backToAmount = satoshis / SATOSHIS_PER_BTC;
    return Math.abs(val - backToAmount) < 1e-8;
  }, "Amount precision exceeds Bitcoin satoshi precision");

/**
 * Validates Bitcoin testnet address using the robust wallet validation
 * This uses bitcoinjs-lib for production-ready address validation
 */
const testnetAddressSchema = z
  .string()
  .trim()
  .min(1, "Address is required")
  .refine((val) => {
    return isValidTestnetAddress(val);
  }, "Invalid Bitcoin testnet address format");

/**
 * Payment request form schema
 */
export const paymentRequestSchema = z.object({
  amount: btcAmountSchema,
});

/**
 * Payment verification schema for manual address verification
 */
export const paymentVerificationSchema = z.object({
  address: testnetAddressSchema,
  amount: btcAmountSchema,
});

/**
 * BIP21 URI schema validation
 */
export const bip21UriSchema = z.string().refine((val) => {
  try {
    const url = new URL(val);
    return url.protocol === "bitcoin:" && url.pathname.length > 0;
  } catch {
    return false;
  }
}, "Invalid BIP21 Bitcoin URI format");

/**
 * Webhook payload schema for payment updates
 */
export const webhookPayloadSchema = z.object({
  event: z.string(),
  address: testnetAddressSchema,
  hash: z.string().optional(),
  confirmations: z.number().optional(),
  value: z.number().optional(),
  double_spend: z.boolean().optional(),
});

/**
 * Payment status schema
 */
export const paymentStatusSchema = z.object({
  status: z.enum([
    "AWAITING_PAYMENT",
    "PAYMENT_DETECTED",
    "CONFIRMED",
    "ERROR",
  ]),
  address: testnetAddressSchema,
  amount: btcAmountNumberSchema,
  confirmations: z.number().optional(),
  transactionId: z.string().optional(),
  timestamp: z.date().optional(),
});

// Type exports for use throughout the application
export type PaymentRequest = z.infer<typeof paymentRequestSchema>;
export type PaymentVerification = z.infer<typeof paymentVerificationSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentStatusValue = PaymentStatus["status"];

/**
 * Utility function to convert BTC amount to satoshis
 */
export function btcToSatoshis(btcAmount: number): number {
  return Math.round(btcAmount * SATOSHIS_PER_BTC);
}

/**
 * Utility function to convert satoshis to BTC amount
 */
export function satoshisToBtc(satoshis: number): number {
  return satoshis / SATOSHIS_PER_BTC;
}

/**
 * Utility function to format BTC amount with proper precision
 */
export function formatBtcAmount(amount: number): string {
  return amount.toFixed(8).replace(/\.?0+$/, "");
}

/**
 * Utility function to validate if amount is above dust limit
 */
export function isAboveDustLimit(btcAmount: number): boolean {
  return btcAmount >= MIN_BTC_AMOUNT;
}

/**
 * Utility function to generate a BIP21 payment URI
 */
export function generateBip21Uri(
  address: string,
  amount: number,
  network: "testnet" | "mainnet" = "testnet"
): string {
  const formattedAmount = formatBtcAmount(amount);
  const params = new URLSearchParams({
    amount: formattedAmount,
  });

  if (network === "testnet") {
    params.set("network", "testnet");
  }

  return `bitcoin:${address}?${params.toString()}`;
}
