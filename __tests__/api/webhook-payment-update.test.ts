/**
 * Tests for webhook payment update API route
 *
 * Tests the integration between the webhook handler and payment status store
 * for Task 5.2.2: Update status from webhook events
 */

import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/webhook/payment-update/route";
import {
  getPaymentStatus,
  clearAllPaymentStatuses,
  initializePaymentStatus,
} from "@/lib/store/payment-status";
import { PaymentStatus } from "@/types";

// Mock environment variable
const originalEnv = process.env;

beforeAll(() => {
  process.env = {
    ...originalEnv,
    BLOCKCYPHER_TOKEN: "test-token-123",
  };
});

afterAll(() => {
  process.env = originalEnv;
});

beforeEach(async () => {
  await clearAllPaymentStatuses();
});

describe("Webhook Payment Update API Route", () => {
  const testAddress = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
  const testTransactionHash =
    "d5f9b0c9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1";

  // Helper function to create a valid BlockCypher webhook payload
  const createValidWebhookPayload = (overrides = {}) => ({
    hash: testTransactionHash,
    addresses: [testAddress],
    total: 100000, // 0.001 BTC in satoshis
    fees: 1000,
    confirmations: 0,
    double_spend: false,
    block_height: -1, // -1 for unconfirmed
    block_index: -1,
    size: 250,
    preference: "high",
    received: new Date().toISOString(),
    ver: 1,
    vin_sz: 1,
    vout_sz: 2,
    outputs: [
      {
        value: 100000,
        script: "001477c1de8b3c5b91e8b8b4bc29f4d80f2e3a58c8d6",
        addresses: [testAddress],
        script_type: "pay-to-witness-pubkey-hash",
        spent_by: null,
        data_hex: null,
        data_string: null,
      }
    ],
    ...overrides,
  });

  describe("POST handler", () => {
    it("should update payment status for unconfirmed transaction", async () => {
      // Initialize payment status
      await initializePaymentStatus(testAddress, 0.001);

      const webhookPayload = createValidWebhookPayload({
        confirmations: 0,
        block_height: -1,
        block_index: -1,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-eventtype": "unconfirmed-tx",
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Webhook processed successfully");

      // Verify payment status was updated
      const status = await getPaymentStatus(testAddress);
      expect(status).not.toBeNull();
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect(status?.transactionId).toBe(testTransactionHash);
      expect(status?.confirmations).toBe(0);
    });

    it("should update payment status for confirmed transaction", async () => {
      // Initialize payment status
      await initializePaymentStatus(testAddress, 0.001);

      const webhookPayload = createValidWebhookPayload({
        confirmations: 3,
        block_height: 2500000,
        block_index: 1,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-eventtype": "confirmed-tx",
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);
      // const data = await response.json();

      expect(response.status).toBe(200);

      // Verify payment status was updated
      const status = await getPaymentStatus(testAddress);
      expect(status?.status).toBe(PaymentStatus.CONFIRMED);
      expect(status?.confirmations).toBe(3);
    });

    it("should handle double-spend transactions", async () => {
      await initializePaymentStatus(testAddress, 0.001);

      const webhookPayload = createValidWebhookPayload({
        confirmations: 0,
        double_spend: true,
        block_height: -1,
        block_index: -1,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-eventtype": "double-spend-tx",
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify payment status was updated to ERROR
      const status = await getPaymentStatus(testAddress);
      expect(status?.status).toBe(PaymentStatus.ERROR);
      expect(status?.errorMessage).toBe("Double spend detected");
    });

    it("should handle webhook for non-existing payment", async () => {
      // Don't initialize payment status - simulate webhook for unmonitored address

      const webhookPayload = createValidWebhookPayload({
        confirmations: 0,
        block_height: -1,
        block_index: -1,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-eventtype": "unconfirmed-tx",
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Should NOT create new payment status for unmonitored addresses
      const status = await getPaymentStatus(testAddress);
      expect(status).toBeNull();
    });

    it("should reject webhook with missing event type header", async () => {
      const webhookPayload = createValidWebhookPayload({
        confirmations: 0,
        block_height: -1,
        block_index: -1,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Missing x-eventtype header
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing event type header");
    });

    it("should reject webhook with invalid JSON", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          body: "invalid json",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("should reject webhook with invalid payload structure", async () => {
      const webhookPayload = {
        // Missing required fields
        event: "unconfirmed-tx",
        // Missing hash, address, token
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-eventtype": "unconfirmed-tx",
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid payload structure");
    });

    it("should update existing payment from PAYMENT_DETECTED to CONFIRMED", async () => {
      // Initialize as payment detected
      await initializePaymentStatus(testAddress, 0.001);

      // First webhook - unconfirmed
      const unconfirmedPayload = createValidWebhookPayload({
        confirmations: 0,
        block_height: -1,
        block_index: -1,
      });

      let request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-eventtype": "unconfirmed-tx",
          },
          body: JSON.stringify(unconfirmedPayload),
        }
      );

      await POST(request);

      // Verify initial status
      let status = await getPaymentStatus(testAddress);
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);

      // Second webhook - confirmed
      const confirmedPayload = createValidWebhookPayload({
        confirmations: 1,
        block_height: 2500000,
        block_index: 1,
      });

      request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-eventtype": "tx-confirmation",
          },
          body: JSON.stringify(confirmedPayload),
        }
      );

      await POST(request);

      // Verify updated status
      status = await getPaymentStatus(testAddress);
      expect(status?.status).toBe(PaymentStatus.CONFIRMED);
      expect(status?.confirmations).toBe(1);
    });
  });

  describe("GET handler", () => {
    it("should return health check response", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
      expect(data.endpoint).toBe("/api/webhook/payment-update");
      expect(data.methods).toEqual(["POST", "GET"]);
    });
  });
});
