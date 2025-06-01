/**
 * Bitcoin HD Wallet Service (Server-Side Only)
 *
 * CRITICAL SECURITY NOTE: This module contains functions that generate and handle
 * private keys and mnemonics. These should NEVER be exposed to the client-side.
 * All functions in this module are intended for server-side use only.
 */

import * as bip39 from "bip39";
import { BIP32Factory, BIP32Interface } from "bip32";
import * as ecc from "tiny-secp256k1";
import * as bitcoin from "bitcoinjs-lib";

// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc);

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
 * Converts a BIP39 mnemonic phrase to a seed using PBKDF2
 *
 * @param {string} mnemonic - The mnemonic phrase to convert to seed
 * @param {string} [passphrase=""] - Optional passphrase for additional security (defaults to empty string)
 * @returns {Buffer} A 64-byte seed derived from the mnemonic
 *
 * @example
 * const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
 * const seed = mnemonicToSeed(mnemonic);
 * console.log(seed.toString('hex')); // "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04"
 *
 * @example
 * // With passphrase
 * const seed = mnemonicToSeed(mnemonic, "my passphrase");
 *
 * @security This function generates cryptographic seed material and should only be used server-side.
 * The returned seed should be handled securely and never exposed to the client.
 */
export function mnemonicToSeed(
  mnemonic: string,
  passphrase: string = ""
): Buffer {
  try {
    // Validate the mnemonic before processing
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    // Convert mnemonic to seed using BIP39 specification
    // This uses PBKDF2 with 2048 iterations internally
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);

    // Verify the seed is the expected length (64 bytes = 512 bits)
    if (seed.length !== 64) {
      throw new Error(
        `Invalid seed length: expected 64 bytes, got ${seed.length}`
      );
    }

    return seed;
  } catch (error) {
    throw new Error(
      `Failed to convert mnemonic to seed: ${
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

/**
 * Generates an HD (Hierarchical Deterministic) root key from a seed
 *
 * @param {Buffer} seed - The 64-byte seed derived from a mnemonic
 * @param {bitcoin.Network} [network=bitcoin.networks.testnet] - Bitcoin network (defaults to testnet)
 * @returns {BIP32Interface} The HD root key object containing master private/public keys and derivation methods
 *
 * @example
 * const mnemonic = generateMnemonic();
 * const seed = mnemonicToSeed(mnemonic);
 * const hdRoot = generateHDRoot(seed);
 * // Use hdRoot to derive specific address keys
 *
 * @example
 * // For testnet
 * const hdRoot = generateHDRoot(seed, bitcoin.networks.testnet);
 *
 * @security This function generates and handles private key material.
 * The returned BIP32Interface contains private keys and should NEVER be exposed to the client.
 * Use this only for server-side address derivation.
 */
export function generateHDRoot(
  seed: Buffer,
  network: bitcoin.Network = bitcoin.networks.testnet
): BIP32Interface {
  try {
    // Validate seed length (should be 64 bytes from BIP39)
    if (!Buffer.isBuffer(seed)) {
      throw new Error("Seed must be a Buffer");
    }

    if (seed.length !== 64) {
      throw new Error(
        `Invalid seed length: expected 64 bytes, got ${seed.length}`
      );
    }

    // Generate HD root key from seed using BIP32
    const hdRoot = bip32.fromSeed(seed, network);

    // Verify that the HD root was created successfully
    if (!hdRoot) {
      throw new Error("Failed to create HD root from seed");
    }

    // Verify the HD root has the expected properties
    if (!hdRoot.privateKey || !hdRoot.publicKey) {
      throw new Error("Generated HD root is missing required key material");
    }

    // Verify key lengths are correct
    if (hdRoot.privateKey.length !== 32) {
      throw new Error(
        `Invalid private key length: expected 32 bytes, got ${hdRoot.privateKey.length}`
      );
    }

    if (hdRoot.publicKey.length !== 33) {
      throw new Error(
        `Invalid public key length: expected 33 bytes, got ${hdRoot.publicKey.length}`
      );
    }

    return hdRoot;
  } catch (error) {
    throw new Error(
      `Failed to generate HD root: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
