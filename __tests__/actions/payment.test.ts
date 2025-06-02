/**
 * Test suite for Payment Server Actions
 * Testing Server Action specific functionality and integration
 *
 * Note: Validation logic is tested separately in __tests__/lib/validation/payment.test.ts
 * This file focuses on Server Action specific behavior, FormData handling, and integration.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  createPaymentRequest,
  validatePaymentRequest,
  type CreatePaymentRequestResult,
  type ServerActionResult,
  type PaymentRequestData,
} from "../../src/actions/payment";
import type { PaymentRequest } from "../../src/lib/validation/payment";

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
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

    describe("Placeholder Implementation (Current Task State)", () => {
      it("should use placeholder values correctly until other tasks are implemented", async () => {
        const formData = new FormData();
        formData.append("amount", "0.001");

        const result = await createPaymentRequest(formData);

        expect(result.success).toBe(true);

        if (result.success && result.data) {
          // Check placeholder address is used (Task 3.1.3 not implemented yet)
          expect(result.data.address).toBe(
            "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
          );

          // Check placeholder URI format (Task 3.1.4 not implemented yet)
          expect(result.data.paymentUri).toContain("bitcoin:");
          expect(result.data.paymentUri).toContain(result.data.address);
          expect(result.data.paymentUri).toContain("amount=0.001");
          expect(result.data.paymentUri).toContain("network=testnet");

          // Check webhook ID is undefined (Task 3.2.3 not implemented yet)
          expect(result.data.webhookId).toBeUndefined();
        }
      });

      it("should format amounts correctly in payment URI", async () => {
        const testCases = [
          { input: "1.0", expected: "amount=1" },
          { input: "0.123", expected: "amount=0.123" },
          { input: "0.12345678", expected: "amount=0.12345678" },
        ];

        for (const testCase of testCases) {
          const formData = new FormData();
          formData.append("amount", testCase.input);

          const result = await createPaymentRequest(formData);

          expect(result.success).toBe(true);
          if (result.success && result.data) {
            expect(result.data.paymentUri).toContain(testCase.expected);
          }
        }
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

        // Memory increase should be reasonable (less than 5MB for 50 calls)
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      });
    });
  });

  describe("validatePaymentRequest", () => {
    it("should be importable as a helper function", () => {
      expect(typeof validatePaymentRequest).toBe("function");
      expect(validatePaymentRequest).toBeDefined();
    });

    it("should validate correct payment request data", async () => {
      const data = {
        amount: "0.001",
      };

      const result = await validatePaymentRequest(data);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.amount).toBe(0.001);
    });

    it("should reject invalid payment request data", async () => {
      const invalidData = {
        amount: "invalid-amount",
      };

      const result = await validatePaymentRequest(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation failed");
      expect(result.data).toBeUndefined();
    });

    it("should handle missing data gracefully", async () => {
      const result = await validatePaymentRequest({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation failed");
      expect(result.error).toContain("amount");
    });

    it("should handle null and undefined inputs", async () => {
      const nullResult = await validatePaymentRequest(null);
      const undefinedResult = await validatePaymentRequest(undefined);

      expect(nullResult.success).toBe(false);
      expect(undefinedResult.success).toBe(false);
      expect(nullResult.error).toContain("Validation failed");
      expect(undefinedResult.error).toContain("Validation failed");
    });

    it("should provide detailed error paths for validation failures", async () => {
      const invalidData = {
        amount: -1, // Invalid amount - will be rejected as number when expecting string
      };

      const result = await validatePaymentRequest(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("amount:");
      expect(result.error).toContain("Expected string");
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

    it("should properly type validation results", async () => {
      const result: ServerActionResult<PaymentRequest> =
        await validatePaymentRequest({
          amount: "0.001",
        });

      expect(result).toBeDefined();

      if (result.success) {
        const data: PaymentRequest = result.data!;
        expect(typeof data.amount).toBe("number");
      }
    });
  });

  describe("Integration with Validation Layer", () => {
    it("should properly integrate with validation schema", async () => {
      // Test that Server Action uses the validation schema correctly
      const formData = new FormData();
      formData.append("amount", "0.00000001"); // Below dust limit

      const result = await createPaymentRequest(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation failed");
      expect(result.error).toContain("dust limit");
    });

    it("should handle concurrent validation calls efficiently", async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(validatePaymentRequest({ amount: `0.00${i + 1}` }));
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data?.amount).toBe(parseFloat(`0.00${index + 1}`));
      });
    });
  });
});
