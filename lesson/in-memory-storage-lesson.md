# Lesson: The In-Memory Storage Problem in Next.js

## The Problem I Encountered

I was building a Bitcoin payment application with Next.js 15 App Router. My payment flow worked like this:

1. User submits payment form → **Server Action** creates payment request
2. Server Action stores payment status in **in-memory Map**
3. User checks payment status → **API Route** queries the in-memory Map
4. **Result: 404 Error** - "Payment status not found"

### The Confusing Part

The logs showed that the payment was being stored successfully:

```
[PAYMENT_STORE] Initialized payment status for address: tb1q8w4n... {
  expectedAmount: 0.1,
  webhookId: undefined,
  status: 'AWAITING_PAYMENT'
}
```

But when I tried to retrieve it immediately after:

```
[PAYMENT_STORE] Payment status not found for address: tb1q8w4n...
GET /api/payment-status/tb1q8w4n... 404 in 695ms
```

**Why was the data disappearing?**

## The Root Cause: Next.js Request Isolation

### What I Thought Was Happening

```javascript
// My mental model (WRONG)
const store = new Map(); // Global shared store

// Server Action
store.set("address123", paymentData); // Store data

// API Route  
store.get("address123"); // Should find the data ✓
```

### What Was Actually Happening

```javascript
// Reality in Next.js
// Process A (Server Action)
const storeA = new Map(); // Fresh Map instance
storeA.set("address123", paymentData); // Stored in Process A memory

// Process B (API Route) - DIFFERENT PROCESS!
const storeB = new Map(); // Different Map instance  
storeB.get("address123"); // Returns null - data not in Process B ❌
```

### The Core Issue

**Next.js isolates requests** for good reasons:
- **Security**: Prevents data leaking between users
- **Scalability**: Enables horizontal scaling across multiple servers
- **Memory Management**: Prevents memory leaks in long-running processes
- **Reliability**: One request's failure doesn't affect others

Each request runs in its own execution context, so in-memory data doesn't persist across different route handlers.

## My Learning Journey

### Initial Debugging Attempts

1. **Checked the logs** - Data was being stored but not found
2. **Added more logging** - Confirmed the store operations were called
3. **Tested individually** - Server Action worked, API Route worked separately
4. **Suspected race conditions** - But the timing wasn't the issue

### The "Aha!" Moment

When I ran individual test files, they passed. When I ran all tests together, they failed. This revealed the **concurrent access problem** - multiple processes trying to access the same in-memory store.

This led me to understand that **Next.js treats each route as isolated**, even within the same application.

## The Solution: File-Based Persistent Storage

### Before: In-Memory (Broken)

```javascript
// Lost between requests
const paymentStatusStore = new Map<string, PaymentStatusData>();

export function initializePaymentStatus(address: string, amount: number) {
  paymentStatusStore.set(address, {
    status: 'AWAITING_PAYMENT',
    amount,
    createdAt: Date.now()
  });
}

export function getPaymentStatus(address: string) {
  return paymentStatusStore.get(address) || null;
}
```

### After: File-Based (Working)

```javascript
// Persists across requests
const STORE_FILE = '.payment-store/payment-statuses.json';

async function loadFromFile(): Promise<Map<string, PaymentStatusData>> {
  if (!existsSync(STORE_FILE)) return new Map();
  const data = await fs.readFile(STORE_FILE, 'utf-8');
  return new Map(Object.entries(JSON.parse(data)));
}

async function saveToFile(store: Map<string, PaymentStatusData>): Promise<void> {
  const data = JSON.stringify(Object.fromEntries(store), null, 2);
  await fs.writeFile(STORE_FILE, data, 'utf-8');
}

export async function initializePaymentStatus(address: string, amount: number) {
  const store = await loadFromFile();
  store.set(address, {
    status: 'AWAITING_PAYMENT',
    amount,
    createdAt: Date.now()
  });
  await saveToFile(store);
}

export async function getPaymentStatus(address: string) {
  const store = await loadFromFile();
  return store.get(address) || null;
}
```

## What I Learned

### 1. Next.js Architecture Principles

- **Stateless by design**: Server components and actions should not rely on persistent memory
- **Request isolation**: Each request is independent for security and scalability
- **Process boundaries**: Different routes may run in different processes

### 2. When to Use Different Storage Approaches

| Storage Type | Use Case | Persistence | Scalability |
|--------------|----------|-------------|-------------|
| **In-Memory** | Request-scoped caching, temporary data | No | Single process |
| **File-Based** | Development, small apps, simple persistence | Yes | Single server |
| **Database** | Production apps, complex queries | Yes | Multi-server |
| **Redis** | Session data, caching, pub/sub | Yes | Multi-server |

### 3. Testing Revealed the Issue

The tests failing when run together but passing individually was the key clue. This taught me:
- **Concurrent execution** exposes race conditions
- **Test isolation** is crucial for reliable tests
- **File system operations** need proper coordination in concurrent environments

### 4. Production Considerations

For production, I learned that file-based storage has limitations:
- **Single server only** - doesn't work with multiple instances
- **File system I/O** - slower than in-memory operations
- **Concurrent access** - needs file locking for high concurrency

Better production solutions:
- **Database** (PostgreSQL, MongoDB) for persistent data
- **Redis** for caching and session data
- **Vercel KV** for serverless environments

## The Fix in Action

### Before: Data Lost Between Requests

```
1. POST / (Server Action)
   └── Store payment in Memory A ✓
   
2. GET /api/payment-status/[address] (API Route)  
   └── Check Memory B ❌ (different memory space)
   
Result: 404 Error
```

### After: Data Persisted Across Requests

```
1. POST / (Server Action)
   └── Store payment in payment-statuses.json ✓
   
2. GET /api/payment-status/[address] (API Route)
   └── Read from payment-statuses.json ✓
   
Result: 200 Success
```

## Key Takeaways

1. **Never assume shared state** in Next.js - each request is isolated
2. **Use appropriate persistence** based on your deployment model
3. **Test concurrent scenarios** to catch isolation issues early
4. **Understand your framework's architecture** before building complex features
5. **File-based storage** is a valid solution for development and simple applications

## What's Stored Now

The file-based store persists this data structure:

```json
{
  "tb1q8w4npdaj7980558z9qm2ceemtvu4p6q5t0cz3q": {
    "address": "tb1q8w4npdaj7980558z9qm2ceemtvu4p6q5t0cz3q",
    "status": "AWAITING_PAYMENT",
    "expectedAmount": 0.1,
    "webhookId": "webhook-12345",
    "createdAt": 1735901234567,
    "lastUpdated": 1735901234567,
    "transactionId": null,
    "confirmations": 0
  }
}
```

This lesson taught me the importance of understanding framework boundaries and choosing the right persistence strategy for each use case.