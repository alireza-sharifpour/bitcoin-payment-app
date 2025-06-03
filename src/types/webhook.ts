/**
 * Blockcypher webhook registration response
 */
export interface WebhookRegistration {
  /** Webhook ID from Blockcypher */
  id: string;
  /** Event type */
  event: string; // This can remain a general string as Blockcypher might support more events than we strictly handle or validate in payloads
  /** Target address */
  address: string;
  /** Webhook URL */
  url: string;
  /** Confirmation count for events */
  confirmations: number;
}
