// src/components/providers/QueryProvider.tsx
"use client";

import React from "react";
import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Create a new QueryClient instance with SSR-optimized defaults
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent immediate refetch after SSR
        staleTime: 60 * 1000, // 1 minute
        // Default gcTime: 5 minutes (garbage collection time)
        gcTime: 1000 * 60 * 5,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    // Note: This function should be used with React's cache() for server components
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

/**
 * QueryProvider component
 *
 * This component sets up the TanStack Query client and provides it to the rest
 * of the application. It also includes ReactQueryDevtools for development.
 * Optimized for SSR/hydration with proper client instance management.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be wrapped by the provider
 * @returns {JSX.Element} The QueryClientProvider wrapping the children
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may
  // suspend because React will throw away the client on the initial
  // render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* ReactQueryDevtools is useful for debugging query states during development */}
      {/* It will only be included in development builds */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// Export this for use in server components
export { getQueryClient };
