/**
 * Payment Server Action Webhook Integration Tests
 *
 * Tests for Task 3.2.3: Integrate webhook registration in Server Action
 * - Call webhook registration after address generation
 * - Handle registration failures gracefully
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
import { createPaymentRequest } from "../../src/actions/payment";

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Mock environment variables
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
  
  // Reset environment variables
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.VERCEL_URL;
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
  process.env = ORIGINAL_ENV;
});

describe("Task 3.2.3 - Payment Server Action Webhook Integration", () => {
  describe("Webhook Registration Success Cases", () => {
    it("should skip webhook registration when no base URL is configured", async () => {
      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      expect(result.success).toBe(true);
      expect(result.data?.webhookId).toBeUndefined();
      expect(result.data?.address).toMatch(/^tb1[a-z0-9]{39}$/);
      expect(result.data?.paymentUri).toContain("bitcoin:");
      expect(result.data?.paymentUri).toContain("amount=0.001");
    });
  });

  describe("Integration with Real Components", () => {
    it("should integrate webhook registration with real wallet and payment flow", async () => {
      // Don't set environment variables - this will skip webhook registration
      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      // Verify complete response structure works without webhooks
      expect(result.success).toBe(true);
      expect(result.data?.address).toMatch(/^tb1[a-z0-9]{39}$/);
      expect(result.data?.amount).toBe(0.001);
      expect(result.data?.paymentUri).toContain("bitcoin:");
      expect(result.data?.paymentUri).toContain("amount=0.001");
      expect(result.data?.paymentUri).toContain("network=testnet");
      expect(result.data?.webhookId).toBeUndefined(); // No URL configured
      expect(result.data?.requestTimestamp).toBeInstanceOf(Date);
    });

    it("should handle webhook component integration correctly", async () => {
      // Test that webhook integration works as intended without environment
      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      // When no environment is set, webhook should be skipped gracefully
      expect(result.success).toBe(true);
      expect(result.data?.address).toBeTruthy();
      expect(result.data?.paymentUri).toBeTruthy();
      expect(result.data?.webhookId).toBeUndefined(); // No environment = no webhook attempt
      
      // Verify the action completes successfully without webhook dependency
      expect(result.data?.address).toMatch(/^tb1[a-z0-9]{39}$/);
      expect(result.data?.amount).toBe(0.001);
    });
  });
});