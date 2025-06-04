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

// This schema represents the actual payload structure sent by BlockCypher webhooks
// Based on real webhook data received from BlockCypher API
export const BlockcypherWebhookPayloadSchema = z
  .object({
    // Core transaction fields that BlockCypher always sends
    hash: z.string().min(1), // Transaction hash
    addresses: z.array(z.string()), // All addresses involved in the transaction
    total: z.number().int(), // Total transaction amount in satoshis
    fees: z.number().int(), // Transaction fees in satoshis
    confirmations: z.number().int().min(0), // Number of confirmations
    double_spend: z.boolean(), // Whether this is a double spend
    
    // Block information (-1 for unconfirmed)
    block_height: z.number().int(),
    block_index: z.number().int(),
    
    // Transaction metadata
    size: z.number().int(),
    vsize: z.number().int().optional(),
    preference: z.string(),
    relayed_by: z.string().optional(),
    received: z.string(), // ISO timestamp
    ver: z.number().int(),
    lock_time: z.number().int().optional(),
    vin_sz: z.number().int(),
    vout_sz: z.number().int(),
    opt_in_rbf: z.boolean().optional(),

    // Transaction inputs and outputs
    inputs: z.array(z.object({
      prev_hash: z.string(),
      output_index: z.number().int(),
      output_value: z.number().int(),
      sequence: z.number().int(),
      addresses: z.array(z.string()),
      script_type: z.string(),
      age: z.number().int().optional(),
      witness: z.array(z.string()).optional(),
    })).optional(),
    
    outputs: z.array(BlockcypherTXOutputSchema),

    // Allow other fields BlockCypher might send
  })
  .passthrough();

export type BlockcypherWebhookPayload = z.infer<
  typeof BlockcypherWebhookPayloadSchema
>;
