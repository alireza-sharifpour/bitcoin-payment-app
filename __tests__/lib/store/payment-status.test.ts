/**
 * Unit tests for Payment Status Store
 * 
 * Tests the in-memory payment status store functionality including:
 * - Initialization of payment statuses
 * - Updating payment statuses from webhook data
 * - Retrieving payment statuses
 * - Store management operations
 * - Edge cases and error handling
 */

import {
  initializePaymentStatus,
  updatePaymentStatus,
  getPaymentStatus,
  hasPaymentStatus,
  deletePaymentStatus,
  clearAllPaymentStatuses,
  getAllPaymentStatuses,
  getStoreStats,
  cleanupOldEntries,
} from "@/lib/store/payment-status";
import { PaymentStatus } from "../../../types";

describe("Payment Status Store", () => {
  // Test Bitcoin addresses
  const testAddress1 = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
  const testAddress2 = "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7";
  const testTransactionId = "d5f9b0c9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1";

  beforeEach(() => {
    // Clear the store before each test
    clearAllPaymentStatuses();
  });

  describe("initializePaymentStatus", () => {
    it("should initialize a new payment status with AWAITING_PAYMENT", () => {
      initializePaymentStatus(testAddress1, 0.001, "webhook-123");

      const status = getPaymentStatus(testAddress1);
      expect(status).not.toBeNull();
      expect(status?.status).toBe(PaymentStatus.AWAITING_PAYMENT);
      expect(status?.confirmations).toBeUndefined();
      expect(status?.transactionId).toBeUndefined();
    });

    it("should initialize without optional parameters", () => {
      initializePaymentStatus(testAddress1);

      const status = getPaymentStatus(testAddress1);
      expect(status).not.toBeNull();
      expect(status?.status).toBe(PaymentStatus.AWAITING_PAYMENT);
    });

    it("should set lastUpdated timestamp", () => {
      const beforeTime = Date.now();
      initializePaymentStatus(testAddress1);
      const afterTime = Date.now();

      const status = getPaymentStatus(testAddress1);
      expect(status?.lastUpdated).toBeGreaterThanOrEqual(beforeTime);
      expect(status?.lastUpdated).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("updatePaymentStatus", () => {
    it("should update status to PAYMENT_DETECTED", () => {
      initializePaymentStatus(testAddress1);
      
      updatePaymentStatus(
        testAddress1,
        PaymentStatus.PAYMENT_DETECTED,
        testTransactionId,
        0,
        100000, // 0.001 BTC in satoshis
        95
      );

      const status = getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect(status?.transactionId).toBe(testTransactionId);
      expect(status?.confirmations).toBe(0);
    });

    it("should update status to CONFIRMED", () => {
      initializePaymentStatus(testAddress1);
      
      updatePaymentStatus(
        testAddress1,
        PaymentStatus.CONFIRMED,
        testTransactionId,
        3
      );

      const status = getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.CONFIRMED);
      expect(status?.confirmations).toBe(3);
    });

    it("should handle ERROR status with double spend", () => {
      initializePaymentStatus(testAddress1);
      
      updatePaymentStatus(
        testAddress1,
        PaymentStatus.ERROR,
        testTransactionId,
        0,
        undefined,
        undefined,
        true
      );

      const status = getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.ERROR);
      expect(status?.errorMessage).toBe("Double spend detected");
    });

    it("should handle ERROR status without double spend", () => {
      initializePaymentStatus(testAddress1);
      
      updatePaymentStatus(
        testAddress1,
        PaymentStatus.ERROR,
        testTransactionId
      );

      const status = getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.ERROR);
      expect(status?.errorMessage).toBe("Payment processing error");
    });

    it("should create new entry if address doesn't exist", () => {
      // Update without initialization
      updatePaymentStatus(
        testAddress1,
        PaymentStatus.PAYMENT_DETECTED,
        testTransactionId,
        0
      );

      const status = getPaymentStatus(testAddress1);
      expect(status).not.toBeNull();
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
    });

    it("should update lastUpdated timestamp", () => {
      initializePaymentStatus(testAddress1);
      const initialStatus = getPaymentStatus(testAddress1);
      const initialTimestamp = initialStatus?.lastUpdated;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        updatePaymentStatus(
          testAddress1,
          PaymentStatus.PAYMENT_DETECTED,
          testTransactionId
        );

        const updatedStatus = getPaymentStatus(testAddress1);
        expect(updatedStatus?.lastUpdated).toBeGreaterThan(initialTimestamp!);
      }, 10);
    });
  });

  describe("getPaymentStatus", () => {
    it("should return null for non-existent address", () => {
      const status = getPaymentStatus("non-existent-address");
      expect(status).toBeNull();
    });

    it("should return client-safe fields only", () => {
      initializePaymentStatus(testAddress1, 0.001, "webhook-123");
      
      const status = getPaymentStatus(testAddress1);
      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("lastUpdated");
      
      // These internal fields should not be exposed
      expect(status).not.toHaveProperty("address");
      expect(status).not.toHaveProperty("expectedAmount");
      expect(status).not.toHaveProperty("webhookId");
      expect(status).not.toHaveProperty("createdAt");
    });
  });

  describe("hasPaymentStatus", () => {
    it("should return true for existing address", () => {
      initializePaymentStatus(testAddress1);
      expect(hasPaymentStatus(testAddress1)).toBe(true);
    });

    it("should return false for non-existent address", () => {
      expect(hasPaymentStatus("non-existent-address")).toBe(false);
    });
  });

  describe("deletePaymentStatus", () => {
    it("should delete existing payment status", () => {
      initializePaymentStatus(testAddress1);
      expect(hasPaymentStatus(testAddress1)).toBe(true);

      const deleted = deletePaymentStatus(testAddress1);
      expect(deleted).toBe(true);
      expect(hasPaymentStatus(testAddress1)).toBe(false);
    });

    it("should return false when deleting non-existent status", () => {
      const deleted = deletePaymentStatus("non-existent-address");
      expect(deleted).toBe(false);
    });
  });

  describe("clearAllPaymentStatuses", () => {
    it("should clear all payment statuses", () => {
      initializePaymentStatus(testAddress1);
      initializePaymentStatus(testAddress2);
      
      expect(getAllPaymentStatuses()).toHaveLength(2);
      
      clearAllPaymentStatuses();
      
      expect(getAllPaymentStatuses()).toHaveLength(0);
      expect(hasPaymentStatus(testAddress1)).toBe(false);
      expect(hasPaymentStatus(testAddress2)).toBe(false);
    });
  });

  describe("getAllPaymentStatuses", () => {
    it("should return all payment statuses", () => {
      initializePaymentStatus(testAddress1);
      initializePaymentStatus(testAddress2);
      
      const allStatuses = getAllPaymentStatuses();
      expect(allStatuses).toHaveLength(2);
      
      const addresses = allStatuses.map(s => s.address);
      expect(addresses).toContain(testAddress1);
      expect(addresses).toContain(testAddress2);
    });

    it("should return a copy, not references", () => {
      initializePaymentStatus(testAddress1);
      
      const allStatuses = getAllPaymentStatuses();
      allStatuses[0].status = PaymentStatus.ERROR;
      
      // Original should not be affected
      const status = getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.AWAITING_PAYMENT);
    });
  });

  describe("getStoreStats", () => {
    it("should return correct statistics", () => {
      initializePaymentStatus(testAddress1);
      updatePaymentStatus(
        testAddress2,
        PaymentStatus.PAYMENT_DETECTED,
        testTransactionId
      );

      const stats = getStoreStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.statusCounts[PaymentStatus.AWAITING_PAYMENT]).toBe(1);
      expect(stats.statusCounts[PaymentStatus.PAYMENT_DETECTED]).toBe(1);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it("should handle empty store", () => {
      const stats = getStoreStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.statusCounts).toEqual({});
      expect(stats.oldestEntry).toBeUndefined();
      expect(stats.newestEntry).toBeUndefined();
    });
  });

  describe("cleanupOldEntries", () => {
    it("should remove old entries", (done) => {
      initializePaymentStatus(testAddress1);
      
      // Wait to create a time difference
      setTimeout(() => {
        initializePaymentStatus(testAddress2);
        
        // Cleanup entries older than 50ms
        const removed = cleanupOldEntries(50);
        
        expect(removed).toBe(1);
        expect(hasPaymentStatus(testAddress1)).toBe(false);
        expect(hasPaymentStatus(testAddress2)).toBe(true);
        done();
      }, 100);
    });

    it("should not remove recent entries", () => {
      initializePaymentStatus(testAddress1);
      initializePaymentStatus(testAddress2);
      
      // Cleanup entries older than 1 hour
      const removed = cleanupOldEntries(3600000);
      
      expect(removed).toBe(0);
      expect(hasPaymentStatus(testAddress1)).toBe(true);
      expect(hasPaymentStatus(testAddress2)).toBe(true);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle full payment lifecycle", () => {
      // 1. Initialize payment request
      initializePaymentStatus(testAddress1, 0.001);
      
      let status = getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.AWAITING_PAYMENT);

      // 2. Payment detected (0 confirmations)
      updatePaymentStatus(
        testAddress1,
        PaymentStatus.PAYMENT_DETECTED,
        testTransactionId,
        0,
        100000,
        85
      );
      
      status = getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect(status?.confirmations).toBe(0);

      // 3. Payment confirmed (1 confirmation)
      updatePaymentStatus(
        testAddress1,
        PaymentStatus.CONFIRMED,
        testTransactionId,
        1,
        100000,
        100
      );
      
      status = getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.CONFIRMED);
      expect(status?.confirmations).toBe(1);
    });

    it("should handle multiple concurrent payments", () => {
      const addresses = [
        "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
        "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
        "tb1q34aq5drkt5yvlg4xddngju8qmvk9m2ukkmqjc7"
      ];

      // Initialize multiple payments
      addresses.forEach(addr => initializePaymentStatus(addr));

      // Update some to different statuses
      updatePaymentStatus(
        addresses[0],
        PaymentStatus.PAYMENT_DETECTED,
        "tx1",
        0
      );
      updatePaymentStatus(
        addresses[1],
        PaymentStatus.CONFIRMED,
        "tx2",
        2
      );

      // Verify each has correct status
      expect(getPaymentStatus(addresses[0])?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect(getPaymentStatus(addresses[1])?.status).toBe(PaymentStatus.CONFIRMED);
      expect(getPaymentStatus(addresses[2])?.status).toBe(PaymentStatus.AWAITING_PAYMENT);

      // Check stats
      const stats = getStoreStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.statusCounts[PaymentStatus.AWAITING_PAYMENT]).toBe(1);
      expect(stats.statusCounts[PaymentStatus.PAYMENT_DETECTED]).toBe(1);
      expect(stats.statusCounts[PaymentStatus.CONFIRMED]).toBe(1);
    });
  });
});