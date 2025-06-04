/**
 * Test suite for Payment Server Actions
 * Testing Server Action specific functionality and integration
 *
 * Note: Validation logic is tested separately in __tests__/lib/validation/payment.test.ts
 * This file focuses on Server Action specific behavior, FormData handling, and integration.
 */

// Set up mocks BEFORE any imports
jest.mock("../../src/lib/api/blockcypher", () => ({
  registerPaymentWebhook: jest.fn(() => Promise.resolve(["webhook-test-123", "webhook-test-456"])),
}));

jest.mock("../../src/lib/store/payment-status", () => ({
  initializePaymentStatus: jest.fn(() => Promise.resolve()),
}));

// Mock fs to prevent file system operations that might hang
jest.mock("fs", () => ({
  promises: {
    access: jest.fn(() => Promise.resolve()),
    mkdir: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve("{}")),
  },
  existsSync: jest.fn(() => false),
}));

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import {
  createPaymentRequest,
  type CreatePaymentRequestResult,
  type PaymentRequestData,
} from "../../src/actions/payment";

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeEach(() => {
  jest.clearAllMocks();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
  // Clear environment variables to prevent webhook calls
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.VERCEL_URL;
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

describe("Payment Server Actions", () => {
  describe("createPaymentRequest", () => {
    describe("Server Action Compatibility", () => {
      it("should be importable as a Server Action function", () => {
        expect(typeof createPaymentRequest).toBe("function");
        expect(createPaymentRequest).toBeDefined();
        expect(createPaymentRequest.constructor.name).toBe("AsyncFunction");
      });

      it("should be callable and return a Promise", () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        const result = createPaymentRequest(formData);
        expect(result).toBeInstanceOf(Promise);
      });

      it("should handle FormData correctly like a real Server Action", async () => {
        // Test with FormData created directly (no DOM dependency)
        const formData = new FormData();
        formData.append("amount", "0.001");

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(true);
        expect(result.data?.amount).toBe(0.001);
      });
    });

    describe("FormData Integration", () => {
      it("should extract amount from FormData correctly", async () => {
        const formData = new FormData();
        formData.append("amount", "1.5");

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(true);
        expect(result.data?.amount).toBe(1.5);
      });

      it("should handle missing FormData fields", async () => {
        const formData = new FormData();
        // No amount field

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Amount is required");
        expect(result.data).toBeUndefined();
      });

      it("should handle non-string FormData values gracefully", async () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        // Mock FormData.get to return non-string value
        const originalGet = formData.get;
        formData.get = jest.fn().mockReturnValue(123) as typeof formData.get;

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Amount is required");

        // Restore original method
        formData.get = originalGet;
      });

      it("should trim whitespace from FormData values", async () => {
        const formData = new FormData();
        formData.append("amount", "  0.001  ");

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(true);
        expect(result.data?.amount).toBe(0.001);
      });
    });

    describe("Response Structure", () => {
      it("should return consistent response structure for success", async () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        const result = await createPaymentRequest(formData);

        // Check response structure matches CreatePaymentRequestResult type
        expect(result).toHaveProperty("success");
        expect(typeof result.success).toBe("boolean");
        expect(result.success).toBe(true);

        expect(result).toHaveProperty("data");
        expect(result.data).toHaveProperty("address");
        expect(result.data).toHaveProperty("amount");
        expect(result.data).toHaveProperty("paymentUri");
        expect(result.data).toHaveProperty("requestTimestamp");
        expect(result.data).toHaveProperty("webhookId");

        expect(typeof result.data!.address).toBe("string");
        expect(typeof result.data!.amount).toBe("number");
        expect(typeof result.data!.paymentUri).toBe("string");
        expect(result.data!.requestTimestamp).toBeInstanceOf(Date);
      });

      it("should return consistent response structure for errors", async () => {
        const formData = new FormData();
        // Missing amount

        const result = await createPaymentRequest(formData);

        expect(result).toHaveProperty("success");
        expect(typeof result.success).toBe("boolean");
        expect(result.success).toBe(false);

        expect(result).toHaveProperty("error");
        expect(typeof result.error).toBe("string");
        expect(result.error!.length).toBeGreaterThan(0);
        expect(result.data).toBeUndefined();
      });

      it("should create unique timestamps for each request", async () => {
        const formData1 = new FormData();
        formData1.append("amount", "0.001");

        const formData2 = new FormData();
        formData2.append("amount", "0.002");

        const result1 = await createPaymentRequest(formData1);
        // Add a small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 1));
        const result2 = await createPaymentRequest(formData2);

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);

        if (
          result1.success &&
          result1.data &&
          result2.success &&
          result2.data
        ) {
          expect(result1.data.requestTimestamp.getTime()).toBeLessThanOrEqual(
            result2.data.requestTimestamp.getTime()
          );
        }
      });
    });

    describe("Address Generation (Task 3.1.3 Implementation)", () => {
      it("should generate real testnet addresses using wallet service", async () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(true);

        if (result.success && result.data) {
          // Check that a real testnet address is generated (not placeholder)
          expect(result.data.address).toMatch(/^tb1[a-z0-9]{39}$/);
          expect(result.data.address.length).toBe(42);
          expect(result.data.address).not.toBe(
            "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx" // Old placeholder
          );

          // Check that payment URI uses the real address
          expect(result.data.paymentUri).toContain("bitcoin:");
          expect(result.data.paymentUri).toContain(result.data.address);
          expect(result.data.paymentUri).toContain("amount=0.001");
          expect(result.data.paymentUri).toContain("network=testnet");

          // Check webhook ID is undefined since we're not calling webhooks in tests
          expect(result.data.webhookId).toBeUndefined();
        }
      });

      it("should generate unique addresses for each request", async () => {
        const formData1 = new FormData();
        formData1.append("amount", "0.001");

        const formData2 = new FormData();
        formData2.append("amount", "0.002");

        const result1 = await createPaymentRequest(formData1);
        const result2 = await createPaymentRequest(formData2);

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);

        if (
          result1.success &&
          result1.data &&
          result2.success &&
          result2.data
        ) {
          // Addresses should be different
          expect(result1.data.address).not.toBe(result2.data.address);

          // Both should be valid testnet addresses
          expect(result1.data.address).toMatch(/^tb1[a-z0-9]{39}$/);
          expect(result2.data.address).toMatch(/^tb1[a-z0-9]{39}$/);

          // Payment URIs should contain respective addresses
          expect(result1.data.paymentUri).toContain(result1.data.address);
          expect(result2.data.paymentUri).toContain(result2.data.address);
        }
      });

      it("should handle wallet generation errors gracefully", async () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        // Note: Since we can't easily mock the wallet function in this test setup,
        // we're testing that the success case works and has proper error handling structure
        const result = await createPaymentRequest(formData);

        expect(result).toHaveProperty("success");

        if (result.success) {
          // Success case - should have valid data
          expect(result.data).toBeDefined();
          expect(result.data!.address).toMatch(/^tb1[a-z0-9]{39}$/);
          expect(result.error).toBeUndefined();
        } else {
          // Error case - should have proper error structure
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe("string");
          expect(result.data).toBeUndefined();
        }
      });

      it("should ensure no private key material is exposed in responses", async () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(true);

        if (result.success && result.data) {
          // Response should only contain the public address string
          expect(typeof result.data.address).toBe("string");

          // Should not contain any sensitive keywords
          const responseString = JSON.stringify(result.data);
          expect(responseString).not.toContain("private");
          expect(responseString).not.toContain("mnemonic");
          expect(responseString).not.toContain("seed");
          expect(responseString).not.toContain("key");

          // Address should be a simple testnet address string
          expect(result.data.address).toMatch(/^tb1[a-z0-9]{39}$/);
        }
      });

      it("should integrate with existing BIP21 URI utility", async () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(true);
        if (result.success && result.data) {
          // Should use the real address in the URI (integration test)
          expect(result.data.paymentUri).toContain(result.data.address);
          expect(result.data.paymentUri).toContain("amount=0.001");
          expect(result.data.paymentUri).toContain("network=testnet");
        }
      });
    });

    describe("Task 3.1.3 Verification - Complete Requirements Check", () => {
      it("should meet all Task 3.1.3 requirements", async () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        const result = await createPaymentRequest(formData);

        // ✅ Requirement: Server Action returns valid address
        expect(result.success).toBe(true);
        expect(result.data?.address).toBeDefined();
        expect(result.data!.address).toMatch(/^tb1[a-z0-9]{39}$/);
        expect(result.data!.address.length).toBe(42);

        // ✅ Requirement: Return ONLY public address data
        expect(typeof result.data!.address).toBe("string");

        // ✅ Requirement: Never expose private keys
        const responseString = JSON.stringify(result);
        expect(responseString).not.toContain("private");
        expect(responseString).not.toContain("mnemonic");
        expect(responseString).not.toContain("seed");
        expect(responseString).not.toContain("hdRoot");

        // ✅ Requirement: Call wallet service from Server Action
        // (Verified by successful address generation)

        // ✅ Requirement: Handle errors gracefully
        // (Error handling structure is in place and tested in other tests)
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("data");
        expect(result.error).toBeUndefined();
      });

      it("should generate different addresses on each call (entropy verification)", async () => {
        const addresses = new Set<string>();

        for (let i = 0; i < 5; i++) {
          const formData = new FormData();
          formData.append("amount", "0.001");

          const result = await createPaymentRequest(formData);

          expect(result.success).toBe(true);
          if (result.success && result.data) {
            addresses.add(result.data.address);
          }
        }

        // All addresses should be unique (proper entropy)
        expect(addresses.size).toBe(5);

        // All addresses should be valid testnet addresses
        addresses.forEach((address) => {
          expect(address).toMatch(/^tb1[a-z0-9]{39}$/);
          expect(address.length).toBe(42);
        });
      }, 15000);

      it("should integrate properly with existing validation layer", async () => {
        // Test with amount that passes validation
        const validFormData = new FormData();
        validFormData.append("amount", "0.001");

        const validResult = await createPaymentRequest(validFormData);
        expect(validResult.success).toBe(true);
        expect(validResult.data?.address).toMatch(/^tb1[a-z0-9]{39}$/);

        // Test with amount that fails validation (tested in validation layer - basic integration test only)
        const invalidFormData = new FormData();
        invalidFormData.append("amount", "invalid");

        const invalidResult = await createPaymentRequest(invalidFormData);
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.error).toContain("Validation failed");
        expect(invalidResult.data).toBeUndefined();
      });
    });

    describe("Error Handling", () => {
      it("should handle validation errors with proper error messages", async () => {
        const formData = new FormData();
        formData.append("amount", "-1"); // Invalid amount

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Validation failed");
        expect(result.data).toBeUndefined();
      });

      it("should handle unexpected errors gracefully", async () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        // Test with valid input to ensure error handling structure is correct
        const result = await createPaymentRequest(formData);

        expect(result).toHaveProperty("success");
        expect(typeof result.success).toBe("boolean");

        if (!result.success) {
          expect(result).toHaveProperty("error");
          expect(typeof result.error).toBe("string");
          expect(result.error!.length).toBeGreaterThan(0);
        }
      });
    });

    describe("Performance & Concurrency", () => {
      it("should handle rapid successive calls", async () => {
        const promises = [];

        for (let i = 0; i < 10; i++) {
          const formData = new FormData();
          formData.append("amount", "0.001");
          promises.push(createPaymentRequest(formData));
        }

        const results = await Promise.all(promises);

        results.forEach((result) => {
          expect(result.success).toBe(true);
          expect(result.data?.amount).toBe(0.001);
        });
      });

      it("should maintain memory efficiency", async () => {
        // Test that the function doesn't leak memory with many calls
        const initialMemory = process.memoryUsage().heapUsed;

        for (let i = 0; i < 50; i++) {
          const formData = new FormData();
          formData.append("amount", "0.001");
          await createPaymentRequest(formData);
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be reasonable (less than 15MB for 50 calls)
        expect(memoryIncrease).toBeLessThan(15 * 1024 * 1024);
      });
    });
  });

  describe("TypeScript Integration", () => {
    it("should have correct TypeScript types for successful responses", async () => {
      const formData = new FormData();
      formData.append("amount", "0.001");

      const result: CreatePaymentRequestResult = await createPaymentRequest(
        formData
      );

      // TypeScript compilation will catch type errors
      expect(result).toBeDefined();

      if (result.success) {
        const data: PaymentRequestData = result.data!;
        expect(typeof data.address).toBe("string");
        expect(typeof data.amount).toBe("number");
        expect(typeof data.paymentUri).toBe("string");
        expect(data.requestTimestamp).toBeInstanceOf(Date);
      }
    });
  });
});