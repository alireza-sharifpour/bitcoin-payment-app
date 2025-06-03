/**
 * Payment Server Actions
 *
 * This module contains Server Actions for handling Bitcoin payment requests.
 * Server Actions provide a secure way to handle form submissions and other
 * server-side operations in Next.js 15.
 *
 * SECURITY NOTE: These actions run on the server and can access sensitive
 * operations like wallet generation and external API calls.
 */

"use server";

import {
  paymentRequestSchema,
  generateBip21Uri,
} from "@/lib/validation/payment";
import { generateWalletAddress } from "@/lib/bitcoin/wallet";
import { registerPaymentWebhook } from "@/lib/api/blockcypher";
import { initializePaymentStatus } from "@/lib/store/payment-status";

/**
 * Server Action Response Types
 */
export type ServerActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type PaymentRequestData = {
  address: string;
  amount: number;
  paymentUri: string;
  requestTimestamp: Date;
  webhookId?: string;
};

export type CreatePaymentRequestResult = ServerActionResult<PaymentRequestData>;

/**
 * Creates a new Bitcoin testnet payment request
 *
 * This Server Action handles the complete payment request creation flow:
 * 1. Validates the form input (amount)
 * 2. Generates a new testnet address (Task 3.1.3 - ✅ IMPLEMENTED)
 * 3. Creates BIP21 payment URI (Task 3.1.4 - ✅ IMPLEMENTED)
 * 4. Registers webhook with Blockcypher (Task 3.2.3 - ✅ IMPLEMENTED)
 *
 * @param formData - Form data from the payment request form
 * @returns Promise<CreatePaymentRequestResult> - Structured response with payment details or error
 *
 * @example
 * // Usage in a React component:
 * import { createPaymentRequest } from "@/actions/payment";
 *
 * const handleSubmit = async (formData: FormData) => {
 *   const result = await createPaymentRequest(formData);
 *   if (result.success) {
 *     console.log("Payment request created:", result.data);
 *   } else {
 *     console.error("Error:", result.error);
 *   }
 * };
 *
 * @security This action runs on the server and will handle sensitive operations
 * like wallet generation. Private keys never leave the server.
 */
export async function createPaymentRequest(
  formData: FormData
): Promise<CreatePaymentRequestResult> {
  try {
    // Extract and validate form data
    const rawAmount = formData.get("amount");

    // Basic input validation
    if (!rawAmount || typeof rawAmount !== "string") {
      return {
        success: false,
        error: "Amount is required",
      };
    }

    // Validate using our payment request schema - let it handle all validation
    const validationResult = paymentRequestSchema.safeParse({
      amount: rawAmount.trim(),
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((err) => err.message)
        .join(", ");

      return {
        success: false,
        error: `Validation failed: ${errors}`,
      };
    }

    const { amount } = validationResult.data;

    // Task 3.1.3 - ✅ IMPLEMENTED: Generate wallet address using secure wallet service
    let address: string;
    try {
      address = generateWalletAddress();
    } catch (walletError) {
      console.error("Wallet address generation failed:", walletError);
      return {
        success: false,
        error: `Failed to generate payment address: ${
          walletError instanceof Error
            ? walletError.message
            : "Unknown wallet error"
        }`,
      };
    }

    // Task 3.1.4 - ✅ IMPLEMENTED: Generate BIP21 payment URI
    // Using generateBip21Uri function which implements the required generatePaymentURI(address, amount) functionality
    const paymentUri = generateBip21Uri(address, amount, "testnet");

    // Task 3.2.3 - ✅ IMPLEMENTED: Register webhook with Blockcypher
    let webhookId: string | undefined;
    try {
      // Get the webhook URL from environment or construct it
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
      if (!baseUrl) {
        console.warn(
          "No NEXT_PUBLIC_APP_URL or VERCEL_URL found - webhook registration will be skipped"
        );
        webhookId = undefined;
      } else {
        // Ensure HTTPS for webhook URL (required by Blockcypher)
        const webhookUrl = `${
          baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
        }/api/webhook/payment-update`;

        console.log(
          `Registering webhook for address ${address} at ${webhookUrl}`
        );

        webhookId = await registerPaymentWebhook(address, webhookUrl);
        console.log(`Webhook registered successfully with ID: ${webhookId}`);
      }
    } catch (webhookError) {
      // Log webhook registration failure but don't fail the entire request
      console.warn(
        "Webhook registration failed (continuing without webhook):",
        webhookError
      );
      webhookId = undefined;

      // Note: This is graceful degradation - the payment request still works
      // but users will need to check payment status manually rather than
      // receiving automatic webhook notifications
    }

    // Initialize payment status in the store
    initializePaymentStatus(address, amount, webhookId);

    // Create request timestamp
    const requestTimestamp = new Date();

    // Return successful response with payment details
    return {
      success: true,
      data: {
        address,
        amount,
        paymentUri,
        requestTimestamp,
        webhookId,
      },
    };
  } catch (error) {
    // Handle unexpected errors
    console.error("Error in createPaymentRequest:", error);

    return {
      success: false,
      error: `Failed to create payment request: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
