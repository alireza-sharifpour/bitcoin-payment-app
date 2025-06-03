/**
 * Tests for payment status API route
 *
 * Tests the GET /api/payment-status/[address] endpoint
 * for Task 5.2.3: Create status retrieval endpoint
 */

import { NextRequest } from "next/server";
import { GET, POST, OPTIONS } from "@/app/api/payment-status/[address]/route";
import { getPaymentStatus } from "@/lib/store/payment-status";
import { PaymentStatus } from "../../types";

// Mock the payment status store module
jest.mock("@/lib/store/payment-status", () => ({
  getPaymentStatus: jest.fn(),
  initializePaymentStatus: jest.fn(),
  updatePaymentStatus: jest.fn(),
  clearAllPaymentStatuses: jest.fn(),
}));

describe("Payment Status API Route", () => {
  // Valid testnet addresses for testing
  const validNativeSegwitAddress = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
  const validLegacyAddress = "mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn";
  const validP2SHAddress = "2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc";

  // Invalid addresses for testing
  const invalidAddress = "invalid_address";
  const mainnetAddress = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("GET handler", () => {
    it("should return payment status for a valid address with status", async () => {
      const mockStatus = {
        status: PaymentStatus.PAYMENT_DETECTED,
        confirmations: 2,
        transactionId: "abc123def456",
        lastUpdated: Date.now(),
      };

      (getPaymentStatus as jest.Mock).mockReturnValue(mockStatus);

      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${validNativeSegwitAddress}`
      );

      const response = await GET(request, {
        params: { address: validNativeSegwitAddress },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual(mockStatus);
      expect(getPaymentStatus).toHaveBeenCalledWith(validNativeSegwitAddress);
    });

    it("should return 404 for non-existent payment status", async () => {
      (getPaymentStatus as jest.Mock).mockReturnValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${validNativeSegwitAddress}`
      );

      const response = await GET(request, {
        params: { address: validNativeSegwitAddress },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe(
        "Payment status not found for the specified address"
      );
    });

    it("should return 400 for missing address parameter", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/payment-status/"
      );

      const response = await GET(request, {
        params: { address: "" },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Address parameter is required");
    });

    it("should return 400 for invalid Bitcoin address format", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${invalidAddress}`
      );

      const response = await GET(request, {
        params: { address: invalidAddress },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Invalid Bitcoin testnet address format");
      expect(getPaymentStatus).not.toHaveBeenCalled();
    });

    it("should return 400 for mainnet address", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${mainnetAddress}`
      );

      const response = await GET(request, {
        params: { address: mainnetAddress },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Invalid Bitcoin testnet address format");
    });

    it("should accept legacy testnet addresses", async () => {
      const mockStatus = {
        status: PaymentStatus.AWAITING_PAYMENT,
        lastUpdated: Date.now(),
      };

      (getPaymentStatus as jest.Mock).mockReturnValue(mockStatus);

      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${validLegacyAddress}`
      );

      const response = await GET(request, {
        params: { address: validLegacyAddress },
      });

      expect(response.status).toBe(200);
      expect(getPaymentStatus).toHaveBeenCalledWith(validLegacyAddress);
    });

    it("should accept P2SH testnet addresses", async () => {
      const mockStatus = {
        status: PaymentStatus.CONFIRMED,
        confirmations: 6,
        transactionId: "xyz789",
        lastUpdated: Date.now(),
      };

      (getPaymentStatus as jest.Mock).mockReturnValue(mockStatus);

      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${validP2SHAddress}`
      );

      const response = await GET(request, {
        params: { address: validP2SHAddress },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe(PaymentStatus.CONFIRMED);
      expect(data.confirmations).toBe(6);
    });

    it("should include error message when status is ERROR", async () => {
      const mockStatus = {
        status: PaymentStatus.ERROR,
        errorMessage: "Double spend detected",
        transactionId: "failed123",
        lastUpdated: Date.now(),
      };

      (getPaymentStatus as jest.Mock).mockReturnValue(mockStatus);

      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${validNativeSegwitAddress}`
      );

      const response = await GET(request, {
        params: { address: validNativeSegwitAddress },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe(PaymentStatus.ERROR);
      expect(data.errorMessage).toBe("Double spend detected");
    });

    it("should handle store errors gracefully", async () => {
      (getPaymentStatus as jest.Mock).mockImplementation(() => {
        throw new Error("Store error");
      });

      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${validNativeSegwitAddress}`
      );

      const response = await GET(request, {
        params: { address: validNativeSegwitAddress },
      });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe(
        "Internal server error while retrieving payment status"
      );
    });

    it("should set appropriate cache headers", async () => {
      const mockStatus = {
        status: PaymentStatus.AWAITING_PAYMENT,
        lastUpdated: Date.now(),
      };

      (getPaymentStatus as jest.Mock).mockReturnValue(mockStatus);

      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${validNativeSegwitAddress}`
      );

      const response = await GET(request, {
        params: { address: validNativeSegwitAddress },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=2");
    });
  });

  describe("OPTIONS handler", () => {
    it("should return proper CORS headers", async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, OPTIONS"
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type"
      );
    });
  });

  describe("Unsupported methods", () => {
    it("should return 405 for POST requests", async () => {
      const response = await POST();

      expect(response.status).toBe(405);

      const data = await response.json();
      expect(data.error).toBe("Method not allowed");
      expect(data.message).toBe("This endpoint only accepts GET requests");
    });
  });

  describe("Integration scenarios", () => {
    it("should handle payment status transitions correctly", async () => {
      // Simulate a payment going from awaiting to confirmed
      const address = validNativeSegwitAddress;

      // First call - awaiting payment
      (getPaymentStatus as jest.Mock).mockReturnValue({
        status: PaymentStatus.AWAITING_PAYMENT,
        lastUpdated: Date.now(),
      });

      let request = new NextRequest(
        `http://localhost:3000/api/payment-status/${address}`
      );
      let response = await GET(request, { params: { address } });
      let data = await response.json();

      expect(data.status).toBe(PaymentStatus.AWAITING_PAYMENT);
      expect(data.transactionId).toBeUndefined();

      // Second call - payment detected
      (getPaymentStatus as jest.Mock).mockReturnValue({
        status: PaymentStatus.PAYMENT_DETECTED,
        confirmations: 0,
        transactionId: "txid123",
        lastUpdated: Date.now(),
      });

      request = new NextRequest(
        `http://localhost:3000/api/payment-status/${address}`
      );
      response = await GET(request, { params: { address } });
      data = await response.json();

      expect(data.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect(data.confirmations).toBe(0);
      expect(data.transactionId).toBe("txid123");

      // Third call - payment confirmed
      (getPaymentStatus as jest.Mock).mockReturnValue({
        status: PaymentStatus.CONFIRMED,
        confirmations: 3,
        transactionId: "txid123",
        lastUpdated: Date.now(),
      });

      request = new NextRequest(
        `http://localhost:3000/api/payment-status/${address}`
      );
      response = await GET(request, { params: { address } });
      data = await response.json();

      expect(data.status).toBe(PaymentStatus.CONFIRMED);
      expect(data.confirmations).toBe(3);
    });
  });
});
