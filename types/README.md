# Core Type Definitions

This directory contains the core TypeScript type definitions for the Bitcoin Testnet Payment Application.

## Security Note

**IMPORTANT**: These type definitions focus exclusively on public interfaces. No private key types are included in client-facing interfaces. All private key operations remain strictly server-side.

## Type Definitions

### `PaymentRequest`

Represents a payment request created by Server Actions.

- Contains: address, amount, payment URI, timestamp, optional webhook ID
- Used: Server Action responses, client state management

### `WalletData`

Public wallet information for client-side usage.

- Contains: ONLY public address and metadata
- **Does NOT contain**: Private keys, mnemonics, or sensitive data
- Used: Client-side wallet display, address verification

### `PaymentStatus` (Enum)

Payment status enumeration with four states:

- `AWAITING_PAYMENT`: Waiting for payment
- `PAYMENT_DETECTED`: Payment seen in mempool
- `CONFIRMED`: Payment confirmed on blockchain
- `ERROR`: Error occurred

### `PaymentStatusResponse`

API response structure for payment status queries.

- Contains: status, confirmations, transaction ID, error messages
- Used: TanStack Query responses, UI state updates

### `WebhookEvent`

Structure for incoming Blockcypher webhook events.

- Contains: event type, address, transaction hash, confirmations
- Used: Webhook API route processing

### `ServerActionResponse<T>`

Generic response type for Next.js Server Actions.

- Contains: success boolean, optional data, optional error
- Used: All Server Action return types

### Additional Types

- `PaymentFormInput`: Form validation schema
- `WebhookRegistration`: Blockcypher webhook registration response
- `ErrorType`: Application error categorization
- `AppError`: Structured error information

## Usage Examples

```typescript
import { PaymentRequest, PaymentStatus, WebhookEvent } from "@/types";

// Server Action response
const response: ServerActionResponse<PaymentRequest> = {
  success: true,
  data: {
    address: "tb1...",
    amount: 0.001,
    paymentUri: "bitcoin:tb1...?amount=0.001",
    requestTimestamp: Date.now(),
  },
};

// Status update
const status: PaymentStatusResponse = {
  status: PaymentStatus.PAYMENT_DETECTED,
  confirmations: 1,
  transactionId: "abc123...",
};
```

## Testing

The types have been verified to:

- Compile without errors using TypeScript
- Work correctly with imports across modules
- Function properly in function signatures and generic usage

Run type checking with:

```bash
npx tsc --noEmit --skipLibCheck types/index.ts
```
