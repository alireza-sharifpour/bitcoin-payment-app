/**
 * Test suite for HD Wallet functions
 * Testing Create mnemonic generation function
 */

import { describe, it, expect, jest } from "@jest/globals";
import {
  generateMnemonic,
  validateMnemonic,
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
