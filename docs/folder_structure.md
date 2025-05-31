# Bitcoin Testnet Payment App - Folder Structure

## **📁 Complete Project Structure**

```
bitcoin-payment-app/
├── 📁 src/                           # Source code directory (Next.js 15 best practice)
│   ├── 📁 app/                       # App Router (Next.js 15)
│   │   ├── 📄 layout.tsx             # Root layout with TanStack Query Provider
│   │   ├── 📄 page.tsx               # Home page with payment form
│   │   ├── 📄 loading.tsx            # Global loading component
│   │   ├── 📄 error.tsx              # Global error boundary
│   │   ├── 📄 not-found.tsx          # 404 page
│   │   │
│   │   ├── 📁 api/                   # API Routes
│   │   │   ├── 📁 webhook/           # Webhook endpoints
│   │   │   │   └── 📁 payment-update/
│   │   │   │       └── 📄 route.ts   # Blockcypher webhook handler
│   │   │   ├── 📁 payment-status/    # Payment status endpoints
│   │   │   │   └── 📁 [address]/
│   │   │   │       └── 📄 route.ts   # GET status by address
│   │   │   └── 📁 health/            # Health check endpoint
│   │   │       └── 📄 route.ts
│   │   │
│   │   └── 📄 globals.css            # Global styles
│   │
│   ├── 📁 actions/                   # Server Actions (Next.js 15)
│   │   ├── 📄 payment.ts             # Payment-related server actions
│   │   └── 📄 webhook.ts             # Webhook-related server actions
│   │
│   ├── 📁 components/                # React Components
│   │   ├── 📁 ui/                    # Reusable UI components (shadcn/ui)
│   │   │   ├── 📄 button.tsx
│   │   │   ├── 📄 card.tsx
│   │   │   ├── 📄 form.tsx
│   │   │   ├── 📄 input.tsx
│   │   │   ├── 📄 label.tsx
│   │   │   ├── 📄 toast.tsx
│   │   │   └── 📄 loading-spinner.tsx
│   │   │
│   │   ├── 📁 payment/               # Payment-specific components
│   │   │   ├── 📄 PaymentForm.tsx
│   │   │   ├── 📄 QRCodeDisplay.tsx
│   │   │   ├── 📄 PaymentStatus.tsx
│   │   │   └── 📄 PaymentDetails.tsx
│   │   │
│   │   ├── 📁 layout/                # Layout components
│   │   │   ├── 📄 Header.tsx
│   │   │   ├── 📄 Footer.tsx
│   │   │   └── 📄 ErrorBoundary.tsx
│   │   │
│   │   └── 📁 providers/             # Context providers
│   │       ├── 📄 QueryProvider.tsx  # TanStack Query provider
│   │       └── 📄 ToastProvider.tsx  # Toast notifications provider
│   │
│   ├── 📁 lib/                       # Core utilities and configurations
│   │   ├── 📁 bitcoin/               # Bitcoin-specific utilities
│   │   │   ├── 📄 wallet.ts          # HD wallet generation (server-side only)
│   │   │   ├── 📄 address.ts         # Address validation and formatting
│   │   │   └── 📄 bip21.ts           # BIP21 URI generation
│   │   │
│   │   ├── 📁 api/                   # API clients and utilities
│   │   │   ├── 📄 blockcypher.ts     # Blockcypher API client
│   │   │   └── 📄 client.ts          # Generic HTTP client
│   │   │
│   │   ├── 📁 validation/            # Validation schemas
│   │   │   ├── 📄 payment.ts         # Payment form validation (Zod)
│   │   │   └── 📄 webhook.ts         # Webhook payload validation
│   │   │
│   │   ├── 📁 store/                 # State management
│   │   │   ├── 📄 payment-status.ts  # In-memory payment status store
│   │   │   └── 📄 queries.ts         # TanStack Query configurations
│   │   │
│   │   ├── 📄 utils.ts               # General utility functions
│   │   ├── 📄 constants.ts           # App constants and config
│   │   └── 📄 env.ts                 # Environment variable validation
│   │
│   ├── 📁 hooks/                     # Custom React hooks
│   │   ├── 📄 usePaymentStatus.ts    # Payment status polling hook
│   │   ├── 📄 useClipboard.ts        # Copy to clipboard hook
│   │   └── 📄 useLocalStorage.ts     # Local storage hook (if needed)
│   │
│   └── 📁 types/                     # TypeScript type definitions
│       ├── 📄 payment.ts             # Payment-related types
│       ├── 📄 bitcoin.ts             # Bitcoin-related types
│       ├── 📄 webhook.ts             # Webhook payload types
│       ├── 📄 api.ts                 # API response types
│       └── 📄 global.ts              # Global type definitions
│
├── 📁 public/                        # Static assets
│   ├── 📄 favicon.ico
│   ├── 📁 icons/
│   │   ├── 📄 bitcoin.svg
│   │   └── 📄 copy.svg
│   └── 📁 images/
│       └── 📄 bitcoin-logo.png
│
├── 📁 __tests__/                     # Test files
│   ├── 📁 components/
│   │   ├── 📄 PaymentForm.test.tsx
│   │   └── 📄 QRCodeDisplay.test.tsx
│   ├── 📁 lib/
│   │   ├── 📄 wallet.test.ts
│   │   └── 📄 validation.test.ts
│   ├── 📁 actions/
│   │   └── 📄 payment.test.ts
│   └── 📁 e2e/
│       └── 📄 payment-flow.spec.ts
│
├── 📁 docs/                          # Documentation
│   ├── 📄 API.md
│   ├── 📄 DEPLOYMENT.md
│   └── 📄 SECURITY.md
│
├── 📄 .env.local                     # Environment variables
├── 📄 .env.example                   # Environment template
├── 📄 .gitignore
├── 📄 README.md
├── 📄 package.json
├── 📄 next.config.js                 # Next.js configuration
├── 📄 tailwind.config.js             # Tailwind CSS configuration
├── 📄 tsconfig.json                  # TypeScript configuration
├── 📄 components.json                # shadcn/ui configuration
└── 📄 jest.config.js                 # Jest testing configuration
```

## **🔧 Key Design Principles**

### **1. Separation of Concerns**

- **`src/` Directory**: Following Next.js 15 best practices for clear separation between source code and configuration files
- **Feature-Based Organization**: Components grouped by domain (payment, layout, ui)
- **Server vs Client**: Clear separation between server-side utilities and client components

### **2. Next.js 15 App Router Structure**

- **App Directory**: Uses modern App Router with nested routing capabilities
- **Server Actions**: Dedicated `actions/` folder for server-side functions
- **API Routes**: Organized by functionality with proper nesting

### **3. Security-First Organization**

- **Bitcoin Security**: Wallet utilities isolated in `lib/bitcoin/` (server-side only)
- **Private Key Isolation**: Private keys never leave `wallet.ts` module
- **Validation Layer**: Dedicated validation schemas for all inputs

### **4. Scalable Component Architecture**

- **UI Components**: Reusable shadcn/ui components in `components/ui/`
- **Feature Components**: Payment-specific components in `components/payment/`
- **Layout Components**: Shared layout elements

## **📂 Detailed Folder Explanations**

### **`src/app/` - App Router**

```typescript
// app/layout.tsx - Root layout with providers
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function RootLayout() {
  return (
    <html>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

### **`src/actions/` - Server Actions**

```typescript
// actions/payment.ts - Server Actions for payment
"use server";

import { generateWalletAddress } from "@/lib/bitcoin/wallet";
import { registerWebhook } from "@/lib/api/blockcypher";

export async function createPaymentRequest(formData: FormData) {
  // Server-side payment logic
  const address = await generateWalletAddress();
  const webhookId = await registerWebhook(address);

  return { address, webhookId };
}
```

### **`src/lib/bitcoin/` - Bitcoin Utilities**

```typescript
// lib/bitcoin/wallet.ts - Secure wallet generation
import * as bip39 from "bip39";
import BIP32Factory from "bip32";

export async function generateWalletAddress(): Promise<string> {
  // Private keys NEVER leave this function
  const mnemonic = bip39.generateMnemonic();
  // ... wallet generation logic
  return address; // Only return public address
}
```

### **`src/components/payment/` - Payment Components**

```typescript
// components/payment/PaymentForm.tsx
import { useForm } from "react-hook-form";
import { createPaymentRequest } from "@/actions/payment";

export function PaymentForm() {
  // Form logic with Server Actions
}
```

### **`src/lib/store/` - State Management**

```typescript
// lib/store/payment-status.ts - In-memory store for webhook updates
const paymentStatuses = new Map<string, PaymentStatus>();

export function updatePaymentStatus(address: string, status: PaymentStatus) {
  paymentStatuses.set(address, status);
}
```

## **🚀 Benefits of This Structure**

### **Developer Experience**

- **Clear Navigation**: Easy to find any file based on its purpose
- **Type Safety**: Dedicated types folder with domain-specific definitions
- **Testing**: Organized test structure mirroring source code

### **Security & Maintainability**

- **Bitcoin Security**: Private keys isolated in server-side utilities
- **Validation**: Centralized validation with Zod schemas
- **Error Handling**: Dedicated error boundaries and handling

### **Scalability**

- **Feature Addition**: Easy to add new payment methods or features
- **Team Collaboration**: Clear ownership boundaries for different parts
- **Code Reuse**: Modular components and utilities

### **Next.js 15 Optimization**

- **App Router**: Leverages nested layouts and route groups
- **Server Actions**: Modern server-side logic without API routes
- **Performance**: Proper code splitting and lazy loading structure

## **📝 File Naming Conventions**

- **Components**: PascalCase (`PaymentForm.tsx`)
- **Utilities**: camelCase (`wallet.ts`)
- **Server Actions**: camelCase with descriptive names (`payment.ts`)
- **Types**: Singular nouns (`payment.ts`, not `payments.ts`)
- **API Routes**: RESTful naming (`route.ts` in descriptive folders)

This structure provides a solid foundation that grows with your application while maintaining clean separation of concerns and following Next.js 15 best practices!
