/**
 * Unit tests for webhook-parser utility
 *
 * Tests the parsing of BlockCypher webhook payloads and mapping
 * to internal payment status types.
 */

import {
  parseWebhookTransaction,
  mapEventToPaymentStatus,
  extractAddress,
  calculateAmountReceived,
  isValidTransaction,
} from "../webhook-parser";
import { PaymentStatus } from "../../../../types";
import type { BlockcypherWebhookPayload } from "@/lib/validation/webhook";

describe("webhook-parser", () => {
  const mockAddress = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
  const mockTxHash =
    "1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890";

  describe("mapEventToPaymentStatus", () => {
    it("should map unconfirmed-tx to PAYMENT_DETECTED", () => {
      expect(mapEventToPaymentStatus("unconfirmed-tx", 0)).toBe(
        PaymentStatus.PAYMENT_DETECTED
      );
    });

    it("should map confirmed-tx with confirmations to CONFIRMED", () => {
      expect(mapEventToPaymentStatus("confirmed-tx", 1)).toBe(
        PaymentStatus.CONFIRMED
      );
      expect(mapEventToPaymentStatus("confirmed-tx", 6)).toBe(
        PaymentStatus.CONFIRMED
      );
    });

    it("should map confirmed-tx with 0 confirmations to PAYMENT_DETECTED", () => {
      expect(mapEventToPaymentStatus("confirmed-tx", 0)).toBe(
        PaymentStatus.PAYMENT_DETECTED
      );
    });

    it("should map tx-confirmation based on confirmation count", () => {
      expect(mapEventToPaymentStatus("tx-confirmation", 0)).toBe(
        PaymentStatus.PAYMENT_DETECTED
      );
      expect(mapEventToPaymentStatus("tx-confirmation", 1)).toBe(
        PaymentStatus.CONFIRMED
      );
    });

    it("should map double-spend-tx to ERROR", () => {
      expect(mapEventToPaymentStatus("double-spend-tx")).toBe(
        PaymentStatus.ERROR
      );
    });

    it("should map any event with double_spend flag to ERROR", () => {
      expect(mapEventToPaymentStatus("confirmed-tx", 1, true)).toBe(
        PaymentStatus.ERROR
      );
      expect(mapEventToPaymentStatus("unconfirmed-tx", 0, true)).toBe(
        PaymentStatus.ERROR
      );
    });

    it("should handle unknown events gracefully", () => {
      expect(mapEventToPaymentStatus("unknown-event", 0)).toBe(
        PaymentStatus.PAYMENT_DETECTED
      );
      expect(mapEventToPaymentStatus("unknown-event", 1)).toBe(
        PaymentStatus.CONFIRMED
      );
    });
  });

  describe("extractAddress", () => {
    it("should extract address from direct address field", () => {
      const payload: Partial<BlockcypherWebhookPayload> = {
        address: mockAddress,
        hash: mockTxHash,
        event: "unconfirmed-tx",
        token: "test-token",
      };

      expect(extractAddress(payload as BlockcypherWebhookPayload)).toBe(
        mockAddress
      );
    });

    it("should extract address from outputs when direct address is not available", () => {
      const payload: Partial<BlockcypherWebhookPayload> = {
        hash: mockTxHash,
        event: "unconfirmed-tx",
        token: "test-token",
        outputs: [
          {
            value: 100000,
            script: "test-script",
            addresses: [mockAddress],
            script_type: "pay-to-pubkey-hash",
          },
        ],
      };

      expect(extractAddress(payload as BlockcypherWebhookPayload)).toBe(
        mockAddress
      );
    });

    it("should return null when no address can be determined", () => {
      const payload: Partial<BlockcypherWebhookPayload> = {
        hash: mockTxHash,
        event: "unconfirmed-tx",
        token: "test-token",
      };

      expect(extractAddress(payload as BlockcypherWebhookPayload)).toBeNull();
    });
  });

  describe("calculateAmountReceived", () => {
    it("should use total amount when address matches", () => {
      const payload: Partial<BlockcypherWebhookPayload> = {
        address: mockAddress,
        total: 100000,
        hash: mockTxHash,
        event: "unconfirmed-tx",
        token: "test-token",
      };

      expect(
        calculateAmountReceived(
          payload as BlockcypherWebhookPayload,
          mockAddress
        )
      ).toBe(100000);
    });

    it("should calculate amount from outputs", () => {
      const payload: Partial<BlockcypherWebhookPayload> = {
        hash: mockTxHash,
        event: "unconfirmed-tx",
        token: "test-token",
        outputs: [
          {
            value: 50000,
            script: "test-script",
            addresses: [mockAddress],
            script_type: "pay-to-pubkey-hash",
          },
          {
            value: 30000,
            script: "test-script",
            addresses: ["other-address"],
            script_type: "pay-to-pubkey-hash",
          },
        ],
      };

      expect(
        calculateAmountReceived(
          payload as BlockcypherWebhookPayload,
          mockAddress
        )
      ).toBe(50000);
    });

    it("should return undefined when amount cannot be determined", () => {
      const payload: Partial<BlockcypherWebhookPayload> = {
        hash: mockTxHash,
        event: "unconfirmed-tx",
        token: "test-token",
      };

      expect(
        calculateAmountReceived(
          payload as BlockcypherWebhookPayload,
          mockAddress
        )
      ).toBeUndefined();
    });
  });

  describe("parseWebhookTransaction", () => {
    it("should parse complete webhook payload correctly", () => {
      const payload: BlockcypherWebhookPayload = {
        token: "test-token",
        event: "unconfirmed-tx",
        hash: mockTxHash,
        address: mockAddress,
        confirmations: 0,
        confidence: 95,
        total: 100000,
        fees: 1000,
        double_spend: false,
      };

      const result = parseWebhookTransaction(payload);

      expect(result).not.toBeNull();
      expect(result!.transactionHash).toBe(mockTxHash);
      expect(result!.address).toBe(mockAddress);
      expect(result!.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect(result!.confirmations).toBe(0);
      expect(result!.totalAmount).toBe(100000);
      expect(result!.fees).toBe(1000);
      expect(result!.confidence).toBe(95);
      expect(result!.isDoubleSpend).toBe(false);
    });

    it("should parse confirmed transaction correctly", () => {
      const payload: BlockcypherWebhookPayload = {
        token: "test-token",
        event: "confirmed-tx",
        hash: mockTxHash,
        address: mockAddress,
        confirmations: 3,
        total: 50000,
      };

      const result = parseWebhookTransaction(payload);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(PaymentStatus.CONFIRMED);
      expect(result!.confirmations).toBe(3);
    });

    it("should return null when address cannot be extracted", () => {
      const payload: BlockcypherWebhookPayload = {
        token: "test-token",
        event: "unconfirmed-tx",
        hash: mockTxHash,
      };

      const result = parseWebhookTransaction(payload);
      expect(result).toBeNull();
    });
  });

  describe("isValidTransaction", () => {
    it("should validate correct transaction data", () => {
      const data = {
        transactionHash: mockTxHash,
        confirmations: 1,
        address: mockAddress,
        status: PaymentStatus.CONFIRMED,
        isDoubleSpend: false,
        lastUpdated: Date.now(),
      };

      expect(isValidTransaction(data)).toBe(true);
    });

    it("should reject invalid transaction hash", () => {
      const data = {
        transactionHash: "short",
        confirmations: 1,
        address: mockAddress,
        status: PaymentStatus.CONFIRMED,
        isDoubleSpend: false,
        lastUpdated: Date.now(),
      };

      expect(isValidTransaction(data)).toBe(false);
    });

    it("should reject invalid address", () => {
      const data = {
        transactionHash: mockTxHash,
        confirmations: 1,
        address: "invalid-address",
        status: PaymentStatus.CONFIRMED,
        isDoubleSpend: false,
        lastUpdated: Date.now(),
      };

      expect(isValidTransaction(data)).toBe(false);
    });

    it("should reject negative confirmations", () => {
      const data = {
        transactionHash: mockTxHash,
        confirmations: -1,
        address: mockAddress,
        status: PaymentStatus.CONFIRMED,
        isDoubleSpend: false,
        lastUpdated: Date.now(),
      };

      expect(isValidTransaction(data)).toBe(false);
    });

    it("should reject zero or negative amounts", () => {
      const data = {
        transactionHash: mockTxHash,
        confirmations: 1,
        address: mockAddress,
        status: PaymentStatus.CONFIRMED,
        totalAmount: 0,
        isDoubleSpend: false,
        lastUpdated: Date.now(),
      };

      expect(isValidTransaction(data)).toBe(false);
    });
  });
});
