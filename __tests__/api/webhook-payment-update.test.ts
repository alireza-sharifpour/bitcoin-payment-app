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
import { PaymentStatus } from "../../types";

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

beforeEach(() => {
  clearAllPaymentStatuses();
});

describe("Webhook Payment Update API Route", () => {
  const testAddress = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
  const testTransactionHash =
    "d5f9b0c9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1";

  describe("POST handler", () => {
    it("should update payment status for unconfirmed transaction", async () => {
      // Initialize payment status
      initializePaymentStatus(testAddress, 0.001);

      const webhookPayload = {
        event: "unconfirmed-tx",
        hash: testTransactionHash,
        address: testAddress,
        confirmations: 0,
        total: 100000, // 0.001 BTC in satoshis
        confidence: 0.95,
        token: "test-token-123",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Webhook processed successfully");

      // Verify payment status was updated
      const status = getPaymentStatus(testAddress);
      expect(status).not.toBeNull();
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect(status?.transactionId).toBe(testTransactionHash);
      expect(status?.confirmations).toBe(0);
    });

    it("should update payment status for confirmed transaction", async () => {
      // Initialize payment status
      initializePaymentStatus(testAddress, 0.001);

      const webhookPayload = {
        event: "confirmed-tx",
        hash: testTransactionHash,
        address: testAddress,
        confirmations: 3,
        total: 100000,
        token: "test-token-123",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);
      // const data = await response.json();

      expect(response.status).toBe(200);

      // Verify payment status was updated
      const status = getPaymentStatus(testAddress);
      expect(status?.status).toBe(PaymentStatus.CONFIRMED);
      expect(status?.confirmations).toBe(3);
    });

    it("should handle double-spend transactions", async () => {
      initializePaymentStatus(testAddress, 0.001);

      const webhookPayload = {
        event: "double-spend-tx",
        hash: testTransactionHash,
        address: testAddress,
        confirmations: 0,
        double_spend: true,
        token: "test-token-123",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify payment status was updated to ERROR
      const status = getPaymentStatus(testAddress);
      expect(status?.status).toBe(PaymentStatus.ERROR);
      expect(status?.errorMessage).toBe("Double spend detected");
    });

    it("should handle webhook for non-existing payment", async () => {
      // Don't initialize payment status - simulate webhook for unknown address

      const webhookPayload = {
        event: "unconfirmed-tx",
        hash: testTransactionHash,
        address: testAddress,
        confirmations: 0,
        total: 100000,
        token: "test-token-123",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Should create new payment status
      const status = getPaymentStatus(testAddress);
      expect(status).not.toBeNull();
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
    });

    it("should reject webhook with invalid token", async () => {
      const webhookPayload = {
        event: "unconfirmed-tx",
        hash: testTransactionHash,
        address: testAddress,
        confirmations: 0,
        token: "invalid-token",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized: Invalid token");
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
      initializePaymentStatus(testAddress, 0.001);

      // First webhook - unconfirmed
      const unconfirmedPayload = {
        event: "unconfirmed-tx",
        hash: testTransactionHash,
        address: testAddress,
        confirmations: 0,
        total: 100000,
        confidence: 0.9,
        token: "test-token-123",
      };

      let request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          body: JSON.stringify(unconfirmedPayload),
        }
      );

      await POST(request);

      // Verify initial status
      let status = getPaymentStatus(testAddress);
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);

      // Second webhook - confirmed
      const confirmedPayload = {
        event: "tx-confirmation",
        hash: testTransactionHash,
        address: testAddress,
        confirmations: 1,
        total: 100000,
        token: "test-token-123",
      };

      request = new NextRequest(
        "http://localhost:3000/api/webhook/payment-update",
        {
          method: "POST",
          body: JSON.stringify(confirmedPayload),
        }
      );

      await POST(request);

      // Verify updated status
      status = getPaymentStatus(testAddress);
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
