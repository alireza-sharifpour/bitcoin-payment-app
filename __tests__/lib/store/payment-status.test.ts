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
import { PaymentStatus } from "@/types";

describe("Payment Status Store", () => {
  // Test Bitcoin addresses
  const testAddress1 = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
  const testAddress2 = "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7";
  const testTransactionId = "d5f9b0c9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1";

  beforeEach(async () => {
    // Clear the store before each test
    await clearAllPaymentStatuses();
  });

  describe("initializePaymentStatus", () => {
    it("should initialize a new payment status with AWAITING_PAYMENT", async () => {
      await initializePaymentStatus(testAddress1, 0.001, "webhook-123");

      const status = await getPaymentStatus(testAddress1);
      expect(status).not.toBeNull();
      expect(status?.status).toBe(PaymentStatus.AWAITING_PAYMENT);
      expect(status?.confirmations).toBeUndefined();
      expect(status?.transactionId).toBeUndefined();
    });

    it("should initialize without optional parameters", async () => {
      await initializePaymentStatus(testAddress1);

      const status = await getPaymentStatus(testAddress1);
      expect(status).not.toBeNull();
      expect(status?.status).toBe(PaymentStatus.AWAITING_PAYMENT);
    });

    it("should set lastUpdated timestamp", async () => {
      const beforeTime = Date.now();
      await initializePaymentStatus(testAddress1);
      const afterTime = Date.now();

      const status = await getPaymentStatus(testAddress1);
      expect(status?.lastUpdated).toBeGreaterThanOrEqual(beforeTime);
      expect(status?.lastUpdated).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("updatePaymentStatus", () => {
    it("should update status to PAYMENT_DETECTED", async () => {
      await initializePaymentStatus(testAddress1);
      
      await updatePaymentStatus(
        testAddress1,
        PaymentStatus.PAYMENT_DETECTED,
        testTransactionId,
        0,
        100000, // 0.001 BTC in satoshis
        95
      );

      const status = await getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect(status?.transactionId).toBe(testTransactionId);
      expect(status?.confirmations).toBe(0);
    });

    it("should update status to CONFIRMED", async () => {
      await initializePaymentStatus(testAddress1);
      
      await updatePaymentStatus(
        testAddress1,
        PaymentStatus.CONFIRMED,
        testTransactionId,
        3
      );

      const status = await getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.CONFIRMED);
      expect(status?.confirmations).toBe(3);
    });

    it("should handle ERROR status with double spend", async () => {
      await initializePaymentStatus(testAddress1);
      
      await updatePaymentStatus(
        testAddress1,
        PaymentStatus.ERROR,
        testTransactionId,
        0,
        undefined,
        undefined,
        true
      );

      const status = await getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.ERROR);
      expect(status?.errorMessage).toBe("Double spend detected");
    });

    it("should handle ERROR status without double spend", async () => {
      await initializePaymentStatus(testAddress1);
      
      await updatePaymentStatus(
        testAddress1,
        PaymentStatus.ERROR,
        testTransactionId
      );

      const status = await getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.ERROR);
      expect(status?.errorMessage).toBe("Payment processing error");
    });

    it("should not create new entry if address doesn't exist", async () => {
      // Update without initialization should not create new entry
      await updatePaymentStatus(
        testAddress1,
        PaymentStatus.PAYMENT_DETECTED,
        testTransactionId,
        0
      );

      const status = await getPaymentStatus(testAddress1);
      expect(status).toBeNull();
    });

    it("should update lastUpdated timestamp", async () => {
      await initializePaymentStatus(testAddress1);
      const initialStatus = await getPaymentStatus(testAddress1);
      const initialTimestamp = initialStatus?.lastUpdated;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await updatePaymentStatus(
        testAddress1,
        PaymentStatus.PAYMENT_DETECTED,
        testTransactionId
      );

      const updatedStatus = await getPaymentStatus(testAddress1);
      expect(updatedStatus?.lastUpdated).toBeGreaterThan(initialTimestamp!);
    });
  });

  describe("getPaymentStatus", () => {
    it("should return null for non-existent address", async () => {
      const status = await getPaymentStatus("non-existent-address");
      expect(status).toBeNull();
    });

    it("should return client-safe fields only", async () => {
      await initializePaymentStatus(testAddress1, 0.001, "webhook-123");
      
      const status = await getPaymentStatus(testAddress1);
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
    it("should return true for existing address", async () => {
      await initializePaymentStatus(testAddress1);
      expect(await hasPaymentStatus(testAddress1)).toBe(true);
    });

    it("should return false for non-existent address", async () => {
      expect(await hasPaymentStatus("non-existent-address")).toBe(false);
    });
  });

  describe("deletePaymentStatus", () => {
    it("should delete existing payment status", async () => {
      await initializePaymentStatus(testAddress1);
      expect(await hasPaymentStatus(testAddress1)).toBe(true);

      const deleted = await deletePaymentStatus(testAddress1);
      expect(deleted).toBe(true);
      expect(await hasPaymentStatus(testAddress1)).toBe(false);
    });

    it("should return false when deleting non-existent status", async () => {
      const deleted = await deletePaymentStatus("non-existent-address");
      expect(deleted).toBe(false);
    });
  });

  describe("clearAllPaymentStatuses", () => {
    it("should clear all payment statuses", async () => {
      await initializePaymentStatus(testAddress1);
      await initializePaymentStatus(testAddress2);
      
      expect((await getAllPaymentStatuses())).toHaveLength(2);
      
      await clearAllPaymentStatuses();
      
      expect((await getAllPaymentStatuses())).toHaveLength(0);
      expect(await hasPaymentStatus(testAddress1)).toBe(false);
      expect(await hasPaymentStatus(testAddress2)).toBe(false);
    });
  });

  describe("getAllPaymentStatuses", () => {
    it("should return all payment statuses", async () => {
      await initializePaymentStatus(testAddress1);
      await initializePaymentStatus(testAddress2);
      
      const allStatuses = await getAllPaymentStatuses();
      expect(allStatuses).toHaveLength(2);
      
      const addresses = allStatuses.map(s => s.address);
      expect(addresses).toContain(testAddress1);
      expect(addresses).toContain(testAddress2);
    });

    it("should return a copy, not references", async () => {
      await initializePaymentStatus(testAddress1);
      
      const allStatuses = await getAllPaymentStatuses();
      allStatuses[0].status = PaymentStatus.ERROR;
      
      // Original should not be affected
      const status = await getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.AWAITING_PAYMENT);
    });
  });

  describe("getStoreStats", () => {
    it("should return correct statistics", async () => {
      await initializePaymentStatus(testAddress1);
      await initializePaymentStatus(testAddress2);
      await updatePaymentStatus(
        testAddress2,
        PaymentStatus.PAYMENT_DETECTED,
        testTransactionId
      );

      const stats = await getStoreStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.statusCounts[PaymentStatus.AWAITING_PAYMENT]).toBe(1);
      expect(stats.statusCounts[PaymentStatus.PAYMENT_DETECTED]).toBe(1);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it("should handle empty store", async () => {
      const stats = await getStoreStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.statusCounts).toEqual({});
      expect(stats.oldestEntry).toBeUndefined();
      expect(stats.newestEntry).toBeUndefined();
    });
  });

  describe("cleanupOldEntries", () => {
    it("should remove old entries", async () => {
      await initializePaymentStatus(testAddress1);
      
      // Wait to create a time difference
      await new Promise(resolve => setTimeout(resolve, 100));
      await initializePaymentStatus(testAddress2);
      
      // Cleanup entries older than 50ms
      const removed = await cleanupOldEntries(50);
      
      expect(removed).toBe(1);
      expect(await hasPaymentStatus(testAddress1)).toBe(false);
      expect(await hasPaymentStatus(testAddress2)).toBe(true);
    });

    it("should not remove recent entries", async () => {
      await initializePaymentStatus(testAddress1);
      await initializePaymentStatus(testAddress2);
      
      // Cleanup entries older than 1 hour
      const removed = await cleanupOldEntries(3600000);
      
      expect(removed).toBe(0);
      expect(await hasPaymentStatus(testAddress1)).toBe(true);
      expect(await hasPaymentStatus(testAddress2)).toBe(true);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle full payment lifecycle", async () => {
      // 1. Initialize payment request
      await initializePaymentStatus(testAddress1, 0.001);
      
      let status = await getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.AWAITING_PAYMENT);

      // 2. Payment detected (0 confirmations)
      await updatePaymentStatus(
        testAddress1,
        PaymentStatus.PAYMENT_DETECTED,
        testTransactionId,
        0,
        100000,
        85
      );
      
      status = await getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect(status?.confirmations).toBe(0);

      // 3. Payment confirmed (1 confirmation)
      await updatePaymentStatus(
        testAddress1,
        PaymentStatus.CONFIRMED,
        testTransactionId,
        1,
        100000,
        100
      );
      
      status = await getPaymentStatus(testAddress1);
      expect(status?.status).toBe(PaymentStatus.CONFIRMED);
      expect(status?.confirmations).toBe(1);
    });

    it("should handle multiple concurrent payments", async () => {
      const addresses = [
        "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
        "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
        "tb1q34aq5drkt5yvlg4xddngju8qmvk9m2ukkmqjc7"
      ];

      // Initialize multiple payments
      for (const addr of addresses) {
        await initializePaymentStatus(addr);
      }

      // Update some to different statuses
      await updatePaymentStatus(
        addresses[0],
        PaymentStatus.PAYMENT_DETECTED,
        "tx1",
        0
      );
      await updatePaymentStatus(
        addresses[1],
        PaymentStatus.CONFIRMED,
        "tx2",
        2
      );

      // Verify each has correct status
      expect((await getPaymentStatus(addresses[0]))?.status).toBe(PaymentStatus.PAYMENT_DETECTED);
      expect((await getPaymentStatus(addresses[1]))?.status).toBe(PaymentStatus.CONFIRMED);
      expect((await getPaymentStatus(addresses[2]))?.status).toBe(PaymentStatus.AWAITING_PAYMENT);

      // Check stats
      const stats = await getStoreStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.statusCounts[PaymentStatus.AWAITING_PAYMENT]).toBe(1);
      expect(stats.statusCounts[PaymentStatus.PAYMENT_DETECTED]).toBe(1);
      expect(stats.statusCounts[PaymentStatus.CONFIRMED]).toBe(1);
    });
  });
});