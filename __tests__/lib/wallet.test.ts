/**
 * Test suite for HD Wallet functions
 * Testing Create mnemonic generation function
 */

import { describe, it, expect, jest } from "@jest/globals";
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
} from "../../src/lib/bitcoin/wallet";
import * as bip39 from "bip39";

describe("generateMnemonic", () => {
  it("should generate a valid 12-word mnemonic phrase", () => {
    const mnemonic = generateMnemonic();

    // Check that the mnemonic is a string
    expect(typeof mnemonic).toBe("string");

    // Check that it has exactly 12 words
    const words = mnemonic.split(" ");
    expect(words).toHaveLength(12);

    // Check that each word is not empty
    words.forEach((word) => {
      expect(word.trim()).not.toBe("");
    });

    // Verify it's a valid BIP39 mnemonic
    expect(bip39.validateMnemonic(mnemonic)).toBe(true);
  });

  it("should generate different mnemonics on each call", () => {
    const mnemonic1 = generateMnemonic();
    const mnemonic2 = generateMnemonic();
    const mnemonic3 = generateMnemonic();

    // All should be valid
    expect(bip39.validateMnemonic(mnemonic1)).toBe(true);
    expect(bip39.validateMnemonic(mnemonic2)).toBe(true);
    expect(bip39.validateMnemonic(mnemonic3)).toBe(true);

    // They should be different (statistically almost impossible to be the same)
    expect(mnemonic1).not.toBe(mnemonic2);
    expect(mnemonic2).not.toBe(mnemonic3);
    expect(mnemonic1).not.toBe(mnemonic3);
  });

  it("should generate valid mnemonics consistently (stress test)", () => {
    // Generate multiple mnemonics to ensure reliability
    for (let i = 0; i < 10; i++) {
      const mnemonic = generateMnemonic();
      const words = mnemonic.split(" ");

      expect(words).toHaveLength(12);
      expect(bip39.validateMnemonic(mnemonic)).toBe(true);
    }
  });

  it("should throw an error if mnemonic generation fails", () => {
    // Mock bip39.generateMnemonic to throw an error
    const originalGenerateMnemonic = bip39.generateMnemonic;
    const mockGenerateMnemonic = jest.fn(() => {
      throw new Error("Mocked error");
    });

    // Replace the function temporarily
    (bip39 as unknown as { generateMnemonic: () => string }).generateMnemonic =
      mockGenerateMnemonic;

    expect(() => generateMnemonic()).toThrow(
      "Failed to generate mnemonic: Mocked error"
    );

    // Restore original function
    (bip39 as unknown as { generateMnemonic: () => string }).generateMnemonic =
      originalGenerateMnemonic;
  });
});

describe("mnemonicToSeed", () => {
  // Standard test vectors from BIP39 specification
  const testVectors = [
    {
      mnemonic:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      passphrase: "",
    },
    {
      mnemonic:
        "legal winner thank year wave sausage worth useful legal winner thank yellow",
      passphrase: "",
    },
    {
      mnemonic:
        "letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
      passphrase: "",
    },
  ];

  it("should generate the same seed for the same mnemonic consistently", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    const seed1 = mnemonicToSeed(mnemonic);
    const seed2 = mnemonicToSeed(mnemonic);
    const seed3 = mnemonicToSeed(mnemonic);

    // All seeds should be identical
    expect(seed1.equals(seed2)).toBe(true);
    expect(seed2.equals(seed3)).toBe(true);
    expect(seed1.equals(seed3)).toBe(true);

    // Seeds should be 64 bytes long
    expect(seed1.length).toBe(64);
    expect(seed2.length).toBe(64);
    expect(seed3.length).toBe(64);
  });

  it("should generate correct seeds for BIP39 test vectors", () => {
    testVectors.forEach(({ mnemonic, passphrase }) => {
      const seed = mnemonicToSeed(mnemonic, passphrase);

      // Compare with expected result from bip39 library directly
      const expectedSeedFromBip39 = bip39.mnemonicToSeedSync(
        mnemonic,
        passphrase
      );

      expect(seed.equals(expectedSeedFromBip39)).toBe(true);
      expect(seed.length).toBe(64);
    });
  });

  it("should generate different seeds for different mnemonics", () => {
    const mnemonic1 =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const mnemonic2 =
      "legal winner thank year wave sausage worth useful legal winner thank yellow";

    const seed1 = mnemonicToSeed(mnemonic1);
    const seed2 = mnemonicToSeed(mnemonic2);

    // Seeds should be different
    expect(seed1.equals(seed2)).toBe(false);

    // Both should be 64 bytes
    expect(seed1.length).toBe(64);
    expect(seed2.length).toBe(64);
  });

  it("should generate different seeds with different passphrases", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    const seedNoPassphrase = mnemonicToSeed(mnemonic);
    const seedWithPassphrase = mnemonicToSeed(mnemonic, "test passphrase");
    const seedWithDifferentPassphrase = mnemonicToSeed(
      mnemonic,
      "different passphrase"
    );

    // All seeds should be different
    expect(seedNoPassphrase.equals(seedWithPassphrase)).toBe(false);
    expect(seedWithPassphrase.equals(seedWithDifferentPassphrase)).toBe(false);
    expect(seedNoPassphrase.equals(seedWithDifferentPassphrase)).toBe(false);

    // All should be 64 bytes
    expect(seedNoPassphrase.length).toBe(64);
    expect(seedWithPassphrase.length).toBe(64);
    expect(seedWithDifferentPassphrase.length).toBe(64);
  });

  it("should handle empty string passphrase same as no passphrase", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    const seedNoPassphrase = mnemonicToSeed(mnemonic);
    const seedEmptyPassphrase = mnemonicToSeed(mnemonic, "");

    // Seeds should be identical
    expect(seedNoPassphrase.equals(seedEmptyPassphrase)).toBe(true);
  });

  it("should work with generated mnemonics", () => {
    const mnemonic = generateMnemonic();

    const seed1 = mnemonicToSeed(mnemonic);
    const seed2 = mnemonicToSeed(mnemonic);

    // Should generate same seed consistently
    expect(seed1.equals(seed2)).toBe(true);
    expect(seed1.length).toBe(64);
  });

  it("should throw error for invalid mnemonic", () => {
    const invalidMnemonic = "invalid mnemonic phrase that is not valid";

    expect(() => mnemonicToSeed(invalidMnemonic)).toThrow(
      "Failed to convert mnemonic to seed: Invalid mnemonic phrase"
    );
  });

  it("should throw error for empty mnemonic", () => {
    expect(() => mnemonicToSeed("")).toThrow(
      "Failed to convert mnemonic to seed: Invalid mnemonic phrase"
    );
  });

  it("should throw error for mnemonic with wrong word count", () => {
    const shortMnemonic = "abandon abandon abandon";

    expect(() => mnemonicToSeed(shortMnemonic)).toThrow(
      "Failed to convert mnemonic to seed"
    );
  });

  it("should handle very long passphrases", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const longPassphrase = "a".repeat(1000); // 1000 character passphrase

    const seed = mnemonicToSeed(mnemonic, longPassphrase);

    expect(seed.length).toBe(64);
    expect(seed).toBeInstanceOf(Buffer);
  });

  it("should handle special characters in passphrase", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const specialPassphrase = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";

    const seed = mnemonicToSeed(mnemonic, specialPassphrase);

    expect(seed.length).toBe(64);
    expect(seed).toBeInstanceOf(Buffer);
  });

  it("should handle unicode characters in passphrase", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const unicodePassphrase = "测试密码🔐🚀";

    const seed = mnemonicToSeed(mnemonic, unicodePassphrase);

    expect(seed.length).toBe(64);
    expect(seed).toBeInstanceOf(Buffer);
  });

  it("should throw error if underlying bip39 function fails", () => {
    // Mock bip39.mnemonicToSeedSync to throw an error
    const originalMnemonicToSeedSync = bip39.mnemonicToSeedSync;
    const mockMnemonicToSeedSync = jest.fn(() => {
      throw new Error("Mocked bip39 error");
    });

    // Replace the function temporarily
    (
      bip39 as unknown as {
        mnemonicToSeedSync: (mnemonic: string, passphrase?: string) => Buffer;
      }
    ).mnemonicToSeedSync = mockMnemonicToSeedSync;

    const validMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    expect(() => mnemonicToSeed(validMnemonic)).toThrow(
      "Failed to convert mnemonic to seed: Mocked bip39 error"
    );

    // Restore original function
    (
      bip39 as unknown as {
        mnemonicToSeedSync: (mnemonic: string, passphrase?: string) => Buffer;
      }
    ).mnemonicToSeedSync = originalMnemonicToSeedSync;
  });

  it("should have deterministic output (stress test)", () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const passphrase = "test";

    // Generate the same seed multiple times
    const seeds = [];
    for (let i = 0; i < 10; i++) {
      seeds.push(mnemonicToSeed(mnemonic, passphrase));
    }

    // All seeds should be identical
    for (let i = 1; i < seeds.length; i++) {
      expect(seeds[0].equals(seeds[i])).toBe(true);
    }
  });
});

describe("validateMnemonic", () => {
  it("should validate correct mnemonics", () => {
    const validMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    expect(validateMnemonic(validMnemonic)).toBe(true);
  });

  it("should reject invalid mnemonics", () => {
    const invalidMnemonic = "invalid mnemonic phrase that is not valid";
    expect(validateMnemonic(invalidMnemonic)).toBe(false);
  });

  it("should validate generated mnemonics", () => {
    const mnemonic = generateMnemonic();
    expect(validateMnemonic(mnemonic)).toBe(true);
  });
});
