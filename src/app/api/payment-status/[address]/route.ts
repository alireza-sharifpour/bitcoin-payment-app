/**
 * Payment Status API Route
 *
 * Task 5.2.3: Create status retrieval endpoint
 *
 * This API route provides a GET endpoint at `/api/payment-status/[address]`
 * that returns the current payment status for a specific Bitcoin address.
 * The status is retrieved from the in-memory store that gets updated by
 * webhook events from BlockCypher.
 *
 * Key features:
 * - GET endpoint for retrieving payment status by address
 * - Returns current status from in-memory store
 * - Client-safe response (no sensitive data)
 * - Proper error handling for invalid or non-existent addresses
 *
 * Usage:
 * - Client polls this endpoint via TanStack Query
 * - Returns status object with payment information
 * - 404 if address not found, 200 with status if found
 *
 * Response format:
 * {
 *   status: 'AWAITING_PAYMENT' | 'PAYMENT_DETECTED' | 'CONFIRMED' | 'ERROR',
 *   confirmations?: number,
 *   transactionId?: string,
 *   errorMessage?: string,
 *   lastUpdated?: number
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/store/payment-status";
import { isValidTestnetAddress } from "@/lib/bitcoin/wallet";
import type { PaymentStatusResponse } from "../../../../../types";

/**
 * GET handler for retrieving payment status
 *
 * Endpoint: GET /api/payment-status/[address]
 *
 * This endpoint is designed to be polled by the client using TanStack Query
 * to monitor payment status updates. The status is updated by webhook events
 * from BlockCypher and stored in our in-memory store.
 *
 * @param request - Next.js request object
 * @param params - Route params containing the Bitcoin address
 * @returns NextResponse with payment status or error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  try {
    const { address } = await params;

    // Validate address parameter exists
    if (!address) {
      console.error("[PAYMENT_STATUS_API] Missing address parameter");
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    // Validate Bitcoin testnet address format using the robust wallet validation
    if (!isValidTestnetAddress(address)) {
      console.error(
        "[PAYMENT_STATUS_API] Invalid Bitcoin testnet address format:",
        address
      );
      return NextResponse.json(
        { error: "Invalid Bitcoin testnet address format" },
        { status: 400 }
      );
    }

    // Retrieve payment status from file-based store
    const paymentStatus = await getPaymentStatus(address);

    if (!paymentStatus) {
      console.log(
        "[PAYMENT_STATUS_API] Payment status not found for address:",
        address
      );
      return NextResponse.json(
        { error: "Payment status not found for the specified address" },
        { status: 404 }
      );
    }

    // Log successful retrieval for monitoring
    console.log(
      "[PAYMENT_STATUS_API] Retrieved payment status for address:",
      address,
      {
        status: paymentStatus.status,
        confirmations: paymentStatus.confirmations,
        hasTransaction: !!paymentStatus.transactionId,
      }
    );

    // Return the payment status
    // The response type matches PaymentStatusResponse interface
    const response: PaymentStatusResponse = {
      status: paymentStatus.status,
      confirmations: paymentStatus.confirmations,
      transactionId: paymentStatus.transactionId,
      errorMessage: paymentStatus.errorMessage,
      lastUpdated: paymentStatus.lastUpdated,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        // Allow client-side caching for a short period
        // Since this is polled frequently, we allow brief caching
        "Cache-Control": "public, max-age=2",
      },
    });
  } catch (error) {
    console.error("[PAYMENT_STATUS_API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error while retrieving payment status" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 *
 * Allows the endpoint to be called from browser clients
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Handle unsupported HTTP methods
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "This endpoint only accepts GET requests",
    },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "This endpoint only accepts GET requests",
    },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "This endpoint only accepts GET requests",
    },
    { status: 405 }
  );
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "This endpoint only accepts GET requests",
    },
    { status: 405 }
  );
}
