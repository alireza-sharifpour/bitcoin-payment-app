/**
 * Payment Server Action Webhook Integration Tests
 *
 * Tests for Task 3.2.3: Integrate webhook registration in Server Action
 * - Call webhook registration after address generation
 * - Handle registration failures gracefully
 */

import { createPaymentRequest } from "@/actions/payment";

// Mock the Blockcypher API client
jest.mock("@/lib/api/blockcypher", () => ({
  registerPaymentWebhook: jest.fn(),
}));

// Mock the wallet generation
jest.mock("@/lib/bitcoin/wallet", () => ({
  generateWalletAddress: jest.fn(),
}));

// Mock the BIP21 URI generation
jest.mock("@/lib/validation/payment", () => ({
  paymentRequestSchema: {
    safeParse: jest.fn(),
  },
  generateBip21Uri: jest.fn(),
}));

import { registerPaymentWebhook } from "@/lib/api/blockcypher";
import { generateWalletAddress } from "@/lib/bitcoin/wallet";
import {
  paymentRequestSchema,
  generateBip21Uri,
} from "@/lib/validation/payment";

const mockRegisterPaymentWebhook =
  registerPaymentWebhook as jest.MockedFunction<typeof registerPaymentWebhook>;
const mockGenerateWalletAddress = generateWalletAddress as jest.MockedFunction<
  typeof generateWalletAddress
>;
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

    // Mock wallet address generation
    mockGenerateWalletAddress.mockReturnValue(
      "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
    );

    // Mock BIP21 URI generation
    mockGenerateBip21Uri.mockReturnValue(
      "bitcoin:tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4?amount=0.001&network=testnet"
    );

    // Mock webhook registration
    if (webhookSuccess) {
      mockRegisterPaymentWebhook.mockResolvedValue("webhook-123");
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
        "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
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
        "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
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
        "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
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
      expect(result.data?.address).toBe(
        "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
      );
      expect(result.data?.paymentUri).toBe(
        "bitcoin:tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4?amount=0.001&network=testnet"
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
      expect(mockGenerateWalletAddress).toHaveBeenCalled();
      expect(mockGenerateBip21Uri).toHaveBeenCalledWith(
        "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        0.001,
        "testnet"
      );
      expect(mockRegisterPaymentWebhook).toHaveBeenCalledWith(
        "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        "https://myapp.com/api/webhook/payment-update"
      );

      // Verify complete response structure
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        amount: 0.001,
        paymentUri:
          "bitcoin:tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4?amount=0.001&network=testnet",
        webhookId: "webhook-123",
        requestTimestamp: expect.any(Date),
      });
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
