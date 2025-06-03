import { z } from "zod";

const BlockcypherTXOutputSchema = z.object({
  value: z.number().int().min(0), // Value in satoshis
  script: z.string(),
  addresses: z.array(z.string()),
  script_type: z.string(),
  spent_by: z.string().optional().nullable(),
  data_hex: z.string().optional().nullable(),
  data_string: z.string().optional().nullable(),
});

export type BlockcypherTXOutput = z.infer<typeof BlockcypherTXOutputSchema>;

// This schema represents the expected payload for Blockcypher webhooks.
// It's designed to capture core information needed for payment processing and validation.
export const BlockcypherWebhookPayloadSchema = z
  .object({
    token: z.string().min(1), // The token provided during webhook creation for authentication
    event: z.enum([
      "unconfirmed-tx",
      "confirmed-tx",
      "tx-confirmation",
      "new-block",
      "double-spend-tx",
    ]), // More specific event types
    hash: z.string().min(1), // Transaction hash

    // The specific address that this webhook event pertains to.
    // This is crucial if the webhook was registered for a particular address.
    address: z.string().optional(),

    // Transaction details, often part of the main payload or a nested object
    confirmations: z.number().int().min(0).optional(),
    confidence: z.number().min(0).max(100).optional(), // For unconfirmed transactions
    double_spend: z.boolean().optional(),

    total: z.number().int().optional(), // Total transaction amount in satoshis
    fees: z.number().int().optional(), // Transaction fees in satoshis

    // Outputs are critical for verifying payment to the correct address and the amount
    outputs: z.array(BlockcypherTXOutputSchema).optional(),

    // We can use .passthrough() to allow other fields Blockcypher might send,
    // without strictly validating them if they are not critical for our core logic.
  })
  .passthrough();

export type BlockcypherWebhookPayload = z.infer<
  typeof BlockcypherWebhookPayloadSchema
>;
