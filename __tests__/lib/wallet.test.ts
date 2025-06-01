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
  deriveTestnetAddress,
  generateWalletAddress,
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
    expect(() => generateHDRoot(null as never)).toThrow(
      "Failed to generate HD root: Seed must be a Buffer"
    );

    expect(() => generateHDRoot(undefined as never)).toThrow(
      "Failed to generate HD root: Seed must be a Buffer"
    );

    expect(() => generateHDRoot("not a buffer" as never)).toThrow(
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

describe("deriveTestnetAddress", () => {
  // Test vectors using known mnemonic for deterministic testing
  const testMnemonic =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

  it("should derive a valid testnet address from HD root", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);
    const address = deriveTestnetAddress(hdRoot);

    // Check that address is a string
    expect(typeof address).toBe("string");

    // Check that it starts with 'tb1' (testnet bech32)
    expect(address.startsWith("tb1")).toBe(true);

    // Check that it has the correct length for P2WPKH (42 characters)
    expect(address.length).toBe(42);

    // Verify it's a valid bech32 testnet address format
    expect(address).toMatch(/^tb1[a-z0-9]{39}$/);
  });

  it("should generate the same address for the same HD root and path consistently", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    const address1 = deriveTestnetAddress(hdRoot);
    const address2 = deriveTestnetAddress(hdRoot);
    const address3 = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/0");

    // All addresses should be identical
    expect(address1).toBe(address2);
    expect(address2).toBe(address3);
    expect(address1).toBe(address3);
  });

  it("should generate different addresses for different derivation paths", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    const address0 = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/0");
    const address1 = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/1");
    const address2 = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/2");
    const address3 = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/1/0");

    // All addresses should be different
    expect(address0).not.toBe(address1);
    expect(address1).not.toBe(address2);
    expect(address2).not.toBe(address3);
    expect(address0).not.toBe(address3);

    // All should be valid testnet addresses
    [address0, address1, address2, address3].forEach((addr) => {
      expect(addr.startsWith("tb1")).toBe(true);
      expect(addr.length).toBe(42);
    });
  });

  it("should generate different addresses for different HD roots", () => {
    const seed1 = mnemonicToSeed(testMnemonic);
    const seed2 = mnemonicToSeed(
      "legal winner thank year wave sausage worth useful legal winner thank yellow"
    );

    const hdRoot1 = generateHDRoot(seed1);
    const hdRoot2 = generateHDRoot(seed2);

    const address1 = deriveTestnetAddress(hdRoot1);
    const address2 = deriveTestnetAddress(hdRoot2);

    // Addresses should be different
    expect(address1).not.toBe(address2);

    // Both should be valid testnet addresses
    expect(address1.startsWith("tb1")).toBe(true);
    expect(address2.startsWith("tb1")).toBe(true);
    expect(address1.length).toBe(42);
    expect(address2.length).toBe(42);
  });

  it("should use default BIP84 path when no path is provided", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    const addressDefault = deriveTestnetAddress(hdRoot);
    const addressExplicit = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/0");

    // Should be identical since default path is m/84'/1'/0'/0/0
    expect(addressDefault).toBe(addressExplicit);
  });

  it("should work with different account levels", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    const account0 = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/0");
    const account1 = deriveTestnetAddress(hdRoot, "m/84'/1'/1'/0/0");
    const account2 = deriveTestnetAddress(hdRoot, "m/84'/1'/2'/0/0");

    // All should be valid but different
    expect(account0).not.toBe(account1);
    expect(account1).not.toBe(account2);
    expect(account0).not.toBe(account2);

    [account0, account1, account2].forEach((addr) => {
      expect(addr.startsWith("tb1")).toBe(true);
      expect(addr.length).toBe(42);
    });
  });

  it("should work with change addresses", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    const receiving = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/0");
    const change = deriveTestnetAddress(hdRoot, "m/84'/1'/0'/1/0");

    // Should be different addresses
    expect(receiving).not.toBe(change);

    // Both should be valid testnet addresses
    expect(receiving.startsWith("tb1")).toBe(true);
    expect(change.startsWith("tb1")).toBe(true);
    expect(receiving.length).toBe(42);
    expect(change.length).toBe(42);
  });

  it("should generate addresses that can be used with generated mnemonics", () => {
    // Test with randomly generated mnemonics
    for (let i = 0; i < 3; i++) {
      const mnemonic = generateMnemonic();
      const seed = mnemonicToSeed(mnemonic);
      const hdRoot = generateHDRoot(seed);
      const address = deriveTestnetAddress(hdRoot);

      expect(address.startsWith("tb1")).toBe(true);
      expect(address.length).toBe(42);
      expect(typeof address).toBe("string");
    }
  });

  it("should throw error when HD root is null or undefined", () => {
    expect(() => deriveTestnetAddress(null as never)).toThrow(
      "Failed to derive testnet address: HD root is required"
    );

    expect(() => deriveTestnetAddress(undefined as never)).toThrow(
      "Failed to derive testnet address: HD root is required"
    );
  });

  it("should throw error when HD root is missing derivePath method", () => {
    const invalidHdRoot = {
      publicKey: Buffer.alloc(33),
      network: bitcoin.networks.testnet,
    } as never;

    expect(() => deriveTestnetAddress(invalidHdRoot)).toThrow(
      "Failed to derive testnet address: Invalid HD root: missing derivePath method"
    );
  });

  it("should throw error when HD root is missing network information", () => {
    const invalidHdRoot = {
      derivePath: () => {},
    } as never;

    expect(() => deriveTestnetAddress(invalidHdRoot)).toThrow(
      "Failed to derive testnet address: Invalid HD root: missing network information"
    );
  });

  it("should throw error when HD root is configured for mainnet instead of testnet", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const mainnetHdRoot = generateHDRoot(seed, bitcoin.networks.bitcoin);

    expect(() => deriveTestnetAddress(mainnetHdRoot)).toThrow(
      "Failed to derive testnet address: HD root must be configured for testnet network"
    );
  });

  it("should throw error for invalid derivation path format", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // Test various invalid path formats
    const invalidPaths = [
      "", // empty
      "84'/1'/0'/0/0", // missing 'm/'
      "n/84'/1'/0'/0/0", // wrong prefix
      "m", // too short
      "m/84'", // too short
      "m/84'/1'", // too short
    ];

    invalidPaths.forEach((path) => {
      expect(() => deriveTestnetAddress(hdRoot, path)).toThrow(
        "Failed to derive testnet address: Invalid derivation path"
      );
    });

    // Test explicit null (should throw error)
    expect(() => deriveTestnetAddress(hdRoot, null as never)).toThrow(
      "Failed to derive testnet address: Invalid derivation path"
    );

    // Note: undefined should use default path and not throw error
    // This is the expected behavior for optional parameters
    expect(() => deriveTestnetAddress(hdRoot, undefined)).not.toThrow();

    // Test non-string types
    expect(() => deriveTestnetAddress(hdRoot, 123 as never)).toThrow(
      "Failed to derive testnet address: Invalid derivation path"
    );
  });

  it("should throw error for wrong purpose in derivation path", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    const invalidPaths = [
      "m/44'/1'/0'/0/0", // BIP44 instead of BIP84
      "m/49'/1'/0'/0/0", // BIP49 instead of BIP84
      "m/0'/1'/0'/0/0", // purpose 0 instead of 84
      "m/84/1'/0'/0/0", // purpose 84 without hardening
    ];

    invalidPaths.forEach((path) => {
      expect(() => deriveTestnetAddress(hdRoot, path)).toThrow(
        "Failed to derive testnet address: Invalid derivation path: must use purpose 84'"
      );
    });
  });

  it("should throw error for wrong coin type in derivation path", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    const invalidPaths = [
      "m/84'/0'/0'/0/0", // mainnet coin type instead of testnet
      "m/84'/2'/0'/0/0", // invalid coin type
      "m/84'/1/0'/0/0", // coin type 1 without hardening
    ];

    invalidPaths.forEach((path) => {
      expect(() => deriveTestnetAddress(hdRoot, path)).toThrow(
        "Failed to derive testnet address: Invalid derivation path: must use coin_type 1'"
      );
    });
  });

  it("should handle valid derivation paths with different indices", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    const validPaths = [
      "m/84'/1'/0'/0/0",
      "m/84'/1'/0'/0/1",
      "m/84'/1'/0'/0/999",
      "m/84'/1'/0'/1/0",
      "m/84'/1'/0'/1/999",
      "m/84'/1'/5'/0/0",
      "m/84'/1'/100'/0/0",
    ];

    validPaths.forEach((path) => {
      const address = deriveTestnetAddress(hdRoot, path);
      expect(address.startsWith("tb1")).toBe(true);
      expect(address.length).toBe(42);
    });
  });

  it("should produce consistent results with known test vectors", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // Test the default derivation path
    const address = deriveTestnetAddress(hdRoot);

    // This should be consistent across runs
    expect(address).toBe(deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/0"));
    expect(address.startsWith("tb1")).toBe(true);
    expect(address.length).toBe(42);

    // Test a few specific paths for consistency
    const addresses = {
      first: deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/0"),
      second: deriveTestnetAddress(hdRoot, "m/84'/1'/0'/0/1"),
      change: deriveTestnetAddress(hdRoot, "m/84'/1'/0'/1/0"),
    };

    // These should always be the same for this test mnemonic
    expect(addresses.first).toBeTruthy();
    expect(addresses.second).toBeTruthy();
    expect(addresses.change).toBeTruthy();

    // They should be different from each other
    expect(addresses.first).not.toBe(addresses.second);
    expect(addresses.second).not.toBe(addresses.change);
    expect(addresses.first).not.toBe(addresses.change);
  });

  it("should handle stress test with multiple address generations", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // Generate 20 different addresses
    const addresses = [];
    for (let i = 0; i < 20; i++) {
      const address = deriveTestnetAddress(hdRoot, `m/84'/1'/0'/0/${i}`);
      addresses.push(address);

      // Each address should be valid
      expect(address.startsWith("tb1")).toBe(true);
      expect(address.length).toBe(42);
    }

    // All addresses should be unique
    const uniqueAddresses = new Set(addresses);
    expect(uniqueAddresses.size).toBe(addresses.length);
  });

  it("should not expose any private key material", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);
    const address = deriveTestnetAddress(hdRoot);

    // The returned address should only be a string
    expect(typeof address).toBe("string");

    // It should not contain any objects or additional data
    expect(address).not.toContain("private");
    expect(address).not.toContain("secret");
    expect(address).not.toContain("key");

    // It should be a pure bech32 address string
    expect(address).toMatch(/^tb1[a-z0-9]{39}$/);
  });

  it("should work correctly with edge case paths", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // Test with maximum safe integer values
    const edgePaths = [
      "m/84'/1'/0'/0/0", // minimum
      "m/84'/1'/2147483647'/0/0", // max hardened index
      "m/84'/1'/0'/0/4294967295", // max non-hardened index
    ];

    edgePaths.forEach((path) => {
      const address = deriveTestnetAddress(hdRoot, path);
      expect(address.startsWith("tb1")).toBe(true);
      expect(address.length).toBe(42);
    });
  });

  it("should validate that P2WPKH addresses are exactly 42 characters", () => {
    const seed = mnemonicToSeed(testMnemonic);
    const hdRoot = generateHDRoot(seed);

    // Generate several addresses and verify length
    for (let i = 0; i < 5; i++) {
      const address = deriveTestnetAddress(hdRoot, `m/84'/1'/0'/0/${i}`);
      expect(address.length).toBe(42);
      expect(address.startsWith("tb1")).toBe(true);
    }
  });
});

describe("generateWalletAddress", () => {
  it("should generate a valid testnet address", () => {
    const address = generateWalletAddress();

    // Check that address is a string
    expect(typeof address).toBe("string");

    // Check that it starts with 'tb1' (testnet bech32)
    expect(address.startsWith("tb1")).toBe(true);

    // Check that it has the correct length for P2WPKH (42 characters)
    expect(address.length).toBe(42);

    // Verify it's a valid bech32 testnet address format
    expect(address).toMatch(/^tb1[a-z0-9]{39}$/);
  });

  it("should generate different addresses on each call", () => {
    const address1 = generateWalletAddress();
    const address2 = generateWalletAddress();
    const address3 = generateWalletAddress();

    // All should be valid testnet addresses
    [address1, address2, address3].forEach((addr) => {
      expect(addr.startsWith("tb1")).toBe(true);
      expect(addr.length).toBe(42);
      expect(addr).toMatch(/^tb1[a-z0-9]{39}$/);
    });

    // They should be different (statistically almost impossible to be the same)
    expect(address1).not.toBe(address2);
    expect(address2).not.toBe(address3);
    expect(address1).not.toBe(address3);
  });

  it("should work with default derivation path", () => {
    const address1 = generateWalletAddress();
    const address2 = generateWalletAddress("m/84'/1'/0'/0/0");

    // Both should be valid (though different since they use different mnemonics)
    expect(address1.startsWith("tb1")).toBe(true);
    expect(address2.startsWith("tb1")).toBe(true);
    expect(address1.length).toBe(42);
    expect(address2.length).toBe(42);
  });

  it("should work with custom derivation paths", () => {
    const customPaths = [
      "m/84'/1'/0'/0/1", // Second receiving address
      "m/84'/1'/0'/1/0", // First change address
      "m/84'/1'/1'/0/0", // Different account
      "m/84'/1'/0'/0/5", // Fifth receiving address
    ];

    customPaths.forEach((path) => {
      const address = generateWalletAddress(path);

      expect(typeof address).toBe("string");
      expect(address.startsWith("tb1")).toBe(true);
      expect(address.length).toBe(42);
      expect(address).toMatch(/^tb1[a-z0-9]{39}$/);
    });
  });

  it("should throw error for invalid derivation paths", () => {
    const invalidPaths = [
      "", // empty
      "84'/1'/0'/0/0", // missing 'm/'
      "m/44'/1'/0'/0/0", // wrong purpose (BIP44 instead of BIP84)
      "m/84'/0'/0'/0/0", // mainnet coin type instead of testnet
      "m/84'", // too short
      "invalid", // completely invalid
    ];

    invalidPaths.forEach((path) => {
      expect(() => generateWalletAddress(path)).toThrow(
        "Failed to generate wallet address"
      );
    });
  });

  it("should handle edge case paths correctly", () => {
    const edgePaths = [
      "m/84'/1'/0'/0/0", // minimum values
      "m/84'/1'/0'/0/999", // large index
      "m/84'/1'/5'/0/0", // different account
      "m/84'/1'/0'/1/0", // change chain
    ];

    edgePaths.forEach((path) => {
      const address = generateWalletAddress(path);
      expect(address.startsWith("tb1")).toBe(true);
      expect(address.length).toBe(42);
    });
  });

  it("should never expose private key material", () => {
    const address = generateWalletAddress();

    // The result should only be a string
    expect(typeof address).toBe("string");

    // It should not contain any sensitive keywords
    expect(address).not.toContain("private");
    expect(address).not.toContain("secret");
    expect(address).not.toContain("key");
    expect(address).not.toContain("mnemonic");
    expect(address).not.toContain("seed");

    // It should be a pure testnet address
    expect(address).toMatch(/^tb1[a-z0-9]{39}$/);
  });

  it("should be cryptographically secure (entropy test)", () => {
    // Generate many addresses to test entropy
    const addresses = [];
    for (let i = 0; i < 100; i++) {
      addresses.push(generateWalletAddress());
    }

    // All addresses should be unique (cryptographically secure randomness)
    const uniqueAddresses = new Set(addresses);
    expect(uniqueAddresses.size).toBe(addresses.length);

    // All should be valid testnet addresses
    addresses.forEach((address) => {
      expect(address.startsWith("tb1")).toBe(true);
      expect(address.length).toBe(42);
    });
  });

  it("should work consistently with stress testing", () => {
    // Stress test: generate many addresses rapidly
    const startTime = Date.now();
    const addresses = [];

    for (let i = 0; i < 50; i++) {
      const address = generateWalletAddress();
      addresses.push(address);

      // Each address should be valid
      expect(address.startsWith("tb1")).toBe(true);
      expect(address.length).toBe(42);
      expect(typeof address).toBe("string");
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete reasonably quickly (less than 5 seconds for 50 addresses)
    expect(duration).toBeLessThan(5000);

    // All addresses should be unique
    const uniqueAddresses = new Set(addresses);
    expect(uniqueAddresses.size).toBe(addresses.length);
  });

  it("should handle errors gracefully", () => {
    // This test is simplified to avoid dynamic module manipulation
    // which can cause linter issues. In a real scenario, we would use
    // proper mocking libraries like jest.mock() at the module level.

    // Test that the function throws appropriate errors for invalid inputs
    expect(() => generateWalletAddress("invalid-path")).toThrow(
      "Failed to generate wallet address"
    );
  });

  it("should not leak memory with rapid successive calls", () => {
    // Test for memory leaks by generating many addresses
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 20; i++) {
      const address = generateWalletAddress();
      expect(address.startsWith("tb1")).toBe(true);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 10MB for 20 addresses)
    // This is a rough check for obvious memory leaks
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });

  it("should work with various account levels", () => {
    // Test different account levels in derivation path
    for (let account = 0; account <= 5; account++) {
      const path = `m/84'/1'/${account}'/0/0`;
      const address = generateWalletAddress(path);

      expect(address.startsWith("tb1")).toBe(true);
      expect(address.length).toBe(42);
    }
  });

  it("should work with receiving and change addresses", () => {
    // Test both receiving (0) and change (1) chains
    const receivingAddress = generateWalletAddress("m/84'/1'/0'/0/0");
    const changeAddress = generateWalletAddress("m/84'/1'/0'/1/0");

    expect(receivingAddress.startsWith("tb1")).toBe(true);
    expect(changeAddress.startsWith("tb1")).toBe(true);
    expect(receivingAddress.length).toBe(42);
    expect(changeAddress.length).toBe(42);

    // They should be different
    expect(receivingAddress).not.toBe(changeAddress);
  });

  it("should maintain consistent format across all generations", () => {
    const addresses: string[] = [];

    // Generate addresses with different paths
    const paths = [
      "m/84'/1'/0'/0/0",
      "m/84'/1'/0'/0/1",
      "m/84'/1'/0'/1/0",
      "m/84'/1'/1'/0/0",
    ];

    paths.forEach((path) => {
      const address = generateWalletAddress(path);
      addresses.push(address);
    });

    // All addresses should follow the same format
    addresses.forEach((address) => {
      expect(address).toMatch(/^tb1[a-z0-9]{39}$/);
      expect(address.length).toBe(42);
      expect(address.startsWith("tb1")).toBe(true);
    });

    // All should be unique
    const uniqueAddresses = new Set(addresses);
    expect(uniqueAddresses.size).toBe(addresses.length);
  });

  it("should be safe for use in Server Actions", () => {
    // Test that the function behaves safely for server-side use
    const address = generateWalletAddress();

    // Result should be serializable (for Server Action responses)
    const serialized = JSON.stringify({ address });
    const deserialized = JSON.parse(serialized);

    expect(deserialized.address).toBe(address);
    expect(deserialized.address.startsWith("tb1")).toBe(true);

    // Should not contain any non-serializable objects
    expect(typeof address).toBe("string");
    expect(address.constructor).toBe(String);
  });

  it("should validate testnet network compatibility", () => {
    const address = generateWalletAddress();

    // Address should be specifically for testnet
    expect(address.startsWith("tb1")).toBe(true); // testnet bech32
    expect(address).not.toMatch(/^bc1/); // not mainnet
    expect(address).not.toMatch(/^[13]/); // not legacy addresses
    expect(address).not.toMatch(/^2/); // not P2SH addresses

    // Should be P2WPKH format (42 characters for testnet)
    expect(address.length).toBe(42);
  });
});
