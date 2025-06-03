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
import {
  webhookPayloadSchema,
  type WebhookPayload,
} from "@/lib/validation/payment";

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
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Log incoming webhook request for debugging
    console.log(
      `[WEBHOOK] Received webhook request at ${new Date().toISOString()}`
    );
    console.log(`[WEBHOOK] Request URL: ${request.url}`);
    console.log(
      `[WEBHOOK] Request headers:`,
      Object.fromEntries(request.headers.entries())
    );

    // Parse the incoming JSON payload
    let payload: unknown;
    try {
      payload = await request.json();
      console.log(`[WEBHOOK] Raw payload:`, payload);
    } catch (parseError) {
      console.error(`[WEBHOOK] Failed to parse JSON payload:`, parseError);
      return NextResponse.json(
        {
          error: "Invalid JSON payload",
          message: "Request body must be valid JSON",
        },
        { status: 400 }
      );
    }

    // Validate the webhook payload structure
    let validatedPayload: WebhookPayload;
    try {
      validatedPayload = webhookPayloadSchema.parse(payload);
      console.log(`[WEBHOOK] Validated payload:`, validatedPayload);
    } catch (validationError) {
      console.error(`[WEBHOOK] Payload validation failed:`, validationError);
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          message: "Payload does not match expected webhook schema",
          details:
            validationError instanceof Error
              ? validationError.message
              : "Unknown validation error",
        },
        { status: 400 }
      );
    }

    // Log the validated webhook event details
    console.log(`[WEBHOOK] Processing webhook event:`, {
      event: validatedPayload.event,
      address: validatedPayload.address,
      hash: validatedPayload.hash,
      confirmations: validatedPayload.confirmations,
      value: validatedPayload.value,
      doubleSpend: validatedPayload.double_spend,
    });

    // TODO: In future tasks, this is where we'll:
    // - Update in-memory payment status store
    // - Trigger any necessary business logic
    // - Send notifications to connected clients
    // - Update database records

    // For Task 5.1.1, we just need to acknowledge the webhook
    console.log(
      `[WEBHOOK] Successfully processed webhook for address: ${validatedPayload.address}`
    );

    // Return success response to BlockCypher
    // BlockCypher expects a 2xx status code to consider the webhook delivered
    return NextResponse.json(
      {
        success: true,
        message: "Webhook received and processed successfully",
        timestamp: new Date().toISOString(),
        address: validatedPayload.address,
        event: validatedPayload.event,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle any unexpected errors
    console.error(`[WEBHOOK] Unexpected error processing webhook:`, error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred while processing the webhook",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
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
    `[WEBHOOK] Health check request received at ${new Date().toISOString()}`
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
