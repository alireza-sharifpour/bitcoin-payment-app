// src/hooks/usePaymentStatus.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { PaymentStatusResponse, PaymentStatus } from "../../types"; // Updated path to correct types location

/**
 * Fetches the payment status for a given Bitcoin address.
 *
 * @param {string} address - The Bitcoin address to check the status for.
 * @returns {Promise<PaymentStatusResponse>} A promise that resolves to the payment status.
 * @throws Will throw an error if the fetch request fails.
 */
async function fetchPaymentStatus(
  address: string
): Promise<PaymentStatusResponse> {
  // Construct the API endpoint URL
  const apiUrl = `/api/payment-status/${encodeURIComponent(address)}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    // Try to parse error message from response body
    let errorMessage = `Failed to fetch payment status: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Ignore if response body is not JSON or empty
    }
    throw new Error(errorMessage);
  }

  // Parse the JSON response
  const data: PaymentStatusResponse = await response.json();
  return data;
}

/**
 * Configuration options for payment status polling
 */
interface PaymentStatusOptions {
  /** Enable automatic polling as fallback when webhooks might fail */
  enablePolling?: boolean;
  /** Custom refetch interval in milliseconds (default: 10000ms for fallback) */
  refetchInterval?: number;
  /** Whether to use more aggressive polling based on payment state */
  aggressivePolling?: boolean;
}

/**
 * Custom React Query hook to fetch and manage payment status for a Bitcoin address.
 *
 * This hook encapsulates the logic for fetching payment status using TanStack Query.
 * It handles loading, error, and data states automatically. The query is only
 * enabled when a valid address is provided.
 *
 * Primary update mechanism: Manual refetch (triggered by webhook events)
 * Fallback mechanism: Automatic polling at configured intervals
 * SSR-optimized: Uses hydrated data from server-side prefetch when available
 *
 * @param {string | null | undefined} address - The Bitcoin testnet address to monitor.
 *                                            The query is disabled if address is null or undefined.
 * @param {PaymentStatusOptions} options - Configuration options for polling behavior
 * @returns {object} The result object from TanStack Query's useQuery, including:
 *                   - data: The payment status response.
 *                   - isLoading: True if the query is currently fetching.
 *                   - isError: True if the query encountered an error.
 *                   - error: The error object if an error occurred.
 *                   - refetch: A function to manually refetch the query.
 *
 * @example
 * // Manual refetch only (primary method)
 * const { data, isLoading, refetch } = usePaymentStatus("tb1...");
 *
 * @example
 * // With polling fallback enabled
 * const { data, isLoading, refetch } = usePaymentStatus("tb1...", {
 *   enablePolling: true,
 *   refetchInterval: 15000
 * });
 */
export function usePaymentStatus(
  address: string | null | undefined,
  options: PaymentStatusOptions = {}
) {
  // Extract options with defaults
  const {
    enablePolling = false,
    refetchInterval = 10000, // 10 seconds default for fallback polling
    aggressivePolling = false,
  } = options;

  return useQuery<PaymentStatusResponse, Error>({
    // Query key: A unique identifier for this query.
    // Includes the address to ensure data is cached per address.
    queryKey: ["paymentStatus", address],

    // Query function: The async function that fetches the data.
    // It's only called if the query is enabled.
    queryFn: async () => {
      // Ensure address is not null/undefined before fetching, though `enabled` handles this.
      if (!address) {
        // This should ideally not be reached if `enabled` is working correctly.
        throw new Error("Address is required to fetch payment status.");
      }
      return fetchPaymentStatus(address);
    },

    // Enabled option: Controls whether the query will automatically run.
    // The query is enabled only if a valid address string is provided.
    enabled: !!address && typeof address === "string" && address.length > 0,

    // Stale time: Keep data fresh for a longer period since we use SSR hydration
    staleTime: 60 * 1000, // 1 minute - avoid immediate refetch after SSR

    // Garbage collection time: How long unused data is kept in cache
    gcTime: 1000 * 60 * 5, // 5 minutes

    // Refetch interval: Configurable polling as fallback mechanism
    // Primary mechanism is manual refetch, this serves as backup
    refetchInterval: enablePolling
      ? (context) => {
          const { state } = context;

          // Don't poll if there's an error or no data
          if (state.error || !state.data) {
            return false;
          }

          // Adjust polling based on payment status and aggressive polling setting
          if (
            aggressivePolling &&
            (state.data.status === PaymentStatus.AWAITING_PAYMENT ||
              state.data.status === PaymentStatus.PAYMENT_DETECTED)
          ) {
            // More frequent polling while awaiting payment
            return Math.min(refetchInterval, 5000); // Cap at 5 seconds for aggressive mode
          }

          // Stop polling once payment is confirmed
          if (state.data.status === PaymentStatus.CONFIRMED) {
            return false;
          }

          // Use configured interval for other states
          return refetchInterval;
        }
      : false,

    // Refetch on window focus is generally good for payment status
    refetchOnWindowFocus: true,

    // Retry configuration for network resilience
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error.message.includes("400") || error.message.includes("404")) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
