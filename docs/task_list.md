# Bitcoin Testnet Payment Application - Task Breakdown

## **Phase 1: Project Setup & Foundation**

### 1.1 Initial Setup

- [ ] **Task 1.1.1**: Create Next.js 15 project with App Router

  - Run `npx create-next-app@latest bitcoin-payment-app --typescript --tailwind --app`
  - Verify Next.js 15 is installed and App Router is configured
  - **Test**: App starts successfully with `npm run dev`
  - **Dependencies**: None

- [ ] **Task 1.1.2**: Install core dependencies

  - Install: `bitcoinjs-lib bip32 bip39 qrcode.react @tanstack/react-query zod react-hook-form @hookform/resolvers`
  - **Test**: All packages install without conflicts and TypeScript recognizes imports
  - **Dependencies**: Requires Task 1.1.1

- [ ] **Task 1.1.3**: Install UI dependencies

  - Install shadcn/ui: `npx shadcn-ui@latest init`
  - Add components: `npx shadcn-ui@latest add button card input form label toast`
  - **Test**: shadcn components render correctly in a test page
  - **Dependencies**: Requires Task 1.1.1

- [ ] **Task 1.1.4**: Setup environment variables
  - Create `.env.local` with `BLOCKCYPHER_TOKEN` and `NEXT_PUBLIC_APP_URL`
  - Create `.env.example` template
  - **Test**: Environment variables load correctly via `process.env`
  - **Dependencies**: None

### 1.2 TypeScript Configuration

- [ ] **Task 1.2.1**: Verify TypeScript support for Bitcoin libraries

  - Import bitcoinjs-lib, bip32, bip39 and verify types are available
  - Install any missing @types packages if needed
  - **Test**: TypeScript compilation passes with no type errors for Bitcoin library imports
  - **Dependencies**: Requires Task 1.1.2

- [ ] **Task 1.2.2**: Create core type definitions
  - Define `PaymentRequest`, `WalletData`, `WebhookEvent`, `PaymentStatus` types
  - Focus on public interfaces only (NO private key types in client-facing interfaces)
  - **Test**: Types compile without errors and can be imported across modules
  - **Dependencies**: None

### 1.3 Project Structure

- [ ] **Task 1.3.1**: Create directory structure
  - `app/` (App Router pages)
  - `lib/` (utilities and configurations)
  - `components/` (React components)
  - `actions/` (Server Actions)
  - `types/` (TypeScript definitions)
  - **Test**: Import statements work correctly across directories with test files
  - **Dependencies**: Requires Task 1.1.1

---

## **Phase 2: HD Wallet Implementation (Server-Side Only)**

### 2.1 Core Wallet Functions (Internal Server Functions)

- [ ] **Task 2.1.1**: Create mnemonic generation function

  - Implement `generateMnemonic()` using bip39 (server-side only)
  - Return 12-word mnemonic phrase
  - **Test**: Generates valid 12-word mnemonic every time
  - **Dependencies**: Requires Task 1.2.1
  - **Security Note**: This function will only be used internally in wallet generation

- [ ] **Task 2.1.2**: Create seed generation function

  - Implement `mnemonicToSeed(mnemonic: string)` using bip39 (server-side only)
  - **Test**: Same mnemonic produces same seed consistently
  - **Dependencies**: Requires Task 2.1.1
  - **Security Note**: Seeds never leave the server

- [ ] **Task 2.1.3**: Create HD root key generation

  - Implement `generateHDRoot(seed: Buffer)` using bip32 (server-side only)
  - **Test**: Generates valid BIP32 root key from seed
  - **Dependencies**: Requires Task 2.1.2
  - **Security Note**: Private keys never leave the server

- [ ] **Task 2.1.4**: Create testnet address derivation
  - Implement `deriveTestnetAddress(hdRoot, path)` for `m/84'/1'/0'/0/0`
  - Use native SegWit (P2WPKH) for testnet
  - Return ONLY the public address string
  - **Test**: Generates valid testnet addresses starting with 'tb1'
  - **Dependencies**: Requires Task 2.1.3
  - **Security Note**: Only return public address, never private key

### 2.2 Wallet Service Integration (Server-Side)

- [ ] **Task 2.2.1**: Create wallet service module

  - Combine all wallet functions into `lib/wallet.ts`
  - Export unified `generateWalletAddress()` function that returns ONLY the address
  - **CRITICAL**: Never expose private keys or mnemonics outside this module
  - **Test**: Returns only Bitcoin testnet address string (tb1...)
  - **Dependencies**: Requires all Tasks 2.1.x
  - **Security Note**: Private keys and mnemonics stay internal to this function

- [ ] **Task 2.2.2**: Add wallet address validation
  - Validate generated addresses against testnet format
  - **Test**: All generated addresses are valid testnet addresses
  - **Dependencies**: Requires Task 2.2.1

---

## **Phase 3: Server Actions Implementation**

### 3.1 Payment Request Server Action

- [ ] **Task 3.1.1**: Create payment form validation schema

  - Define Zod schema for BTC amount validation
  - Min/max amount limits, decimal validation
  - **Test**: Schema correctly validates valid and invalid amounts
  - **Dependencies**: Requires Task 1.1.2

- [ ] **Task 3.1.2**: Create basic Server Action structure

  - Create `actions/payment.ts` with `'use server'` directive
  - Implement `createPaymentRequest` function signature
  - **Test**: Server Action can be imported and called from client
  - **Dependencies**: Requires Task 1.3.1

- [ ] **Task 3.1.3**: Implement address generation in Server Action

  - Call wallet service from Server Action
  - Handle errors gracefully
  - Return ONLY public address data
  - **Test**: Server Action returns valid address (never private keys)
  - **Dependencies**: Requires Tasks 2.2.1, 3.1.2
  - **Security Note**: Wallet private keys never leave the wallet service module

- [ ] **Task 3.1.4**: Add BIP21 URI generation
  - Implement `generatePaymentURI(address, amount)` function
  - Format: `bitcoin:address?amount=btc_amount&network=testnet`
  - **Test**: URI format matches BIP21 specification
  - **Dependencies**: Requires Task 3.1.3

### 3.2 Webhook Registration

- [ ] **Task 3.2.1**: Create Blockcypher API client

  - Implement basic HTTP client for Blockcypher API
  - Handle authentication with API token
  - **Test**: Successfully connects to Blockcypher testnet API
  - **Dependencies**: Requires Task 1.1.4

- [ ] **Task 3.2.2**: Implement webhook registration function

  - Register webhook for specific address with Blockcypher
  - Point to `/api/webhook/payment-update` endpoint
  - **Test**: Webhook is registered and returns webhook ID
  - **Dependencies**: Requires Task 3.2.1

- [ ] **Task 3.2.3**: Integrate webhook registration in Server Action
  - Call webhook registration after address generation
  - Handle registration failures gracefully
  - **Test**: Server Action completes with webhook registered or graceful fallback
  - **Dependencies**: Requires Tasks 3.1.3, 3.2.2

---

## **Phase 4: Client-Side Implementation**

### 4.1 TanStack Query Setup

- [ ] **Task 4.1.1**: Configure TanStack Query Provider

  - Setup QueryClient in root layout
  - Configure default options for caching
  - **Test**: Query provider is available throughout app
  - **Dependencies**: Requires Task 1.1.2

- [ ] **Task 4.1.2**: Create payment status query hook
  - Implement `usePaymentStatus(address)` hook for querying our backend
  - Configure for manual triggering (not auto-polling initially)
  - **Test**: Query hook can be called and handles loading states
  - **Dependencies**: Requires Task 4.1.1
  - **Note**: This queries OUR backend status endpoint, not blockchain APIs directly

### 4.2 Payment Form Component

- [ ] **Task 4.2.1**: Create basic form component

  - Setup React Hook Form with Zod validation
  - Create form UI with shadcn components
  - **Test**: Form renders and validates user input
  - **Dependencies**: Requires Tasks 1.1.3, 3.1.1

- [ ] **Task 4.2.2**: Integrate form with Server Action

  - Connect form submission to `createPaymentRequest` Server Action
  - Handle loading states with TanStack Query
  - **Test**: Form submission triggers Server Action
  - **Dependencies**: Requires Tasks 3.1.4, 4.2.1

- [ ] **Task 4.2.3**: Handle Server Action response
  - Process success/error responses from Server Action
  - Update UI based on response
  - Store payment details for status monitoring
  - **Test**: UI updates correctly after form submission
  - **Dependencies**: Requires Task 4.2.2

### 4.3 QR Code Display

- [ ] **Task 4.3.1**: Create QR code component

  - Implement QR code generation using qrcode.react
  - Display payment URI as QR code
  - **Test**: QR code renders correctly with valid URI
  - **Dependencies**: Requires Task 1.1.2

- [ ] **Task 4.3.2**: Add payment details display

  - Show Bitcoin address and amount as text
  - Add copy-to-clipboard functionality
  - **Test**: Users can copy address and amount
  - **Dependencies**: Requires Task 4.3.1

- [ ] **Task 4.3.3**: Add QR code styling and responsiveness
  - Ensure QR code is mobile-friendly
  - Style container with shadcn components
  - **Test**: QR code displays properly on all screen sizes
  - **Dependencies**: Requires Tasks 4.3.2, 1.1.3

---

## **Phase 5: Webhook Implementation (Backend Status Management)**

### 5.1 Webhook API Route

- [ ] **Task 5.1.1**: Create webhook API route structure

  - Create `app/api/webhook/payment-update/route.ts`
  - Implement basic POST handler
  - **Test**: Endpoint responds to POST requests
  - **Dependencies**: Requires Task 1.3.1

- [ ] **Task 5.1.2**: Implement Blockcypher webhook validation

  - Validate webhook payload structure
  - Verify webhook authenticity if token provided
  - **Test**: Only valid Blockcypher payloads are processed
  - **Dependencies**: Requires Task 5.1.1

- [ ] **Task 5.1.3**: Parse transaction data from webhook
  - Extract transaction hash, confirmations, and address
  - Map to internal payment status types
  - **Test**: Webhook data is correctly parsed into internal format
  - **Dependencies**: Requires Tasks 5.1.2, 1.2.2

### 5.2 Payment Status Management (In-Memory Store)

- [ ] **Task 5.2.1**: Create in-memory payment status store

  - Simple Map or object to store payment statuses by address
  - Define status types: "awaiting", "detected", "confirmed"
  - **Test**: Status can be stored and retrieved by address
  - **Dependencies**: Requires Task 1.2.2

- [ ] **Task 5.2.2**: Update status from webhook events

  - Process `unconfirmed-tx` and `confirmed-tx` events
  - Update payment status in memory store
  - **Test**: Status updates correctly based on webhook events
  - **Dependencies**: Requires Tasks 5.1.3, 5.2.1
  - **Note**: This is where webhooks update the backend state

- [ ] **Task 5.2.3**: Create status retrieval endpoint
  - Add GET endpoint at `/api/payment-status/[address]`
  - Return current status for specific payment address
  - **Test**: Status can be queried by client via HTTP GET
  - **Dependencies**: Requires Task 5.2.1
  - **Note**: This is what TanStack Query will poll - our own backend, not external APIs

---

## **Phase 6: Real-time UI Updates (Client Queries Backend)**

### 6.1 Backend Status Monitoring (Client → Our Backend)

- [ ] **Task 6.1.1**: Create backend status polling query

  - Use TanStack Query to poll OUR `/api/payment-status/[address]` endpoint
  - Start with manual refetch, add `refetchInterval` as fallback
  - **Test**: Query successfully fetches status from our backend
  - **Dependencies**: Requires Tasks 4.1.2, 5.2.3
  - **Key Point**: This polls OUR backend that webhooks update, not blockchain APIs

- [ ] **Task 6.1.2**: Implement status-based UI updates

  - Show different states: "Awaiting Payment", "Payment Detected", "Payment Confirmed"
  - Use appropriate loading and success indicators
  - **Test**: UI reflects current payment status from backend
  - **Dependencies**: Requires Task 6.1.1

- [ ] **Task 6.1.3**: Add webhook-triggered refetch mechanism
  - Add way to trigger query refetch when backend status changes
  - Optional: Set up periodic refetch as backup (long interval)
  - **Test**: UI updates promptly when backend status changes
  - **Dependencies**: Requires Task 6.1.1
  - **Note**: Primary update trigger is webhook → backend → client refetch

### 6.2 Status Display Component

- [ ] **Task 6.2.1**: Create payment status component

  - Visual indicators for different payment states
  - Progress indicators and success animations
  - **Test**: Status component shows correct state
  - **Dependencies**: Requires Task 6.1.2

- [ ] **Task 6.2.2**: Add status transition animations
  - Smooth transitions between payment states
  - Loading spinners and success checkmarks
  - **Test**: Animations play correctly during transitions
  - **Dependencies**: Requires Task 6.2.1

---

## **Phase 7: Error Handling & Edge Cases**

### 7.1 Form Validation & Errors

- [ ] **Task 7.1.1**: Add comprehensive form validation

  - Validate BTC amount format and limits
  - Show field-specific error messages
  - **Test**: All validation rules work correctly
  - **Dependencies**: Requires Task 4.2.1

- [ ] **Task 7.1.2**: Handle Server Action errors
  - Catch and display address generation errors
  - Handle webhook registration failures gracefully
  - **Test**: All error scenarios are handled gracefully
  - **Dependencies**: Requires Task 4.2.3

### 7.2 Payment Flow Error Handling

- [ ] **Task 7.2.1**: Handle webhook failures

  - Fallback to periodic polling when webhook registration fails
  - User notification of webhook status
  - **Test**: App continues to work even if webhook fails
  - **Dependencies**: Requires Tasks 6.1.3, 3.2.3
  - **Note**: This is where backup polling becomes more frequent

- [ ] **Task 7.2.2**: Add payment timeout handling
  - Set reasonable timeout for payment detection
  - Allow user to refresh/retry status check
  - **Test**: Timeout scenarios are handled properly
  - **Dependencies**: Requires Task 6.1.2

### 7.3 Network & API Error Handling

- [ ] **Task 7.3.1**: Handle Blockcypher API errors
  - Rate limiting, network failures, invalid responses
  - Appropriate user feedback
  - **Test**: API errors don't break the application
  - **Dependencies**: Requires Task 3.2.1

---

## **Phase 8: UI/UX Enhancements**

### 8.1 Responsive Design

- [ ] **Task 8.1.1**: Make form mobile-responsive

  - Ensure form works well on mobile devices
  - Touch-friendly buttons and inputs
  - **Test**: Form is usable on mobile screens
  - **Dependencies**: Requires Task 4.2.1

- [ ] **Task 8.1.2**: Optimize QR code for mobile
  - Appropriate sizing for mobile scanning
  - Clear display on small screens
  - **Test**: QR code is scannable on mobile devices
  - **Dependencies**: Requires Task 4.3.3

### 8.2 Accessibility

- [ ] **Task 8.2.1**: Add ARIA labels and semantic HTML

  - Proper form labels and descriptions
  - Screen reader compatibility
  - **Test**: App is navigable with screen readers
  - **Dependencies**: Requires Tasks 4.2.1, 6.2.1

- [ ] **Task 8.2.2**: Implement keyboard navigation
  - All interactive elements accessible via keyboard
  - Proper focus management
  - **Test**: Complete app navigation using only keyboard
  - **Dependencies**: Requires Task 8.2.1

### 8.3 Loading States & Feedback

- [ ] **Task 8.3.1**: Add loading states for all async operations

  - Form submission, QR generation, status updates
  - TanStack Query loading indicators
  - **Test**: Users always know when operations are in progress
  - **Dependencies**: Requires Tasks 4.2.2, 6.1.1

- [ ] **Task 8.3.2**: Add success/error toast notifications
  - Feedback for successful operations
  - Clear error messages
  - **Test**: Users receive appropriate feedback for all actions
  - **Dependencies**: Requires Task 1.1.3

---

## **Phase 9: Testing Implementation**

### 9.1 Unit Tests

- [ ] **Task 9.1.1**: Test wallet generation functions

  - Unit tests for address generation (NOT private key exposure)
  - Mock Bitcoin libraries for predictable testing
  - **Test**: Address generation functions work correctly and securely
  - **Dependencies**: Requires Task 2.2.1
  - **Security Focus**: Verify private keys are never exposed

- [ ] **Task 9.1.2**: Test Server Actions

  - Mock external API calls (Blockcypher)
  - Test success and error scenarios
  - Verify no sensitive data in responses
  - **Test**: Server Actions handle all cases correctly and securely
  - **Dependencies**: Requires Task 3.2.3

- [ ] **Task 9.1.3**: Test React components
  - Component rendering and user interactions
  - Form validation and submission
  - **Test**: All components work as expected
  - **Dependencies**: Requires Task 4.3.3

### 9.2 Integration Tests

- [ ] **Task 9.2.1**: Test payment flow end-to-end

  - Form submission through QR display
  - Mock webhook events and backend updates
  - **Test**: Complete payment flow works with mocked external services
  - **Dependencies**: Requires Tasks 6.2.2, 5.2.2

- [ ] **Task 9.2.2**: Test webhook API route
  - Mock Blockcypher webhook payloads
  - Verify status updates in memory store
  - **Test**: Webhook processing works correctly
  - **Dependencies**: Requires Task 5.2.2

---

## **Phase 10: Documentation & Deployment Prep**

### 10.1 README Documentation

- [ ] **Task 10.1.1**: Write comprehensive README

  - Project overview and features
  - Technology stack explanation (emphasize webhook-first approach)
  - **Test**: README clearly explains the project
  - **Dependencies**: None

- [ ] **Task 10.1.2**: Document setup instructions

  - Environment variable configuration
  - Blockcypher account setup for webhook endpoints
  - **Test**: Setup instructions are clear and complete
  - **Dependencies**: Requires Task 10.1.1

- [ ] **Task 10.1.3**: Add usage and testing instructions
  - How to use the application
  - How to run tests
  - **Test**: Instructions are accurate and complete
  - **Dependencies**: Requires Tasks 10.1.2, 9.2.1

### 10.2 Code Quality

- [ ] **Task 10.2.1**: Add comprehensive code comments

  - Document complex Bitcoin operations
  - Explain Server Action patterns and webhook flow
  - **Test**: Code is well-documented and understandable
  - **Dependencies**: None

- [ ] **Task 10.2.2**: Refactor for code organization
  - Ensure clean separation of concerns
  - Consistent naming conventions
  - Verify no private key exposure anywhere
  - **Test**: Code is maintainable, extensible, and secure
  - **Dependencies**: Requires all previous phases

### 10.3 Performance Optimization

- [ ] **Task 10.3.1**: Optimize TanStack Query caching

  - Appropriate cache times for status queries
  - Efficient query invalidation after webhook events
  - **Test**: App performs well with proper caching
  - **Dependencies**: Requires Task 6.1.3

- [ ] **Task 10.3.2**: Optimize bundle size
  - Code splitting for Bitcoin libraries (server-side only)
  - Remove unused dependencies
  - **Test**: App loads quickly in production
  - **Dependencies**: Requires Task 10.2.2

---

## **Phase 11: Final Testing & Polish**

### 11.1 Cross-browser Testing

- [ ] **Task 11.1.1**: Test in major browsers
  - Chrome, Firefox, Safari, Edge
  - Mobile browsers
  - **Test**: App works consistently across browsers
  - **Dependencies**: Requires all previous phases

### 11.2 End-to-End Testing

- [ ] **Task 11.2.1**: Test complete payment flow with real testnet
  - Generate payment request
  - Send actual testnet transaction
  - Verify webhook reception and UI updates
  - **Test**: Real payment detection works end-to-end
  - **Dependencies**: Requires all previous phases

### 11.3 Security Review

- [ ] **Task 11.3.1**: Review Server Action security
  - Input validation and sanitization
  - Verify no private key exposure in any responses
  - Rate limiting considerations
  - **Test**: No obvious security vulnerabilities, especially around private key handling
  - **Dependencies**: Requires all previous phases

---

## **Critical Architecture Flow:**

1. **Client** submits payment form → **Server Action** generates address (private key stays server-side)
2. **Server Action** registers webhook with Blockcypher → Returns payment details to client
3. **Client** displays QR code and starts monitoring our backend status
4. **User** sends Bitcoin → **Blockcypher** detects transaction → **Webhook** updates our backend store
5. **Client** queries our backend status → UI updates with payment confirmation

## **Key Technologies Used:**

- **Next.js 15**: App Router, Server Actions (stable), React 19 support
- **Server Actions**: `'use server'` directive for secure server-side operations
- **TanStack Query**: Polling OUR backend status endpoint (not external APIs)
- **Blockcypher API**: Webhook notifications to update our backend
- **bitcoinjs-lib**: HD wallet generation (server-side only, private keys never exposed)
- **shadcn/ui**: Modern UI components

## **Security Principles:**

- Private keys NEVER leave server-side wallet generation functions
- Client only receives public addresses and payment URIs
- Webhook updates internal backend state, client polls internal state
- All external API calls happen server-side only

## **Success Criteria for Each Task:**

- Each task has a clear, testable outcome focused on a single concern
- Tasks build logically with explicit dependencies noted
- Security is paramount - no private key exposure anywhere
- Webhook-first approach with polling as complement, not replacement
- Progress is measurable and verifiable for the engineering LLM
