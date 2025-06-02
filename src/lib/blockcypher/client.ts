/**
 * Blockcypher API Client
 *
 * This module provides a client for interacting with the Blockcypher API,
 * specifically for webhook registration.
 */

const BLOCKCYPHER_API_BASE_URL = "https://api.blockcypher.com/v1";

export interface BlockcypherWebhook {
  id: string;
  event: string;
  address?: string;
  url?: string;
  token?: string;
  // Add any other relevant fields from the Blockcypher Event object
  // See: https://www.blockcypher.com/dev/bitcoin/#event-object
  hash?: string;
  wallet_name?: string;
  confirmations?: number;
  confidence?: number;
  script?: string;
  callback_errors?: number;
}

interface BlockcypherErrorResponse {
  error?: string;
  errors?: Array<{ error: string }>;
}

/**
 * Makes a POST request to the Blockcypher API.
 * @param apiPath - The API path (e.g., "/btc/test3/hooks")
 * @param data - The request payload
 * @param apiToken - The Blockcypher API token (optional, can be in data)
 * @returns Promise<R> - The JSON response from the API
 * @throws Error if the request fails or API returns an error
 */
async function post<T, R>(
  apiPath: string,
  data: T,
  apiToken?: string
): Promise<R> {
  const url = `${BLOCKCYPHER_API_BASE_URL}${apiPath}${apiToken ? `?token=${apiToken}` : ''}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `Blockcypher API request failed with status ${response.status}`;
      try {
        const errorBody: BlockcypherErrorResponse = await response.json();
        if (errorBody.error) {
          errorMessage += `: ${errorBody.error}`;
        } else if (errorBody.errors && errorBody.errors.length > 0) {
          errorMessage += `: ${errorBody.errors.map(e => e.error).join(", ")}`;
        }
      } catch (e) {
        // Ignore if error body cannot be parsed
      }
      throw new Error(errorMessage);
    }

    return await response.json() as R;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Blockcypher API request error: ${error.message}`);
    }
    throw new Error("An unknown error occurred during the Blockcypher API request");
  }
}

/**
 * Registers a webhook with Blockcypher for a given Bitcoin address.
 *
 * @param address - The Bitcoin address to monitor.
 * @param callbackUrl - The URL that Blockcypher will call when the event occurs.
 * @param apiToken - Your Blockcypher API token.
 * @param eventType - The type of event to subscribe to (defaults to "unconfirmed-tx").
 *                    Common types: "unconfirmed-tx", "new-block", "confirmed-tx", "tx-confirmation", "double-spend-tx".
 * @returns Promise<string> - The ID of the registered webhook.
 * @throws Error if webhook registration fails.
 */
export async function registerWebhook(
  address: string,
  callbackUrl: string,
  apiToken: string,
  eventType: string = "unconfirmed-tx" // Default to unconfirmed-tx
): Promise<string> {
  const path = `/btc/test3/hooks`; // Using Bitcoin testnet
  const payload = {
    event: eventType,
    address: address,
    url: callbackUrl,
    token: apiToken, // Token can also be in payload
  };

  try {
    // Token is included in payload, so not passing it as query param to post function
    const response = await post<typeof payload, BlockcypherWebhook>(path, payload);
    if (response && response.id) {
      return response.id;
    } else {
      throw new Error("Webhook registration did not return an ID.");
    }
  } catch (error) {
    console.error("Blockcypher webhook registration failed:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to register webhook: ${error.message}`);
    }
    throw new Error("An unknown error occurred during webhook registration");
  }
}
