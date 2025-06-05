// src/lib/query-client-server.ts
import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

// Use React's cache() function for server-side query client
// This ensures the same QueryClient instance is reused across server components
// in the same request, preventing data duplication and ensuring consistency
const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // With SSR, we usually want to set some default staleTime
          // above 0 to avoid refetching immediately on the client
          staleTime: 60 * 1000, // 1 minute
          gcTime: 1000 * 60 * 5, // 5 minutes
        },
      },
    })
);

export default getQueryClient;
