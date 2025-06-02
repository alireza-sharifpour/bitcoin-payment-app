/**
 * Test suite for Blockcypher API Client
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { registerWebhook, BlockcypherWebhook } from "@/lib/blockcypher/client";

// Mock the global fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;

describe("Blockcypher API Client", () => {
  beforeEach(() => {
    jest.resetAllMocks(); // Reset mocks before each test
    console.error = jest.fn(); // Suppress console.error for expected error tests
  });

  afterEach(() => {
    console.error = originalConsoleError; // Restore console.error
  });

  describe("registerWebhook", () => {
    const mockAddress = "testAddress123";
    const mockCallbackUrl = "https://example.com/webhook";
    const mockApiToken = "testApiToken";
    const expectedApiBasePath = "https://api.blockcypher.com/v1";
    const expectedPath = "/btc/test3/hooks";

    it("should register a webhook successfully and return its ID", async () => {
      const mockWebhookId = "webhook-id-123";
      const mockResponse: BlockcypherWebhook = {
        id: mockWebhookId,
        event: "unconfirmed-tx",
        address: mockAddress,
        url: mockCallbackUrl,
        token: mockApiToken,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const webhookId = await registerWebhook(
        mockAddress,
        mockCallbackUrl,
        mockApiToken
      );

      expect(webhookId).toBe(mockWebhookId);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${expectedApiBasePath}${expectedPath}`, // Token is in payload, not URL
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: "unconfirmed-tx", // Default eventType
            address: mockAddress,
            url: mockCallbackUrl,
            token: mockApiToken,
          }),
        }
      );
    });

    it("should use custom eventType if provided", async () => {
      const mockWebhookId = "webhook-id-custom";
      const customEventType = "tx-confirmation";
      const mockResponse: BlockcypherWebhook = {
        id: mockWebhookId,
        event: customEventType,
        address: mockAddress,
        url: mockCallbackUrl,
        token: mockApiToken,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await registerWebhook(
        mockAddress,
        mockCallbackUrl,
        mockApiToken,
        customEventType
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${expectedApiBasePath}${expectedPath}`,
        expect.objectContaining({
          body: JSON.stringify({
            event: customEventType,
            address: mockAddress,
            url: mockCallbackUrl,
            token: mockApiToken,
          }),
        })
      );
    });

    it("should throw an error if webhook registration fails (API error)", async () => {
      const errorMessage = "Invalid token";
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: errorMessage }),
      } as Response);

      await expect(
        registerWebhook(mockAddress, mockCallbackUrl, mockApiToken)
      ).rejects.toThrow(`Failed to register webhook: Blockcypher API request failed with status 401: ${errorMessage}`);
      expect(console.error).toHaveBeenCalled();
    });

    it("should throw an error if webhook registration fails (network error)", async () => {
      const networkErrorMessage = "Network request failed";
      mockFetch.mockRejectedValueOnce(new Error(networkErrorMessage));

      await expect(
        registerWebhook(mockAddress, mockCallbackUrl, mockApiToken)
      ).rejects.toThrow(`Failed to register webhook: Blockcypher API request error: ${networkErrorMessage}`);
      expect(console.error).toHaveBeenCalled();
    });

    it("should throw an error if the response does not contain a webhook ID", async () => {
      const mockResponse = { event: "unconfirmed-tx" }; // Missing id
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await expect(
        registerWebhook(mockAddress, mockCallbackUrl, mockApiToken)
      ).rejects.toThrow("Failed to register webhook: Webhook registration did not return an ID.");
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle API error response with 'errors' array", async () => {
      const errorMessages = [{ error: "Field is required: address" }, { error: "Invalid event type" }];
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ errors: errorMessages }),
      } as Response);

      await expect(
        registerWebhook(mockAddress, mockCallbackUrl, mockApiToken)
      ).rejects.toThrow(`Failed to register webhook: Blockcypher API request failed with status 400: ${errorMessages.map(e=>e.error).join(", ")}`);
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle API error response that cannot be parsed as JSON", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error("Malformed JSON"); }, // Simulate malformed JSON
      } as Response);

      await expect(
        registerWebhook(mockAddress, mockCallbackUrl, mockApiToken)
      ).rejects.toThrow('Failed to register webhook: Blockcypher API request failed with status 500');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
