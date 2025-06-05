// Core type definitions for Bitcoin Testnet Payment Application
// Note: No private key types are included - all private key operations stay server-side

/**
 * Payment request data structure
 * Used when creating a new payment request via Server Actions
 */
export interface PaymentRequest {
  /** Bitcoin testnet address (tb1...) */
  address: string;
  /** Payment amount in BTC */
  amount: number;
  /** BIP21 payment URI for QR code generation */
  paymentUri: string;
  /** Timestamp when the payment request was created */
  requestTimestamp: number;
  /** Optional webhook ID from Blockcypher registration */
  webhookId?: string;
}

/**
 * Wallet data structure for client-side usage
 * Contains ONLY public information - no private keys or mnemonics
 */
export interface WalletData {
  /** Bitcoin testnet address */
  address: string;
  /** BIP32 derivation path used */
  derivationPath: string;
  /** Network type */
  network: "testnet";
  /** Timestamp when wallet address was generated */
  createdAt: number;
}

/**
 * Payment status enumeration
 */
export enum PaymentStatus {
  /** Waiting for payment to be sent */
  AWAITING_PAYMENT = "AWAITING_PAYMENT",
  /** Payment detected in mempool (0 confirmations) */
  PAYMENT_DETECTED = "PAYMENT_DETECTED",
  /** Payment confirmed on blockchain */
  CONFIRMED = "CONFIRMED",
  /** Error occurred during payment processing */
  ERROR = "ERROR",
}

/**
 * Payment status response from backend API
 */
export interface PaymentStatusResponse {
  /** Current payment status */
  status: PaymentStatus;
  /** Number of confirmations (if payment detected) */
  confirmations?: number;
  /** Transaction ID/hash (if payment detected) */
  transactionId?: string;
  /** Error message (if status is ERROR) */
  errorMessage?: string;
  /** Last updated timestamp */
  lastUpdated?: number;
}

/**
 * Server Action response structure
 * Generic response type for Server Actions
 */
export interface ServerActionResponse<T = unknown> {
  /** Whether the action was successful */
  success: boolean;
  /** Response data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Payment form input validation schema type
 */
export interface PaymentFormInput {
  /** BTC amount as string (for form validation) */
  amount: string;
}

/**
 * Blockcypher webhook registration response
 */
export interface WebhookRegistration {
  /** Webhook ID from Blockcypher */
  id: string;
  /** Event type */
  event: string;
  /** Target address */
  address: string;
  /** Webhook URL */
  url: string;
  /** Confirmation count for events */
  confirmations: number;
}

/**
 * Error types for better error handling
 */
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  WALLET_GENERATION_ERROR = "WALLET_GENERATION_ERROR",
  WEBHOOK_REGISTRATION_ERROR = "WEBHOOK_REGISTRATION_ERROR",
  PAYMENT_PROCESSING_ERROR = "PAYMENT_PROCESSING_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

/**
 * Application error structure
 */
export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: number;
}
