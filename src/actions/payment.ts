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
import { registerWebhook } from "@/lib/blockcypher/client";

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
 * 4. Registers webhook with Blockcypher (Task 3.2.3 - will be implemented)
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

    // Task 3.2.3 - Implement webhook registration
    let webhookId: string | undefined = undefined; // Initialize webhookId
    try {
      const apiToken = process.env.BLOCKCYPHER_API_TOKEN;
      if (!apiToken) {
        console.warn("BLOCKCYPHER_API_TOKEN is not set. Skipping webhook registration.");
        // Optionally, you could return an error or a specific status if the token is essential
        // For now, we'll proceed without webhook registration if token is missing
      } else {
        // Construct the absolute callback URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (!appUrl) {
          console.warn("NEXT_PUBLIC_APP_URL is not set. Skipping webhook registration as absolute callback URL cannot be constructed.");
        } else {
          const callbackUrl = `${appUrl}/api/webhook/payment-update`;
          // Register webhook with Blockcypher
          // Using default eventType "unconfirmed-tx"
          webhookId = await registerWebhook(address, callbackUrl, apiToken);
          console.log(`Webhook registered for address ${address} with ID: ${webhookId}`);
        }
      }
    } catch (webhookError) {
      console.error("Webhook registration failed:", webhookError);
      // Graceful fallback: log the error and continue without webhookId
      // The payment request itself can still be successful.
      // Depending on requirements, you might want to set a specific error status for the client.
      // For now, webhookId will remain undefined.
    }

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
        webhookId: webhookId,
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
