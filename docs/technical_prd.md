## Technical Product Requirements Document (PRD)

**Project:** Bitcoin Testnet Payment Application

**Version:** Final (Webhook & Server Actions Edition)
**Date:** May 31, 2025

---

### 1. Executive Summary

#### 1.1 Project Overview

This document outlines the technical requirements for a simple Next.JS application designed to allow users to generate a testnet Bitcoin payment request, display a QR code for this payment, and subsequently check the payment status. The core objective is to build a high-quality, production-ready solution that demonstrates best practices in modern web development. Key features include on-demand HD wallet generation, user input for BTC payment amounts, QR code display for the generated payment request, and status polling to confirm payment receipt. The application will prioritize a clean, modular codebase, robust error handling, and a clear, responsive user interface. This PRD details the plan for efficient payment status updates, potentially using webhooks (with client polling its own backend) or direct polling as per the initial requirement, leveraging Next.js Server Actions and TanStack Query for state management.

#### 1.2 Key Objectives

- Develop a fully functional application meeting all specified requirements[cite: 1].
- Implement robust error handling and manage edge cases effectively[cite: 7].
- Deliver a clean, modular, and extensible codebase[cite: 8].
- Create a clear, responsive, and easy-to-use UI.
- Provide a comprehensive README file for setup and usage[cite: 9].
- Utilize webhooks for efficient payment status updates, with the client polling its own backend for the latest status.

#### 1.3 Success Criteria

- **Functionality:** Application operates flawlessly: generating payment requests via Server Actions[cite: 4], displaying QR codes, registering webhooks, and accurately receiving/displaying payment status (backend updated by webhook, client polls backend)[cite: 5].
- **Code Quality:** Code is clean, well-commented, modular (as per the agreed folder structure), and uses TypeScript. Server Actions are used appropriately from `src/actions/`.
- **User Experience:** UI is intuitive, responsive, and provides clear feedback. TanStack Query effectively manages client-side cache of server state.
- **Error Handling:** All foreseeable error conditions and edge cases are gracefully handled[cite: 7].
- **README:** The `README.md` is comprehensive, detailing setup (including environment variables like `BLOCKCYPHER_TOKEN` and `NEXT_PUBLIC_APP_URL`, and Blockcypher webhook configuration).
- **Security:** Strong emphasis on security, especially ensuring no private keys ever leave designated server-side modules (e.g., `src/lib/bitcoin/wallet.ts`).

---

### 2. Technical Architecture

#### 2.1 System Architecture

The application leverages Next.js Server Actions (from `src/actions/`) for creating payment requests and registering webhooks with Blockcypher. A Next.js API Route (in `src/app/api/webhook/payment-update/`) serves as the webhook endpoint. Blockcypher sends payment notifications to this endpoint, which updates an in-memory store on the server. The client uses TanStack Query to poll another API Route (`src/app/api/payment-status/[address]/`) that serves the latest status from this in-memory store.

```
┌─────────────────┐     ┌───────────────────────┐     ┌───────────────────┐
│                 │     │ src/actions/payment.ts│     │src/lib/bitcoin/   │
│  Next.js Client ├────►│ (Server Action)       ├────►│ wallet.ts         │
│  (React + UI    │     │ Create Payment Req    │     │ (No Private Key   │
│  + TanStack Q.) │     │ Register Webhook      │     │ Exposure)         │
└--------┬--------┘     └──────────┬──────────┘       └───────────────────┘
         │ (Display QR,             │ (Calls Blockcypher to register webhook)
         │  Polls Own Backend)      │
         ▼                         ▼
┌─────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ src/app/api/    │     │ src/app/api/      │     │                   │
│ payment-status/ ├◄───┤ webhook/          │◄────┤ Blockcypher API   │
│ [address]/route.ts│     │ payment-update/   │     │ (Testnet Webhook) │
│ (Serves Status  │     │ route.ts          │     │                   │
│ from In-Mem Store)│     │ (Updates In-Mem Store)│     └───────────────────┘
└─────────────────┘     └───────────────────┘
```

#### 2.2 Component Architecture

- **Frontend Components:** React components (TypeScript) in `src/components/`, styled with Tailwind CSS, using `shadcn/ui`. Client state managed by local component state and **TanStack Query**.
- **Server Actions (`src/actions/`):** Handle payment request form submissions, interact with the HD Wallet service, and register webhooks.
- **API Layer (Webhook Receiver):** A dedicated Next.js API Route (`src/app/api/webhook/payment-update/route.ts`) to receive and process incoming webhook events from Blockcypher.
- **API Layer (Status Provider):** A Next.js API Route (`src/app/api/payment-status/[address]/route.ts`) for the client to fetch the latest payment status from the server's in-memory store.
- **HD Wallet Service (`src/lib/bitcoin/wallet.ts`):** Logic for Hierarchical Deterministic wallet generation (private keys strictly server-side).
- **Payment Notification Service (within webhook route):** Validates Blockcypher notifications and updates the server-side in-memory payment status store (`src/lib/store/paymentStore.ts`).
- **QR Code Generator:** Client-side generation via `qrcode.react`.

#### 2.3 Data Flow

1.  **User Input:** User enters BTC amount into `PaymentForm.tsx`.
2.  **Server Action:** Form submission calls `createPaymentRequest` Server Action in `src/actions/payment.ts`.
3.  **Address & Webhook Reg:** Action generates a new testnet address (private key never leaves `wallet.ts`), then calls `src/lib/blockcypher.ts` to register a webhook with Blockcypher for this address, pointing to `/api/webhook/payment-update`.
4.  **Response to Client:** Action returns payment details (address, amount, URI) to the client.
5.  **QR Display & Polling:** Client displays QR code. TanStack Query starts polling `/api/payment-status/[address]` for status updates.
6.  **Payment & Webhook Event:** User makes payment. Blockcypher detects it and sends an event to `/api/webhook/payment-update`.
7.  **Webhook Processing & Store Update:** The webhook API route validates the event and updates the status for the address in the server-side in-memory store (`src/lib/store/paymentStore.ts`).
8.  **Client UI Update:** The next poll by TanStack Query to `/api/payment-status/[address]` retrieves the updated status, and the UI reflects the change (e.g., "Payment Detected," "Confirmed").

---

### 3. Core Features & Requirements

#### 3.1 HD Wallet Generation

- **Requirement:** Generate a new HD wallet ephemerally[cite: 2].
- **Technical Details:** Server-side only via `src/lib/bitcoin/wallet.ts` using `bitcoinjs-lib`, `bip32`, `bip39`. BIP84 path (`m/84'/1'/0'/0/0`) for testnet native SegWit. **No private keys or mnemonics ever exposed from this module.**

#### 3.2 Payment Request Form

- **Requirement:** Display a form for BTC amount[cite: 3].
- **Implementation:** UI in `src/components/payment/PaymentForm.tsx`, submission handled by a Server Action in `src/actions/payment.ts`.
- **Input Validation:** Client-side (React Hook Form + Zod in `src/lib/validation/payment.ts`) & Server-side (within Server Action).

#### 3.3 QR Code Generation

- **Requirement:** Display QR code for payment request[cite: 4].
- **Format:** BIP21 URI.
- **Features:** Client-side generation in `src/components/payment/QrCodeDisplay.tsx`, text display of address/amount, copy-to-clipboard.

#### 3.4 Payment Status Monitoring

- **Requirement:** Update user when payment is received, using an efficient mechanism[cite: 5].
- **Strategy:**
  - Server Action registers a webhook with Blockcypher.
  - `/api/webhook/payment-update/route.ts` receives notifications and updates an in-memory store (`src/lib/store/paymentStore.ts`).
  - Client uses TanStack Query to poll `/api/payment-status/[address]/route.ts` for the latest status from this store. A webhook-triggered client refetch mechanism for TanStack Query will be implemented for near real-time updates.
- **Status States:** "Awaiting Payment," "Payment Detected," "Payment Confirmed," "Error."

---

### 4. UI/UX Requirements

- **Responsive Design:** Mobile-first, polished on all devices.
- **Clarity & Simplicity:** Intuitive flow.
- **Feedback:** Clear loading states (via TanStack Query: `isLoading`, `isPending`), success/error messages (e.g., `shadcn/ui Toasts`).
- **Accessibility:** Adherence to WCAG 2.1 AA basics.
- **Performance:** Fast initial load, good Core Web Vitals.

---

### 5. Technology Stack

- **Core:** Next.js (latest stable, App Router with **Server Actions** from `src/actions/`), React, TypeScript.
- **Styling:** Tailwind CSS. `shadcn/ui` components from `src/components/ui/`.
- **State Management (Client):** **TanStack Query** (`@tanstack/react-query`) for server state, caching, and polling backend status.
- **Form Handling:** React Hook Form with Zod (schemas in `src/lib/validation/`).
- **Bitcoin Libraries:** `bitcoinjs-lib`, `bip32`, `bip39` (used server-side in `src/lib/bitcoin/`).
- **QR Code:** `qrcode.react`.
- **Blockchain API & Webhooks:** **Blockcypher API** (webhook registration via `src/lib/blockcypher.ts`, webhook events received by `src/app/api/webhook/payment-update/route.ts`).

---

### 6. Server Actions & API Design

#### Server Actions (`src/actions/payment.ts`)

- **`createPaymentRequest(formData: FormData)`:**
  - Validates input. Generates address via `src/lib/bitcoin/wallet.ts`. Constructs payment URI.
  - Registers webhook via `src/lib/blockcypher.ts`.
  - Returns `{ success: boolean, data?: { address, amount, paymentUri, requestTimestamp, webhookId? }, error?: string }`.

#### API Routes (`src/app/api/`)

- **`POST /api/webhook/payment-update`** (`src/app/api/webhook/payment-update/route.ts`):
  - Receives events from Blockcypher. Validates. Parses.
  - Updates status in server-side in-memory store (`src/lib/store/paymentStore.ts`).
  - Returns `200 OK` to Blockcypher.
- **`GET /api/payment-status/[address]`** (`src/app/api/payment-status/[address]/route.ts`):
  - Client polls this endpoint.
  - Retrieves current status for the given `address` from the in-memory store.
  - Returns status object: `{ status: 'AWAITING_PAYMENT' | 'PAYMENT_DETECTED' | 'CONFIRMED' | 'ERROR', confirmations?: number, transactionId?: string }`.

---

### 7. Security Considerations

- **HD Wallet:** Private keys/mnemonics strictly confined to server-side `src/lib/bitcoin/wallet.ts` and never exposed.
- **Server Actions & API Routes:** Validate all inputs. Protect webhook endpoint (e.g., Blockcypher token verification). Basic rate limiting if deploying publicly.
- **Environment Variables:** Securely manage `BLOCKCYPHER_TOKEN` and other sensitive variables.
- **Frontend:** HTTPS.

---

### 8. Testing Strategy

- **Unit Tests (Jest/Vitest + RTL):** Components, utility functions (`src/lib/utils.ts`), secure wallet address generation (`src/lib/bitcoin/wallet.ts` ensuring no key leakage).
- **Server Action Tests:** Test logic within `src/actions/payment.ts`, mocking Blockcypher calls.
- **API Route Tests:** Test webhook handler and status endpoint, mocking Blockcypher payloads and in-memory store interactions.
- **Integration Tests:** Form submission to QR display. Client-side reaction to status updates (mocking backend status changes).
- **E2E Tests (Playwright/Cypress - Optional):** Full user flow.

---

### 9. Error Handling & Edge Cases

- **Form Validation:** Clear messages for client and server-side validation failures.
- **Server Action Errors:** Display user-friendly errors from Server Actions.
- **Webhook Issues:** Handle Blockcypher webhook registration failures. Implement robust parsing and error handling in the webhook receiver. Fallback to more frequent client polling of `/api/payment-status/[address]` if webhook registration fails.
- **Payment Timeouts:** After a reasonable duration, inform the user if no payment is detected.
- **API Errors:** Gracefully handle errors from Blockcypher API calls.

---

### 10. Documentation (README.md)

Must include:

- Project Overview, Features, Tech Stack (highlighting Server Actions, Webhooks, TanStack Query).
- Prerequisites.
- **Detailed Setup:** Cloning, installation, **Environment Variable Configuration** (`BLOCKCYPHER_TOKEN`, `NEXT_PUBLIC_APP_URL`), any Blockcypher account/API token notes, local webhook testing (e.g., ngrok).
- Usage, Project Structure Overview, Testing Instructions.
- Architectural decisions (e.g., webhook-first with backend polling).

---

### 11. Future Enhancements (Briefly Noted)

- More robust client notification system than simple polling (e.g., light client-side event listening if server could push).
- User option to manually refresh/recheck payment status.
