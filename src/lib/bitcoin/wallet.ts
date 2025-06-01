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

/**
 * Derives a testnet Bitcoin address from an HD root key using a specified derivation path
 *
 * @param {BIP32Interface} hdRoot - The HD root key generated from generateHDRoot()
 * @param {string} [path="m/84'/1'/0'/0/0"] - BIP84 derivation path for testnet native SegWit (defaults to first receiving address)
 * @returns {string} A testnet Bitcoin address string (starts with 'tb1')
 *
 * @example
 * const mnemonic = generateMnemonic();
 * const seed = mnemonicToSeed(mnemonic);
 * const hdRoot = generateHDRoot(seed);
 * const address = deriveTestnetAddress(hdRoot);
 * console.log(address); // "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
 *
 * @example
 * // Custom derivation path
 * const address = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/1"); // Second receiving address
 *
 * @security This function only returns the public address string.
 * Private keys are never exposed and remain internal to the HD wallet structure.
 * This function is safe to use for generating addresses that will be shared with clients.
 */
export function deriveTestnetAddress(
  hdRoot: BIP32Interface,
  path?: string
): string {
  try {
    // Set default path if not provided
    const derivationPath = path ?? "m/84'/1'/0'/0/0";

    // Validate that hdRoot is provided and has the expected structure
    if (!hdRoot) {
      throw new Error("HD root is required");
    }

    if (typeof hdRoot.derivePath !== "function") {
      throw new Error("Invalid HD root: missing derivePath method");
    }

    if (!hdRoot.network) {
      throw new Error("Invalid HD root: missing network information");
    }

    // Validate that we're working with testnet
    if (hdRoot.network !== bitcoin.networks.testnet) {
      throw new Error(
        "HD root must be configured for testnet network. Use bitcoin.networks.testnet when calling generateHDRoot()"
      );
    }

    // Validate derivation path format (check for null/undefined first)
    if (
      path !== undefined &&
      (path === null || typeof path !== "string" || !path.startsWith("m/"))
    ) {
      throw new Error(
        "Invalid derivation path: must be a string starting with 'm/'"
      );
    }

    // Use the derivation path for further validation
    if (
      typeof derivationPath !== "string" ||
      !derivationPath.startsWith("m/")
    ) {
      throw new Error(
        "Invalid derivation path: must be a string starting with 'm/'"
      );
    }

    // Validate that path follows BIP84 pattern for testnet (m/84'/1'/...)
    const pathParts = derivationPath.split("/");
    if (pathParts.length < 4) {
      throw new Error(
        "Invalid derivation path: must have at least 4 levels (m/purpose'/coin_type'/account'/...)"
      );
    }

    if (pathParts[1] !== "84'") {
      throw new Error(
        "Invalid derivation path: must use purpose 84' for native SegWit (BIP84)"
      );
    }

    if (pathParts[2] !== "1'") {
      throw new Error(
        "Invalid derivation path: must use coin_type 1' for Bitcoin testnet"
      );
    }

    // Derive the child key using the specified path
    const childKey = hdRoot.derivePath(derivationPath);

    // Verify the derived key has the required properties
    if (!childKey) {
      throw new Error("Failed to derive child key from path");
    }

    if (!childKey.publicKey) {
      throw new Error("Derived child key is missing public key");
    }

    if (childKey.publicKey.length !== 33) {
      throw new Error(
        `Invalid derived public key length: expected 33 bytes, got ${childKey.publicKey.length}`
      );
    }

    // Create P2WPKH (Pay to Witness Public Key Hash) address for native SegWit
    // This creates a testnet address starting with 'tb1'
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(childKey.publicKey),
      network: bitcoin.networks.testnet,
    });

    if (!address) {
      throw new Error("Failed to generate P2WPKH address from public key");
    }

    // Validate that the generated address has the correct testnet format
    if (!address.startsWith("tb1")) {
      throw new Error(
        `Generated address has incorrect format: expected to start with 'tb1', got '${address.substring(
          0,
          3
        )}'`
      );
    }

    // Additional validation: testnet bech32 addresses should be 42 or 62 characters
    // 42 for P2WPKH (20-byte hash), 62 for P2WSH (32-byte hash)
    if (address.length !== 42 && address.length !== 62) {
      throw new Error(
        `Generated address has unexpected length: expected 42 or 62 characters, got ${address.length}`
      );
    }

    // Return only the public address string - no private key material
    return address;
  } catch (error) {
    throw new Error(
      `Failed to derive testnet address: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generates a new Bitcoin testnet address with ephemeral HD wallet (Unified Function)
 *
 * This function combines all wallet generation steps internally and only exposes
 * the final public address. It is the main function to be used by Server Actions.
 *
 * @param {string} [derivationPath="m/84'/1'/0'/0/0"] - BIP84 derivation path for testnet native SegWit
 * @returns {string} A testnet Bitcoin address string (starts with 'tb1')
 *
 * @example
 * const address = generateWalletAddress();
 * console.log(address); // "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
 *
 * @example
 * // Generate with custom derivation path
 * const address = generateWalletAddress("m/84'/1'/0'/0/1");
 *
 * @security CRITICAL SECURITY IMPLEMENTATION:
 * - Mnemonic, seed, and private keys are generated and used ONLY within this function
 * - NO private key material is ever exposed outside this function
 * - Private keys and mnemonics are automatically discarded when function completes
 * - Only the public address string is returned to caller
 * - This function is safe to use in Server Actions as it never exposes sensitive data
 */
export function generateWalletAddress(
  derivationPath: string = "m/84'/1'/0'/0/0"
): string {
  try {
    // Step 1: Generate a new mnemonic phrase (kept internal)
    const mnemonic = generateMnemonic();

    // Step 2: Convert mnemonic to seed (kept internal)
    const seed = mnemonicToSeed(mnemonic);

    // Step 3: Generate HD root key from seed (kept internal)
    const hdRoot = generateHDRoot(seed, bitcoin.networks.testnet);

    // Step 4: Derive the testnet address using specified path
    const address = deriveTestnetAddress(hdRoot, derivationPath);

    // SECURITY NOTE: At this point, mnemonic, seed, and hdRoot containing
    // private keys will be garbage collected and removed from memory.
    // Only the public address is returned.

    return address;
  } catch (error) {
    throw new Error(
      `Failed to generate wallet address: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Validates a Bitcoin testnet address format and structure
 *
 * @param {string} address - The Bitcoin address to validate
 * @returns {boolean} True if the address is a valid testnet address, false otherwise
 *
 * @example
 * const address = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
 * const isValid = isValidTestnetAddress(address);
 * console.log(isValid); // true
 *
 * @example
 * const invalidAddress = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
 * const isValid = isValidTestnetAddress(invalidAddress);
 * console.log(isValid); // false (mainnet address)
 *
 * @security This function only validates address format and does not interact with private keys.
 * It's safe to use with client-provided addresses for validation purposes.
 */
export function isValidTestnetAddress(address: string): boolean {
  try {
    // Check basic format requirements
    if (!address || typeof address !== "string") {
      return false;
    }

    // Trim whitespace
    const trimmedAddress = address.trim();

    // Testnet bech32 addresses (native SegWit) start with 'tb1'
    if (trimmedAddress.startsWith("tb1")) {
      // P2WPKH addresses are 42 characters, P2WSH addresses are 62 characters
      const isValidLength =
        trimmedAddress.length === 42 || trimmedAddress.length === 62;

      if (!isValidLength) {
        return false;
      }

      // Normalize to lowercase as per BIP173 (bech32 should be all lowercase or all uppercase)
      const normalizedAddress = trimmedAddress.toLowerCase();

      // Check bech32 format: tb1 followed by 39 or 59 lowercase alphanumeric characters
      const bech32Pattern = /^tb1[a-z0-9]{39}$|^tb1[a-z0-9]{59}$/;
      if (!bech32Pattern.test(normalizedAddress)) {
        return false;
      }

      // Use bitcoinjs-lib to validate the address more thoroughly
      try {
        const decoded = bitcoin.address.fromBech32(normalizedAddress);
        // Verify it's actually for testnet
        return decoded.prefix === "tb";
      } catch {
        return false;
      }
    }

    // Legacy testnet addresses start with 'm' or 'n' (P2PKH) or '2' (P2SH)
    if (
      trimmedAddress.startsWith("m") ||
      trimmedAddress.startsWith("n") ||
      trimmedAddress.startsWith("2")
    ) {
      try {
        // Use bitcoinjs-lib to validate legacy testnet addresses
        const decoded = bitcoin.address.fromBase58Check(trimmedAddress);

        // Check if it's a valid testnet address by comparing version bytes
        const testnetP2PKH = bitcoin.networks.testnet.pubKeyHash; // 111 (0x6f)
        const testnetP2SH = bitcoin.networks.testnet.scriptHash; // 196 (0xc4)

        return (
          decoded.version === testnetP2PKH || decoded.version === testnetP2SH
        );
      } catch {
        return false;
      }
    }

    // If it doesn't match any testnet address patterns, it's invalid
    return false;
  } catch {
    // Any unexpected error means the address is invalid
    return false;
  }
}

/**
 * Validates that a generated wallet address is properly formatted for testnet usage
 *
 * @param {string} address - The address generated by wallet functions
 * @returns {boolean} True if the address is valid for testnet use, false otherwise
 *
 * @example
 * const address = generateWalletAddress();
 * const isValid = validateGeneratedAddress(address);
 * console.log(isValid); // true
 *
 * @security This function validates addresses generated by our wallet functions
 * to ensure they meet the expected testnet format requirements.
 */
export function validateGeneratedAddress(address: string): boolean {
  try {
    // First, check if it's a valid testnet address
    if (!isValidTestnetAddress(address)) {
      return false;
    }

    // Additional validation for addresses generated by our wallet functions
    // Our wallet functions specifically generate native SegWit P2WPKH addresses
    if (!address.startsWith("tb1")) {
      return false;
    }

    // Our wallet generates P2WPKH addresses which are exactly 42 characters
    if (address.length !== 42) {
      return false;
    }

    // Validate the bech32 format more strictly for generated addresses
    const bech32Pattern = /^tb1[a-z0-9]{39}$/;
    if (!bech32Pattern.test(address)) {
      return false;
    }

    // Use bitcoinjs-lib to decode and verify the address structure
    try {
      const decoded = bitcoin.address.fromBech32(address);

      // Verify it's for testnet
      if (decoded.prefix !== "tb") {
        return false;
      }

      // Verify it's a P2WPKH address (20-byte witness program)
      if (decoded.data.length !== 20) {
        return false;
      }

      // Verify witness version is 0 (for P2WPKH)
      if (decoded.version !== 0) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  } catch {
    // Any unexpected error means the address is invalid
    return false;
  }
}

/**
 * Validates multiple wallet addresses at once
 *
 * @param {string[]} addresses - Array of addresses to validate
 * @returns {boolean} True if ALL addresses are valid testnet addresses, false if any are invalid
 *
 * @example
 * const addresses = [
 *   generateWalletAddress(),
 *   generateWalletAddress("m/84'/1'/0'/0/1"),
 *   generateWalletAddress("m/84'/1'/0'/1/0")
 * ];
 * const allValid = validateMultipleAddresses(addresses);
 * console.log(allValid); // true
 *
 * @security This function validates multiple addresses for batch operations.
 * Useful for validating address pools or multi-address operations.
 */
export function validateMultipleAddresses(addresses: string[]): boolean {
  try {
    // Check that addresses is an array
    if (!Array.isArray(addresses)) {
      return false;
    }

    // Empty array is considered valid
    if (addresses.length === 0) {
      return true;
    }

    // All addresses must be valid
    return addresses.every((address) => {
      if (typeof address !== "string") {
        return false;
      }
      return validateGeneratedAddress(address);
    });
  } catch {
    // Any unexpected error means validation failed
    return false;
  }
}

/**
 * Enhanced validation that checks if an address was likely generated by our wallet system
 *
 * @param {string} address - The address to validate
 * @returns {object} Validation result with detailed information
 *
 * @example
 * const address = generateWalletAddress();
 * const validation = validateAddressDetailed(address);
 * console.log(validation);
 * // {
 * //   isValid: true,
 * //   isTestnet: true,
 * //   isNativeSegWit: true,
 * //   isP2WPKH: true,
 * //   addressType: "P2WPKH",
 * //   network: "testnet"
 * // }
 *
 * @security This function provides detailed validation information for audit and debugging purposes.
 * It does not expose any private key material.
 */
export function validateAddressDetailed(address: string): {
  isValid: boolean;
  isTestnet: boolean;
  isNativeSegWit: boolean;
  isP2WPKH: boolean;
  addressType: string;
  network: string;
  errors: string[];
} {
  const result = {
    isValid: false,
    isTestnet: false,
    isNativeSegWit: false,
    isP2WPKH: false,
    addressType: "unknown",
    network: "unknown",
    errors: [] as string[],
  };

  try {
    // Basic format validation
    if (!address || typeof address !== "string") {
      result.errors.push("Address must be a non-empty string");
      return result;
    }

    const trimmedAddress = address.trim();
    if (trimmedAddress !== address) {
      result.errors.push("Address contains leading/trailing whitespace");
    }

    // Check if it's a testnet address
    if (trimmedAddress.startsWith("tb1")) {
      result.isTestnet = true;
      result.isNativeSegWit = true;
      result.network = "testnet";

      try {
        const decoded = bitcoin.address.fromBech32(trimmedAddress);

        if (decoded.prefix === "tb") {
          if (decoded.version === 0) {
            if (decoded.data.length === 20) {
              result.isP2WPKH = true;
              result.addressType = "P2WPKH";
              result.isValid = true;
            } else if (decoded.data.length === 32) {
              result.addressType = "P2WSH";
              result.isValid = true;
            } else {
              result.errors.push(
                `Invalid witness program length: ${decoded.data.length}`
              );
            }
          } else {
            result.errors.push(
              `Unsupported witness version: ${decoded.version}`
            );
          }
        } else {
          result.errors.push(`Invalid bech32 prefix: ${decoded.prefix}`);
        }
      } catch (error) {
        result.errors.push(
          `Invalid bech32 format: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } else if (
      trimmedAddress.startsWith("m") ||
      trimmedAddress.startsWith("n") ||
      trimmedAddress.startsWith("2")
    ) {
      result.isTestnet = true;
      result.network = "testnet";

      try {
        const decoded = bitcoin.address.fromBase58Check(trimmedAddress);
        const testnetP2PKH = bitcoin.networks.testnet.pubKeyHash;
        const testnetP2SH = bitcoin.networks.testnet.scriptHash;

        if (decoded.version === testnetP2PKH) {
          result.addressType = "P2PKH";
          result.isValid = true;
        } else if (decoded.version === testnetP2SH) {
          result.addressType = "P2SH";
          result.isValid = true;
        } else {
          result.errors.push(
            `Invalid version byte for testnet: ${decoded.version}`
          );
        }
      } catch (error) {
        result.errors.push(
          `Invalid base58 format: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } else if (trimmedAddress.startsWith("bc1")) {
      result.network = "mainnet";
      result.isNativeSegWit = true;
      result.errors.push("Address is for mainnet, not testnet");
    } else if (
      trimmedAddress.startsWith("1") ||
      trimmedAddress.startsWith("3")
    ) {
      result.network = "mainnet";
      result.errors.push("Address is for mainnet, not testnet");
    } else {
      result.errors.push("Address format not recognized");
    }

    return result;
  } catch (error) {
    result.errors.push(
      `Validation error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return result;
  }
}
