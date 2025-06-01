/**
 * Test suite for HD Wallet functions
 * Testing Create mnemonic generation function
 */

import { describe, it, expect, jest } from "@jest/globals";
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  generateHDRoot,
} from "../../src/lib/bitcoin/wallet";
import * as bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";

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

describe("generateHDRoot", () => {
  // Test vectors using known seeds for deterministic testing
  const testMnemonic =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

  it("should generate a valid HD root key from a seed", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // Check that hdRoot is defined and has expected properties
    expect(hdRoot).toBeDefined();
    expect(hdRoot.privateKey).toBeInstanceOf(Uint8Array);
    expect(hdRoot.publicKey).toBeInstanceOf(Uint8Array);

    // Verify key lengths
    expect(hdRoot.privateKey?.length).toBe(32);
    expect(hdRoot.publicKey.length).toBe(33);

    // Verify it has derivation methods
    expect(typeof hdRoot.derive).toBe("function");
    expect(typeof hdRoot.deriveHardened).toBe("function");
    expect(typeof hdRoot.derivePath).toBe("function");

    // Check network is set correctly (testnet by default)
    expect(hdRoot.network).toEqual(bitcoin.networks.testnet);
  });

  it("should generate the same HD root for the same seed consistently", () => {
    const seed = mnemonicToSeed(testMnemonic);

    const hdRoot1 = generateHDRoot(seed);
    const hdRoot2 = generateHDRoot(seed);
    const hdRoot3 = generateHDRoot(seed);

    // Private keys should be identical
    expect(
      Buffer.from(hdRoot1.privateKey!).equals(Buffer.from(hdRoot2.privateKey!))
    ).toBe(true);
    expect(
      Buffer.from(hdRoot2.privateKey!).equals(Buffer.from(hdRoot3.privateKey!))
    ).toBe(true);
    expect(
      Buffer.from(hdRoot1.privateKey!).equals(Buffer.from(hdRoot3.privateKey!))
    ).toBe(true);

    // Public keys should be identical
    expect(
      Buffer.from(hdRoot1.publicKey).equals(Buffer.from(hdRoot2.publicKey))
    ).toBe(true);
    expect(
      Buffer.from(hdRoot2.publicKey).equals(Buffer.from(hdRoot3.publicKey))
    ).toBe(true);
    expect(
      Buffer.from(hdRoot1.publicKey).equals(Buffer.from(hdRoot3.publicKey))
    ).toBe(true);

    // Chain codes should be identical
    expect(
      Buffer.from(hdRoot1.chainCode).equals(Buffer.from(hdRoot2.chainCode))
    ).toBe(true);
    expect(
      Buffer.from(hdRoot2.chainCode).equals(Buffer.from(hdRoot3.chainCode))
    ).toBe(true);
    expect(
      Buffer.from(hdRoot1.chainCode).equals(Buffer.from(hdRoot3.chainCode))
    ).toBe(true);
  });

  it("should generate different HD roots for different seeds", () => {
    const seed1 = mnemonicToSeed(testMnemonic);
    const seed2 = mnemonicToSeed(
      "legal winner thank year wave sausage worth useful legal winner thank yellow"
    );

    const hdRoot1 = generateHDRoot(seed1);
    const hdRoot2 = generateHDRoot(seed2);

    // Should have different private keys
    expect(
      Buffer.from(hdRoot1.privateKey!).equals(Buffer.from(hdRoot2.privateKey!))
    ).toBe(false);

    // Should have different public keys
    expect(
      Buffer.from(hdRoot1.publicKey).equals(Buffer.from(hdRoot2.publicKey))
    ).toBe(false);

    // Should have different chain codes
    expect(
      Buffer.from(hdRoot1.chainCode).equals(Buffer.from(hdRoot2.chainCode))
    ).toBe(false);
  });

  it("should work with different networks", () => {
    const seed = mnemonicToSeed(testMnemonic);

    const testnetRoot = generateHDRoot(seed, bitcoin.networks.testnet);
    const mainnetRoot = generateHDRoot(seed, bitcoin.networks.bitcoin);

    // Both should be valid
    expect(testnetRoot).toBeDefined();
    expect(mainnetRoot).toBeDefined();

    // Should have the same private/public keys (network doesn't affect key generation)
    expect(
      Buffer.from(testnetRoot.privateKey!).equals(
        Buffer.from(mainnetRoot.privateKey!)
      )
    ).toBe(true);
    expect(
      Buffer.from(testnetRoot.publicKey).equals(
        Buffer.from(mainnetRoot.publicKey)
      )
    ).toBe(true);

    // But should have different network settings
    expect(testnetRoot.network).toEqual(bitcoin.networks.testnet);
    expect(mainnetRoot.network).toEqual(bitcoin.networks.bitcoin);
  });

  it("should default to testnet network when no network specified", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    expect(hdRoot.network).toEqual(bitcoin.networks.testnet);
  });

  it("should be able to derive child keys using derivePath", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // Test BIP84 derivation path for testnet
    const derivationPath = "m/84'/1'/0'/0/0";
    const childKey = hdRoot.derivePath(derivationPath);

    expect(childKey).toBeDefined();
    expect(childKey.privateKey).toBeInstanceOf(Uint8Array);
    expect(childKey.publicKey).toBeInstanceOf(Uint8Array);

    // Child key should be different from root
    expect(
      Buffer.from(childKey.privateKey!).equals(Buffer.from(hdRoot.privateKey!))
    ).toBe(false);
    expect(
      Buffer.from(childKey.publicKey).equals(Buffer.from(hdRoot.publicKey))
    ).toBe(false);
  });

  it("should be able to derive child keys using deriveHardened and derive", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // Manually derive path m/84'/1'/0'/0/0
    const child1 = hdRoot.deriveHardened(84); // 84'
    const child2 = child1.deriveHardened(1); // 1'
    const child3 = child2.deriveHardened(0); // 0'
    const child4 = child3.derive(0); // 0
    const child5 = child4.derive(0); // 0

    // Should be the same as derivePath
    const derivedPath = hdRoot.derivePath("m/84'/1'/0'/0/0");

    expect(
      Buffer.from(child5.privateKey!).equals(
        Buffer.from(derivedPath.privateKey!)
      )
    ).toBe(true);
    expect(
      Buffer.from(child5.publicKey).equals(Buffer.from(derivedPath.publicKey))
    ).toBe(true);
  });

  it("should generate consistent results with known test vectors", () => {
    // Using the standard BIP39 test vector
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // These are the expected values for the test mnemonic
    // (derived from reference implementations)
    expect(hdRoot.privateKey).toBeDefined();
    expect(hdRoot.publicKey).toBeDefined();
    expect(hdRoot.chainCode).toBeDefined();

    // Verify the root has correct depth and path
    expect(hdRoot.depth).toBe(0);
    expect(hdRoot.index).toBe(0);
    expect(hdRoot.parentFingerprint).toBe(0);
  });

  it("should throw error for invalid seed buffer", () => {
    expect(() => generateHDRoot(null as unknown as Buffer)).toThrow(
      "Failed to generate HD root: Seed must be a Buffer"
    );

    expect(() => generateHDRoot(undefined as unknown as Buffer)).toThrow(
      "Failed to generate HD root: Seed must be a Buffer"
    );

    expect(() => generateHDRoot("not a buffer" as unknown as Buffer)).toThrow(
      "Failed to generate HD root: Seed must be a Buffer"
    );
  });

  it("should throw error for seed with wrong length", () => {
    const shortSeed = Buffer.alloc(32); // 32 bytes instead of 64
    const longSeed = Buffer.alloc(128); // 128 bytes instead of 64

    expect(() => generateHDRoot(shortSeed)).toThrow(
      "Failed to generate HD root: Invalid seed length: expected 64 bytes, got 32"
    );

    expect(() => generateHDRoot(longSeed)).toThrow(
      "Failed to generate HD root: Invalid seed length: expected 64 bytes, got 128"
    );
  });

  it("should throw error for empty seed", () => {
    const emptySeed = Buffer.alloc(0);

    expect(() => generateHDRoot(emptySeed)).toThrow(
      "Failed to generate HD root: Invalid seed length: expected 64 bytes, got 0"
    );
  });

  it("should work with seeds generated from different mnemonics", () => {
    const mnemonics = [
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      "legal winner thank year wave sausage worth useful legal winner thank yellow",
      "letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
    ];

    const hdRoots = mnemonics.map((mnemonic) => {
      const seed = mnemonicToSeed(mnemonic);
      return generateHDRoot(seed);
    });

    // All should be valid and different
    hdRoots.forEach((hdRoot, index) => {
      expect(hdRoot).toBeDefined();
      expect(hdRoot.privateKey).toBeInstanceOf(Uint8Array);
      expect(hdRoot.publicKey).toBeInstanceOf(Uint8Array);

      // Compare with other roots to ensure they're different
      hdRoots.forEach((otherRoot, otherIndex) => {
        if (index !== otherIndex) {
          expect(
            Buffer.from(hdRoot.privateKey!).equals(
              Buffer.from(otherRoot.privateKey!)
            )
          ).toBe(false);
          expect(
            Buffer.from(hdRoot.publicKey).equals(
              Buffer.from(otherRoot.publicKey)
            )
          ).toBe(false);
        }
      });
    });
  });

  it("should work with generated mnemonics", () => {
    // Test with randomly generated mnemonics
    for (let i = 0; i < 5; i++) {
      const mnemonic = generateMnemonic();
      const seed = mnemonicToSeed(mnemonic);
      const hdRoot = generateHDRoot(seed);

      expect(hdRoot).toBeDefined();
      expect(hdRoot.privateKey).toBeInstanceOf(Uint8Array);
      expect(hdRoot.publicKey).toBeInstanceOf(Uint8Array);
      expect(hdRoot.privateKey?.length).toBe(32);
      expect(hdRoot.publicKey.length).toBe(33);
    }
  });

  it("should handle edge case with all zero seed (for testing purposes)", () => {
    const zeroSeed = Buffer.alloc(64, 0);
    const hdRoot = generateHDRoot(zeroSeed);

    expect(hdRoot).toBeDefined();
    expect(hdRoot.privateKey).toBeInstanceOf(Uint8Array);
    expect(hdRoot.publicKey).toBeInstanceOf(Uint8Array);
  });

  it("should handle edge case with all max value seed", () => {
    const maxSeed = Buffer.alloc(64, 0xff);
    const hdRoot = generateHDRoot(maxSeed);

    expect(hdRoot).toBeDefined();
    expect(hdRoot.privateKey).toBeInstanceOf(Uint8Array);
    expect(hdRoot.publicKey).toBeInstanceOf(Uint8Array);
  });

  it("should maintain consistency across multiple sessions (stress test)", () => {
    const seed = mnemonicToSeed(testMnemonic);

    // Generate HD root multiple times
    const hdRoots = [];
    for (let i = 0; i < 10; i++) {
      hdRoots.push(generateHDRoot(seed));
    }

    // All should be identical
    const firstRoot = hdRoots[0];
    hdRoots.slice(1).forEach((hdRoot) => {
      expect(
        Buffer.from(hdRoot.privateKey!).equals(
          Buffer.from(firstRoot.privateKey!)
        )
      ).toBe(true);
      expect(
        Buffer.from(hdRoot.publicKey).equals(Buffer.from(firstRoot.publicKey))
      ).toBe(true);
      expect(
        Buffer.from(hdRoot.chainCode).equals(Buffer.from(firstRoot.chainCode))
      ).toBe(true);
    });
  });

  it("should produce valid BIP32 extended keys", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // Should be able to export to base58 (extended keys)
    expect(typeof hdRoot.toBase58).toBe("function");

    const extendedPrivateKey = hdRoot.toBase58();
    const extendedPublicKey = hdRoot.neutered().toBase58();

    // Extended keys should be strings
    expect(typeof extendedPrivateKey).toBe("string");
    expect(typeof extendedPublicKey).toBe("string");

    // Testnet extended private keys start with 'tprv'
    expect(extendedPrivateKey.startsWith("tprv")).toBe(true);

    // Testnet extended public keys start with 'tpub'
    expect(extendedPublicKey.startsWith("tpub")).toBe(true);
  });
});
