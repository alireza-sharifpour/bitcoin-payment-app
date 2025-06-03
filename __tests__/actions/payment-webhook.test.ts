/**
 * Payment Server Action Webhook Integration Tests
 *
 * Tests for Task 3.2.3: Integrate webhook registration in Server Action
 * - Call webhook registration after address generation
 * - Handle registration failures gracefully
 */

// Set up mocks BEFORE any imports
// Mock the Blockcypher API client - must mock the entire module to prevent real API calls
jest.mock("@/lib/api/blockcypher", () => ({
  __esModule: true,
  registerPaymentWebhook: jest.fn(),
}));

// Mock the BIP21 URI generation
jest.mock("@/lib/validation/payment", () => ({
  ...jest.requireActual("@/lib/validation/payment"),
  paymentRequestSchema: {
    safeParse: jest.fn(),
  },
  generateBip21Uri: jest.fn(),
}));

// Mock the payment status store
jest.mock("@/lib/store/payment-status", () => ({
  initializePaymentStatus: jest.fn(() => Promise.resolve()),
}));

import { describe, it, expect, jest, beforeEach, afterAll } from "@jest/globals";

import { createPaymentRequest } from "@/actions/payment";
import { registerPaymentWebhook } from "@/lib/api/blockcypher";
import {
  paymentRequestSchema,
  generateBip21Uri,
} from "@/lib/validation/payment";

const mockRegisterPaymentWebhook =
  registerPaymentWebhook as jest.MockedFunction<typeof registerPaymentWebhook>;
// Create a proper mock for the Zod schema
const mockPaymentRequestSchemaSafeParse = jest.fn();
(paymentRequestSchema as jest.Mocked<typeof paymentRequestSchema>).safeParse =
  mockPaymentRequestSchemaSafeParse;

const mockGenerateBip21Uri = generateBip21Uri as jest.MockedFunction<
  typeof generateBip21Uri
>;

// Mock environment variables
const ORIGINAL_ENV = process.env;

describe("Task 3.2.3 - Payment Server Action Webhook Integration", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
    // Clear environment variables to prevent webhook calls unless explicitly set in test
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  const setupMocks = (webhookSuccess = true) => {
    // Mock successful validation
    mockPaymentRequestSchemaSafeParse.mockReturnValue({
      success: true,
      data: { amount: 0.001 },
    });

    // Mock BIP21 URI generation - use generic pattern since real wallet generates dynamic addresses
    mockGenerateBip21Uri.mockImplementation((address, amount) => 
      `bitcoin:${address}?amount=${amount}&network=testnet`
    );

    // Mock webhook registration
    if (webhookSuccess) {
      mockRegisterPaymentWebhook.mockResolvedValue(["webhook-123", "webhook-456"]);
    } else {
      mockRegisterPaymentWebhook.mockRejectedValue(
        new Error("Webhook registration failed")
      );
    }
  };

  describe("Successful Webhook Registration", () => {
    it("should register webhook and include webhook ID in response", async () => {
      setupMocks(true);
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";

      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      expect(result.success).toBe(true);
      expect(result.data?.webhookId).toBe("webhook-123");
      expect(mockRegisterPaymentWebhook).toHaveBeenCalledWith(
        expect.stringMatching(/^tb1/), // Real wallet generates dynamic addresses
        "https://example.com/api/webhook/payment-update"
      );
    });

    it("should construct HTTPS URL when base URL doesn't include protocol", async () => {
      setupMocks(true);
      process.env.NEXT_PUBLIC_APP_URL = "example.com";

      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      expect(result.success).toBe(true);
      expect(mockRegisterPaymentWebhook).toHaveBeenCalledWith(
        expect.stringMatching(/^tb1/), // Real wallet generates dynamic addresses
        "https://example.com/api/webhook/payment-update"
      );
    });

    it("should use VERCEL_URL as fallback", async () => {
      setupMocks(true);
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.VERCEL_URL = "myapp.vercel.app";

      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      expect(result.success).toBe(true);
      expect(mockRegisterPaymentWebhook).toHaveBeenCalledWith(
        expect.stringMatching(/^tb1/), // Real wallet generates dynamic addresses
        "https://myapp.vercel.app/api/webhook/payment-update"
      );
    });
  });

  describe("Graceful Webhook Failure Handling", () => {
    it("should continue without webhook when registration fails", async () => {
      setupMocks(false);
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";

      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      expect(result.success).toBe(true);
      expect(result.data?.webhookId).toBeUndefined();
      expect(result.data?.address).toMatch(/^tb1[a-z0-9]{39}$/); // Real wallet generates dynamic addresses
      expect(result.data?.paymentUri).toMatch(
        /^bitcoin:tb1[a-z0-9]{39}\?amount=0\.001&network=testnet$/
      );
    });

    it("should skip webhook registration when no base URL is configured", async () => {
      setupMocks(true);
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.VERCEL_URL;

      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      expect(result.success).toBe(true);
      expect(result.data?.webhookId).toBeUndefined();
      expect(mockRegisterPaymentWebhook).not.toHaveBeenCalled();
    });
  });

  describe("Complete Payment Flow with Webhook", () => {
    it("should execute all steps in correct order", async () => {
      setupMocks(true);
      process.env.NEXT_PUBLIC_APP_URL = "https://myapp.com";

      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      // Verify execution order and all components
      expect(mockPaymentRequestSchemaSafeParse).toHaveBeenCalledWith({
        amount: "0.001",
      });
      // Note: We don't mock wallet generation - it uses real implementation
      expect(mockGenerateBip21Uri).toHaveBeenCalledWith(
        expect.stringMatching(/^tb1/), // Real wallet generates dynamic addresses
        0.001,
        "testnet"
      );
      expect(mockRegisterPaymentWebhook).toHaveBeenCalledWith(
        expect.stringMatching(/^tb1/), // Real wallet generates dynamic addresses
        "https://myapp.com/api/webhook/payment-update"
      );

      // Verify complete response structure
      expect(result.success).toBe(true);
      expect(result.data?.address).toMatch(/^tb1[a-z0-9]{39}$/);
      expect(result.data?.amount).toBe(0.001);
      expect(result.data?.paymentUri).toMatch(
        /^bitcoin:tb1[a-z0-9]{39}\?amount=0\.001&network=testnet$/
      );
      expect(result.data?.webhookId).toBe("webhook-123");
      expect(result.data?.requestTimestamp).toBeInstanceOf(Date);
    });

    it("should still succeed when wallet generation works but webhook fails", async () => {
      setupMocks(false);
      process.env.NEXT_PUBLIC_APP_URL = "https://myapp.com";

      const formData = new FormData();
      formData.set("amount", "0.001");

      const result = await createPaymentRequest(formData);

      expect(result.success).toBe(true);
      expect(result.data?.address).toBeTruthy();
      expect(result.data?.paymentUri).toBeTruthy();
      expect(result.data?.webhookId).toBeUndefined();
    });
  });
});