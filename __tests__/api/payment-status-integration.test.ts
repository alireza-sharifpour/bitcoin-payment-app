/**
 * Integration tests for payment status API route with actual store
 * 
 * Tests the integration between the API endpoint and the real payment status store
 * for Task 5.2.3: Create status retrieval endpoint
 */

import { NextRequest } from "next/server";
import { GET } from "@/app/api/payment-status/[address]/route";
import {
  initializePaymentStatus,
  updatePaymentStatus,
  clearAllPaymentStatuses,
} from "@/lib/store/payment-status";
import { PaymentStatus } from "@/types";

// Don't mock the store - we want to test real integration
describe("Payment Status API Route - Integration Tests", () => {
  const testAddress = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
  const testTransactionHash = "d5f9b0c9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1";

  beforeEach(async () => {
    // Clear the store before each test
    await clearAllPaymentStatuses();
  });

  afterEach(async () => {
    // Clean up after each test
    await clearAllPaymentStatuses();
  });

  it("should integrate correctly with the payment status store", async () => {
    // Initialize a payment status
    await initializePaymentStatus(testAddress, 0.001);

    // Make API request
    const request = new NextRequest(
      `http://localhost:3000/api/payment-status/${testAddress}`
    );
    const response = await GET(request, {
      params: Promise.resolve({ address: testAddress }),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe(PaymentStatus.AWAITING_PAYMENT);
    expect(data.confirmations).toBeUndefined();
    expect(data.transactionId).toBeUndefined();
    expect(data.lastUpdated).toBeDefined();
  });

  it("should reflect store updates in API responses", async () => {
    // Initialize payment
    await initializePaymentStatus(testAddress, 0.001);

    // Get initial status
    let request = new NextRequest(
      `http://localhost:3000/api/payment-status/${testAddress}`
    );
    let response = await GET(request, {
      params: Promise.resolve({ address: testAddress }),
    });
    let data = await response.json();
    
    expect(data.status).toBe(PaymentStatus.AWAITING_PAYMENT);

    // Update status in store (simulating webhook update)
    await updatePaymentStatus(
      testAddress,
      PaymentStatus.PAYMENT_DETECTED,
      testTransactionHash,
      0,
      100000, // 0.001 BTC in satoshis
      0.95
    );

    // Get updated status
    request = new NextRequest(
      `http://localhost:3000/api/payment-status/${testAddress}`
    );
    response = await GET(request, {
      params: Promise.resolve({ address: testAddress }),
    });
    data = await response.json();
    
    expect(data.status).toBe(PaymentStatus.PAYMENT_DETECTED);
    expect(data.confirmations).toBe(0);
    expect(data.transactionId).toBe(testTransactionHash);

    // Update to confirmed
    await updatePaymentStatus(
      testAddress,
      PaymentStatus.CONFIRMED,
      testTransactionHash,
      3,
      100000
    );

    // Get confirmed status
    request = new NextRequest(
      `http://localhost:3000/api/payment-status/${testAddress}`
    );
    response = await GET(request, {
      params: Promise.resolve({ address: testAddress }),
    });
    data = await response.json();
    
    expect(data.status).toBe(PaymentStatus.CONFIRMED);
    expect(data.confirmations).toBe(3);
    expect(data.transactionId).toBe(testTransactionHash);
  });

  it("should handle double-spend error scenarios", async () => {
    // Initialize payment
    await initializePaymentStatus(testAddress, 0.001);

    // Update with double-spend error
    await updatePaymentStatus(
      testAddress,
      PaymentStatus.ERROR,
      testTransactionHash,
      0,
      100000,
      0,
      true // isDoubleSpend
    );

    const request = new NextRequest(
      `http://localhost:3000/api/payment-status/${testAddress}`
    );
    const response = await GET(request, {
      params: Promise.resolve({ address: testAddress }),
    });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe(PaymentStatus.ERROR);
    expect(data.errorMessage).toBe("Double spend detected");
    expect(data.transactionId).toBe(testTransactionHash);
  });

  it("should return 404 for addresses not in the store", async () => {
    const nonExistentAddress = "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7";
    
    const request = new NextRequest(
      `http://localhost:3000/api/payment-status/${nonExistentAddress}`
    );
    const response = await GET(request, {
      params: Promise.resolve({ address: nonExistentAddress }),
    });
    
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe("Payment status not found for the specified address");
  });

  it("should handle multiple concurrent requests", async () => {
    // Initialize multiple payment statuses
    const addresses = [
      "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
      "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
      "n2eMqTT929pb1RDNuqEnxdaLau1rxy3efi"
    ];

    // Initialize all addresses
    for (const [index, addr] of addresses.entries()) {
      await initializePaymentStatus(addr, 0.001 * (index + 1));
    }

    // Update some statuses
    await updatePaymentStatus(
      addresses[0],
      PaymentStatus.PAYMENT_DETECTED,
      "tx1",
      0,
      100000
    );
    
    await updatePaymentStatus(
      addresses[1],
      PaymentStatus.CONFIRMED,
      "tx2",
      6,
      200000
    );

    // Make concurrent requests
    const requests = addresses.map(addr => {
      const request = new NextRequest(
        `http://localhost:3000/api/payment-status/${addr}`
      );
      return GET(request, { params: Promise.resolve({ address: addr }) });
    });

    const responses = await Promise.all(requests);
    const data = await Promise.all(responses.map(r => r.json()));

    // Verify responses
    expect(responses[0].status).toBe(200);
    expect(data[0].status).toBe(PaymentStatus.PAYMENT_DETECTED);
    expect(data[0].confirmations).toBe(0);

    expect(responses[1].status).toBe(200);
    expect(data[1].status).toBe(PaymentStatus.CONFIRMED);
    expect(data[1].confirmations).toBe(6);

    expect(responses[2].status).toBe(200);
    expect(data[2].status).toBe(PaymentStatus.AWAITING_PAYMENT);
  });

  it("should preserve lastUpdated timestamp from store", async () => {
    const beforeInit = Date.now();
    await initializePaymentStatus(testAddress, 0.001);
    const afterInit = Date.now();

    const request = new NextRequest(
      `http://localhost:3000/api/payment-status/${testAddress}`
    );
    const response = await GET(request, {
      params: Promise.resolve({ address: testAddress }),
    });
    const data = await response.json();
    
    expect(data.lastUpdated).toBeGreaterThanOrEqual(beforeInit);
    expect(data.lastUpdated).toBeLessThanOrEqual(afterInit);

    // Wait a bit then update
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const beforeUpdate = Date.now();
    await updatePaymentStatus(
      testAddress,
      PaymentStatus.PAYMENT_DETECTED,
      testTransactionHash,
      0,
      100000
    );
    const afterUpdate = Date.now();

    const response2 = await GET(request, {
      params: Promise.resolve({ address: testAddress }),
    });
    const data2 = await response2.json();
    
    expect(data2.lastUpdated).toBeGreaterThan(data.lastUpdated);
    expect(data2.lastUpdated).toBeGreaterThanOrEqual(beforeUpdate);
    expect(data2.lastUpdated).toBeLessThanOrEqual(afterUpdate);
  });
});