# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Create production build
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint checks
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Run specific test
npm test -- path/to/test.test.ts
npm test -- --testNamePattern="test name"
```

## Architecture Overview

This is a Next.js 15 Bitcoin payment application using the App Router with a security-first architecture.

### Key Architectural Principles

1. **Server-Side Security**: All Bitcoin wallet operations (private key generation, HD wallet derivation) happen exclusively in Server Actions. Private keys never leave the server or get exposed to the client.

2. **Payment Flow**:
   - Client submits payment request via `PaymentForm` component
   - Server Action `createPaymentRequest` generates new HD wallet address
   - BlockCypher webhook registered for payment monitoring
   - Client displays QR code with BIP21 payment URI
   - Webhook endpoint processes incoming transaction notifications

3. **Component Structure**:
   - `/components/ui/`: shadcn/ui based reusable components
   - `/components/payment/`: Payment-specific components (PaymentForm, QrCodeDisplay)
   - Server Actions in `/actions/`: Secure server-side operations
   - API Routes in `/app/api/`: Webhook handlers and status endpoints

### Critical Implementation Details

1. **HD Wallet Generation** (`/lib/bitcoin/wallet.ts`):
   - Uses BIP39 for mnemonic generation
   - BIP32 for HD wallet derivation
   - BIP84 path for Native SegWit addresses (testnet)
   - New address generated for each payment request

2. **BlockCypher Integration** (`/lib/api/blockcypher.ts`):
   - Requires `BLOCKCYPHER_TOKEN` environment variable
   - Automatic retry logic with exponential backoff
   - Webhook URL must be HTTPS in production
   - Rate limiting: 3 req/sec, 200 req/hour

3. **Webhook Processing**:
   - Endpoint: `/api/webhook/payment-update`
   - Validates BlockCypher payload structure
   - Parses transaction data and confirmation status
   - Updates payment status (placeholder for store implementation)

4. **Type Safety**:
   - Zod schemas for all external data validation
   - TypeScript strict mode enabled
   - Comprehensive type definitions in `/types/`

### Environment Requirements

```bash
# Required
BLOCKCYPHER_TOKEN=your_token_here

# Optional (auto-detected on Vercel)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Testing Approach

- Unit tests for all critical modules (wallet, validation, API clients)
- Mock external dependencies (BlockCypher API)
- Test files co-located in `__tests__/` directories
- Focus on security-critical paths and data validation
- No need to write test for Frontend

### Development Notes

1. **WebAssembly Support**: The app uses tiny-secp256k1 which requires WebAssembly. This is configured in next.config.ts.

2. **Validation Limits**:
   - Bitcoin amounts: 0.00000546 - 21,000,000 BTC (max 8 decimals)
   - Testnet addresses: tb1 (native SegWit), 2, m, n prefixes only

3. **Server Action Pattern**: Actions use a wrapper pattern for useActionState compatibility:
   ```typescript
   async function actionName(prevState: Result | null, formData: FormData): Promise<Result>
   ```

4. **Missing Implementation**: Payment status store (Phase 5.2) is not yet implemented. Webhook handler has TODO comments for store updates.

5. **BlockCypher Client**: Has built-in retry logic with exponential backoff - don't add additional retry wrappers.

6. **Type Pattern**: Zod schemas define validation, TypeScript types derived using `z.infer<typeof schema>`