/**
 * Blockcypher API Client for Bitcoin Testnet
 *
 * This module provides a secure HTTP client for interacting with the Blockcypher API.
 * It focuses on webhook registration functionality for payment notifications.
 *
 * Security Features:
 * - API token authentication
 * - Input validation
 * - Proper error handling
 * - Rate limiting awareness
 *
 * @see https://www.blockcypher.com/dev/bitcoin/
 */

import { isValidTestnetAddress } from "@/lib/bitcoin/wallet";
import type { WebhookRegistration } from "@/types/webhook";

// Environment validation
const BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN;

if (!BLOCKCYPHER_TOKEN) {
  throw new Error(
    "BLOCKCYPHER_TOKEN environment variable is required for Blockcypher API access"
  );
}

/**
 * Supported Blockcypher networks
 */
export enum BlockcypherNetwork {
  BITCOIN_MAIN = "btc/main",
  BITCOIN_TESTNET = "btc/test3",
  BLOCKCYPHER_TEST = "bcy/test",
}

/**
 * Base Blockcypher API configuration
 */
export const BLOCKCYPHER_CONFIG = {
  baseUrl: "https://api.blockcypher.com/v1",
  defaultNetwork: BlockcypherNetwork.BITCOIN_TESTNET,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

/**
 * Webhook event types supported by Blockcypher
 */
export enum WebhookEventType {
  UNCONFIRMED_TX = "unconfirmed-tx",
  CONFIRMED_TX = "confirmed-tx",
  TX_CONFIRMATION = "tx-confirmation",
  NEW_BLOCK = "new-block",
  DOUBLE_SPEND_TX = "double-spend-tx",
}

/**
 * Webhook registration request payload
 */
export interface WebhookRegistrationRequest {
  /** Event type to listen for */
  event: WebhookEventType;
  /** Bitcoin address to monitor */
  address: string;
  /** Callback URL for webhook notifications */
  url: string;
  /** Number of confirmations for tx-confirmation events (1-10) */
  confirmations?: number;
}

/**
 * Extended webhook registration response from Blockcypher API
 * Extends the base WebhookRegistration with additional API-specific fields
 */
export interface WebhookRegistrationResponse extends WebhookRegistration {
  /** API token used */
  token: string;
  /** Callback errors count */
  callback_errors: number;
}

/**
 * Webhook deletion response
 */
export interface WebhookDeletionResponse {
  /** Success indicator */
  success: boolean;
  /** Optional message */
  message?: string;
}

/**
 * Blockcypher API error response
 */
export interface BlockcypherError {
  /** Error message */
  error: string;
  /** Error details */
  errors?: Array<{ error: string }>;
}

/**
 * Custom error class for Blockcypher API errors
 */
export class BlockcypherApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: BlockcypherError
  ) {
    super(message);
    this.name = "BlockcypherApiError";
  }
}

/**
 * Rate limiting error
 */
export class BlockcypherRateLimitError extends BlockcypherApiError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429);
    this.name = "BlockcypherRateLimitError";
  }
}

/**
 * Validates webhook URL format
 */
function validateWebhookUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" && parsedUrl.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Implements exponential backoff delay
 */
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Blockcypher API client for Bitcoin testnet operations
 */
export class BlockcypherClient {
  private readonly baseUrl: string;
  private readonly network: BlockcypherNetwork;
  private readonly token: string;

  constructor(
    network: BlockcypherNetwork = BLOCKCYPHER_CONFIG.defaultNetwork,
    token: string = BLOCKCYPHER_TOKEN || ""
  ) {
    if (!token) {
      throw new Error("Blockcypher API token is required");
    }

    this.baseUrl = BLOCKCYPHER_CONFIG.baseUrl;
    this.network = network;
    this.token = token;
  }

  /**
   * Constructs the full API URL for a given endpoint
   */
  private buildUrl(endpoint: string): string {
    const url = `${this.baseUrl}/${this.network}/${endpoint}`;
    const separator = endpoint.includes("?") ? "&" : "?";
    return `${url}${separator}token=${this.token}`;
  }

  /**
   * Makes HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    let lastError: Error | undefined;

    for (
      let attempt = 0;
      attempt < BLOCKCYPHER_CONFIG.retryAttempts;
      attempt++
    ) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          BLOCKCYPHER_CONFIG.timeout
        );

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Bitcoin-Payment-App/1.0.0",
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        // Ensure we have a valid response object
        if (!response) {
          throw new Error("No response received from server");
        }

        // Handle rate limiting
        if (response.status === 429) {
          throw new BlockcypherRateLimitError();
        }

        // Parse response
        const responseText = await response.text();
        let responseData: T | BlockcypherError;

        try {
          responseData = JSON.parse(responseText);
        } catch {
          throw new BlockcypherApiError(
            `Invalid JSON response: ${responseText}`,
            response.status
          );
        }

        // Handle API errors
        if (!response.ok) {
          const errorData = responseData as BlockcypherError;
          throw new BlockcypherApiError(
            errorData.error ||
              `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData
          );
        }

        return responseData as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on authentication errors or client errors (4xx)
        if (error instanceof BlockcypherApiError && error.statusCode) {
          if (
            error.statusCode >= 400 &&
            error.statusCode < 500 &&
            error.statusCode !== 429
          ) {
            throw error;
          }
        }

        // Don't retry on the last attempt
        if (attempt === BLOCKCYPHER_CONFIG.retryAttempts - 1) {
          break;
        }

        // Calculate delay for exponential backoff
        const delay = calculateBackoffDelay(
          attempt,
          BLOCKCYPHER_CONFIG.retryDelay
        );
        await sleep(delay);
      }
    }

    // This should never happen due to the token validation at module level,
    // but we need to handle the case for TypeScript
    if (!lastError) {
      throw new Error(
        "Unexpected error: no error recorded after all retry attempts failed"
      );
    }

    throw lastError;
  }

  /**
   * Tests connection to Blockcypher API
   *
   * @returns Promise<boolean> - True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest<{ name: string }>("");
      return true;
    } catch (error) {
      console.error("Blockcypher connection test failed:", error);
      return false;
    }
  }

  /**
   * Registers a webhook for address monitoring
   *
   * @param request - Webhook registration request
   * @returns Promise<WebhookRegistrationResponse> - Webhook registration details
   *
   * @example
   * ```typescript
   * const client = new BlockcypherClient();
   * const webhook = await client.registerWebhook({
   *   event: WebhookEventType.UNCONFIRMED_TX,
   *   address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
   *   url: 'https://yourapp.com/webhook/payment-update'
   * });
   * console.log('Webhook ID:', webhook.id);
   * ```
   */
  async registerWebhook(
    request: WebhookRegistrationRequest
  ): Promise<WebhookRegistrationResponse> {
    // Validate input parameters using existing wallet validation function
    if (!request.address || !isValidTestnetAddress(request.address)) {
      throw new Error(
        "Invalid Bitcoin testnet address. Address must be a valid testnet address"
      );
    }

    if (!request.url || !validateWebhookUrl(request.url)) {
      throw new Error("Invalid webhook URL. Must be a valid HTTPS URL");
    }

    if (!Object.values(WebhookEventType).includes(request.event)) {
      throw new Error(`Invalid event type: ${request.event}`);
    }

    if (request.confirmations !== undefined) {
      if (request.confirmations < 1 || request.confirmations > 10) {
        throw new Error("Confirmations must be between 1 and 10");
      }
    }

    const payload = {
      event: request.event,
      address: request.address,
      url: request.url,
      ...(request.confirmations && { confirmations: request.confirmations }),
    };

    return this.makeRequest<WebhookRegistrationResponse>("hooks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Lists all registered webhooks for the current token
   *
   * @returns Promise<WebhookRegistrationResponse[]> - Array of webhook registrations
   */
  async listWebhooks(): Promise<WebhookRegistrationResponse[]> {
    return this.makeRequest<WebhookRegistrationResponse[]>("hooks");
  }

  /**
   * Retrieves details for a specific webhook
   *
   * @param webhookId - The webhook ID
   * @returns Promise<WebhookRegistrationResponse> - Webhook details
   */
  async getWebhook(webhookId: string): Promise<WebhookRegistrationResponse> {
    if (!webhookId || typeof webhookId !== "string") {
      throw new Error("Webhook ID is required and must be a string");
    }

    return this.makeRequest<WebhookRegistrationResponse>(`hooks/${webhookId}`);
  }

  /**
   * Deletes a registered webhook
   *
   * @param webhookId - The webhook ID to delete
   * @returns Promise<WebhookDeletionResponse> - Deletion confirmation
   */
  async deleteWebhook(webhookId: string): Promise<WebhookDeletionResponse> {
    if (!webhookId || typeof webhookId !== "string") {
      throw new Error("Webhook ID is required and must be a string");
    }

    try {
      await this.makeRequest<void>(`hooks/${webhookId}`, {
        method: "DELETE",
      });

      return { success: true, message: "Webhook deleted successfully" };
    } catch (error) {
      if (error instanceof BlockcypherApiError && error.statusCode === 404) {
        return {
          success: true,
          message: "Webhook not found (already deleted)",
        };
      }
      throw error;
    }
  }

  /**
   * Gets the current network configuration
   */
  getNetwork(): BlockcypherNetwork {
    return this.network;
  }

  /**
   * Gets the base URL being used
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

/**
 * Default Blockcypher client instance using Bitcoin testnet
 */
export const blockcypherClient = new BlockcypherClient();

/**
 * Utility function to create a webhook registration for payment monitoring
 *
 * @param address - Bitcoin testnet address to monitor
 * @param callbackUrl - HTTPS URL to receive webhook notifications
 * @returns Promise<string> - Webhook ID for later reference
 */
export async function registerPaymentWebhook(
  address: string,
  callbackUrl: string
): Promise<string> {
  const webhook = await blockcypherClient.registerWebhook({
    event: WebhookEventType.UNCONFIRMED_TX,
    address,
    url: callbackUrl,
  });

  return webhook.id;
}

/**
 * Task 3.2.2: Implement webhook registration function for payment updates
 *
 * Registers a webhook for a specific Bitcoin testnet address that automatically
 * points to the application's payment update endpoint. This is a convenience
 * function that constructs the webhook URL from environment variables.
 *
 * @param address - Bitcoin testnet address to monitor for transactions
 * @returns Promise<string> - Webhook ID for later reference
 * @throws {Error} - When app URL is not configured or webhook registration fails
 *
 * @example
 * ```typescript
 * import { registerAddressWebhook } from "@/lib/api/blockcypher";
 *
 * // Register webhook for payment monitoring
 * const webhookId = await registerAddressWebhook("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
 * console.log("Webhook registered with ID:", webhookId);
 * ```
 */
export async function registerAddressWebhook(address: string): Promise<string> {
  // Validate the address first
  if (!address || !isValidTestnetAddress(address)) {
    throw new Error(
      "Invalid Bitcoin testnet address. Address must be a valid testnet address"
    );
  }

  // Get the application base URL from environment variables
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

  if (!baseUrl) {
    throw new Error(
      "Application URL not configured. Set NEXT_PUBLIC_APP_URL or VERCEL_URL environment variable."
    );
  }

  // Construct the webhook endpoint URL
  // Ensure HTTPS protocol (required by Blockcypher)
  const webhookUrl = `${
    baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
  }/api/webhook/payment-update`;

  // Validate the constructed URL
  if (!validateWebhookUrl(webhookUrl)) {
    throw new Error(
      `Invalid webhook URL constructed: ${webhookUrl}. Must be a valid HTTPS URL.`
    );
  }

  // Register the webhook with Blockcypher
  try {
    const webhook = await blockcypherClient.registerWebhook({
      event: WebhookEventType.UNCONFIRMED_TX,
      address,
      url: webhookUrl,
    });

    return webhook.id;
  } catch (error) {
    // Re-throw with more context for debugging
    throw new Error(
      `Failed to register webhook for address ${address} at ${webhookUrl}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
