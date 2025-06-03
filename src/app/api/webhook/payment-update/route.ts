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
 * Security considerations:
 * - Validates webhook payload structure
 * - Logs all webhook events for debugging
 * - Returns appropriate HTTP status codes
 * - Graceful error handling
 */

import { NextRequest, NextResponse } from "next/server";
import { BlockcypherWebhookPayloadSchema } from "@/lib/validation/webhook";

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

  const expectedToken = process.env.BLOCKCYPHER_TOKEN;

  if (!expectedToken) {
    console.error(
      "[WEBHOOK_ERROR] BLOCKCYPHER_TOKEN is not set in environment variables."
    );
    // This is a server configuration error and should be addressed by the administrator.
    return NextResponse.json(
      { error: "Internal server error: Webhook configuration missing" },
      { status: 500 }
    );
  }

  if (validatedPayload.token !== expectedToken) {
    console.warn(
      "[WEBHOOK_WARN] Webhook token mismatch. Unauthorized access attempt."
    );
    return NextResponse.json(
      { error: "Unauthorized: Invalid token" },
      { status: 403 }
    );
  }

  // Payload structure and authenticity (token) are now validated.
  // The next step (Task 5.1.3) will be to parse the transaction data from validatedPayload
  // and then (Task 5.2.2) update the payment status in the in-memory store.

  // Example of what might happen next (pseudo-code for future tasks):
  // const { event, hash, confirmations, address, outputs } = validatedPayload;
  // const paymentAddress = address; // Or derived from outputs if not directly available
  // if (paymentAddress) {
  //   updatePaymentStatusInStore(paymentAddress, validatedPayload);
  // } else {
  //   console.warn('[WEBHOOK_WARN] Could not determine payment address from webhook.');
  // }

  console.log(
    "[WEBHOOK_INFO] Webhook received and validated successfully for event:",
    validatedPayload.event,
    "tx_hash:",
    validatedPayload.hash
  );
  return NextResponse.json(
    { message: "Webhook received and validated" },
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
