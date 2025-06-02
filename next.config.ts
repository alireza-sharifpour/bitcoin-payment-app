// next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer, dev }) { // Added 'dev' to the destructured options, as it's often available though not always used here
    // Enable WebAssembly experiments
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true, // Recommended for modern Webpack features, good to have
    };

    // Add rule to handle .wasm files
    // This ensures that .wasm files are correctly processed as async WebAssembly modules
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Some libraries, especially those with crypto functions like bitcoinjs-lib (which uses tiny-secp256k1),
    // might attempt to use Node.js core modules like 'fs' on the client-side if not handled.
    // Providing a fallback resolves these issues for client-side bundles.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, // 'fs' is not available in the browser, so we provide 'false' to ignore it.
        // You might need to add other fallbacks here if other Node.js core module errors appear,
        // e.g., 'path': false, 'crypto': false (though 'crypto' often has browser alternatives or polyfills)
      };
    }

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
