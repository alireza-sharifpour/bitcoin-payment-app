/**
 * Bitcoin HD Wallet Service (Server-Side Only)
 *
 * CRITICAL SECURITY NOTE: This module contains functions that generate and handle
 * private keys and mnemonics. These should NEVER be exposed to the client-side.
 * All functions in this module are intended for server-side use only.
 */

import * as bip39 from "bip39";

/**
 * Generates a new BIP39 mnemonic phrase with 12 words
 *
 * @returns {string} A 12-word mnemonic phrase
 *
 * @example
 * const mnemonic = generateMnemonic();
 * console.log(mnemonic); // "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
 *
 * @security This function generates cryptographic material and should only be used server-side.
 * The returned mnemonic should be handled securely and never exposed to the client.
 */
export function generateMnemonic(): string {
  // Generate a 128-bit entropy (which creates a 12-word mnemonic)
  // 128 bits = 12 words, 256 bits = 24 words
  const entropy = 128;

  try {
    const mnemonic = bip39.generateMnemonic(entropy);

    // Validate that the generated mnemonic is valid
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Generated mnemonic is invalid");
    }

    return mnemonic;
  } catch (error) {
    throw new Error(
      `Failed to generate mnemonic: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Validates if a given mnemonic phrase is valid according to BIP39
 *
 * @param {string} mnemonic - The mnemonic phrase to validate
 * @returns {boolean} True if the mnemonic is valid, false otherwise
 *
 * @security This is a utility function for internal validation only
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}
