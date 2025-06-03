// src/components/providers/QueryProvider.tsx
"use client"; // This directive is essential for TanStack Query provider

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Create a new QueryClient instance
// We can configure default options for queries and mutations here if needed
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default staleTime: 0 means queries become stale immediately
      // Default gcTime: 5 minutes (garbage collection time)
      // Consider setting a global staleTime if appropriate for your app
      // staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

/**
 * QueryProvider component
 *
 * This component sets up the TanStack Query client and provides it to the rest
 * of the application. It also includes ReactQueryDevtools for development.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be wrapped by the provider
 * @returns {JSX.Element} The QueryClientProvider wrapping the children
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* ReactQueryDevtools is useful for debugging query states during development */}
      {/* It will only be included in development builds */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
