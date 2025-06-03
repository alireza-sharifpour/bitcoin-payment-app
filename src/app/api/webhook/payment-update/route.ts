/**
 * Webhook API Route for Payment Updates
 *
 * This API route handles incoming webhook notifications from BlockCypher
 * when payment transactions are detected on the Bitcoin testnet.
 *
 * Task 5.1.1: Create webhook API route structure
 * - Implements basic POST handler
 * - Validates incoming webhook payload
 * - Responds to BlockCypher webhook requests
 * - Includes proper error handling and logging
 *
 * Task 5.1.3: Parse transaction data from webhook
 * - Extract transaction hash, confirmations, and address
 * - Map BlockCypher events to internal payment status types
 * - Validate parsed transaction data
 * - Prepare data for payment status updates
 *
 * Task 5.2.2: Update payment status in store
 * - Process unconfirmed-tx and confirmed-tx events
 * - Update payment status in memory store
 * - Handle double-spend and error scenarios
 *
 * Security considerations:
 * - Validates webhook payload structure
 * - Logs all webhook events for debugging
 * - Returns appropriate HTTP status codes
 * - Graceful error handling
 */

import { NextRequest, NextResponse } from "next/server";
import { BlockcypherWebhookPayloadSchema } from "@/lib/validation/webhook";
import {
  parseWebhookTransaction,
  isValidTransaction,
} from "@/lib/utils/webhook-parser";
import { updatePaymentStatus } from "@/lib/store/payment-status";

/**
 * POST handler for webhook payment updates
 *
 * Receives webhook notifications from BlockCypher when:
 * - Unconfirmed transactions are detected (0 confirmations)
 * - Transactions receive confirmations
 * - Double-spend attempts are detected
 *
 * @param request - Next.js request object containing webhook payload
 * @returns NextResponse with appropriate status and message
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error("[WEBHOOK_ERROR] Error parsing webhook JSON payload:", error);
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // Log key webhook information
  console.log("[WEBHOOK_DEBUG] Webhook received for transaction:", payload.hash);

  // Get event type from headers (BlockCypher sends it as x-eventtype)
  const eventType = req.headers.get('x-eventtype');
  const webhookId = req.headers.get('x-eventid');
  
  if (!eventType) {
    console.error("[WEBHOOK_ERROR] Missing x-eventtype header");
    return NextResponse.json(
      { error: "Missing event type header" },
      { status: 400 }
    );
  }

  // Validate supported event types
  const supportedEvents = ['unconfirmed-tx', 'confirmed-tx', 'tx-confirmation', 'new-block', 'double-spend-tx'];
  if (!supportedEvents.includes(eventType)) {
    console.error("[WEBHOOK_ERROR] Unsupported event type:", eventType);
    return NextResponse.json(
      { error: `Unsupported event type: ${eventType}` },
      { status: 400 }
    );
  }

  const validationResult = BlockcypherWebhookPayloadSchema.safeParse(payload);

  if (!validationResult.success) {
    console.error(
      "[WEBHOOK_ERROR] Webhook payload validation failed:",
      validationResult.error.errors
    );
    return NextResponse.json(
      {
        error: "Invalid payload structure",
        details: validationResult.error.format(),
      },
      { status: 400 }
    );
  }

  const validatedPayload = validationResult.data;

  // ========================================================================
  // Task 5.1.3: Parse transaction data from webhook
  // ========================================================================

  console.log(
    "[WEBHOOK_INFO] Processing webhook for event:",
    eventType,
    "tx_hash:",
    validatedPayload.hash,
    "webhook_id:",
    webhookId
  );

  // Parse transaction data from the validated webhook payload
  const parsedTransaction = parseWebhookTransaction(validatedPayload, eventType);

  if (!parsedTransaction) {
    console.error(
      "[WEBHOOK_ERROR] Could not parse transaction data from webhook payload"
    );
    return NextResponse.json(
      { error: "Unable to parse transaction data" },
      { status: 400 }
    );
  }

  // Validate the parsed transaction data
  if (!isValidTransaction(parsedTransaction)) {
    console.error(
      "[WEBHOOK_ERROR] Parsed transaction data is invalid:",
      parsedTransaction
    );
    return NextResponse.json(
      { error: "Invalid transaction data" },
      { status: 400 }
    );
  }

  console.log("[WEBHOOK_SUCCESS] Successfully parsed transaction data:", {
    transactionHash: parsedTransaction.transactionHash,
    address: parsedTransaction.address,
    status: parsedTransaction.status,
    confirmations: parsedTransaction.confirmations,
    amount: parsedTransaction.totalAmount,
    isDoubleSpend: parsedTransaction.isDoubleSpend,
  });

  // ========================================================================
  // Task 5.2.2: Update payment status in store
  // ========================================================================

  try {
    // Update the payment status in our file-based store
    await updatePaymentStatus(
      parsedTransaction.address,
      parsedTransaction.status,
      parsedTransaction.transactionHash,
      parsedTransaction.confirmations,
      parsedTransaction.totalAmount,
      parsedTransaction.confidence,
      parsedTransaction.isDoubleSpend
    );

    console.log("[WEBHOOK_SUCCESS] Payment status updated in store:", {
      address: parsedTransaction.address,
      status: parsedTransaction.status,
      confirmations: parsedTransaction.confirmations,
      transactionHash: parsedTransaction.transactionHash,
    });
  } catch (error) {
    console.error("[WEBHOOK_ERROR] Failed to update payment status:", error);
    // We log the error but don't fail the webhook response
    // BlockCypher should still receive a 200 OK to prevent retries
    // The error is logged for debugging purposes
  }

  console.log("[WEBHOOK_SUCCESS] Webhook processed successfully:", {
    event: eventType,
    transactionHash: parsedTransaction.transactionHash,
    address: parsedTransaction.address,
    status: parsedTransaction.status,
  });

  return NextResponse.json(
    {
      message: "Webhook processed successfully",
      transactionHash: parsedTransaction.transactionHash,
      status: parsedTransaction.status,
      confirmations: parsedTransaction.confirmations,
    },
    { status: 200 }
  );
}

/**
 * GET handler for webhook endpoint health check
 *
 * This endpoint can be used to verify the webhook URL is accessible
 * and the API route is properly configured.
 *
 * @param request - Next.js request object
 * @returns NextResponse with endpoint status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log(
    `[WEBHOOK] Health check request received at ${new Date().toISOString()} from URL: ${
      request.url
    }`
  );

  return NextResponse.json(
    {
      status: "healthy",
      message: "Webhook endpoint is operational",
      timestamp: new Date().toISOString(),
      endpoint: "/api/webhook/payment-update",
      methods: ["POST", "GET"],
      description:
        "This endpoint receives BlockCypher webhook notifications for Bitcoin testnet payment updates",
    },
    { status: 200 }
  );
}

/**
 * Handle unsupported HTTP methods
 *
 * BlockCypher webhooks only use POST, but this provides clear error messages
 * for any other HTTP methods that might be attempted.
 */
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message:
        "This endpoint only accepts POST requests for webhooks and GET for health checks",
    },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message:
        "This endpoint only accepts POST requests for webhooks and GET for health checks",
    },
    { status: 405 }
  );
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message:
        "This endpoint only accepts POST requests for webhooks and GET for health checks",
    },
    { status: 405 }
  );
}
