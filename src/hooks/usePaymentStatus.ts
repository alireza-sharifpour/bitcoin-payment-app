// src/hooks/usePaymentStatus.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { PaymentStatusResponse } from "../../types"; // Updated path to correct types location

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
 * Custom React Query hook to fetch and manage payment status for a Bitcoin address.
 *
 * This hook encapsulates the logic for fetching payment status using TanStack Query.
 * It handles loading, error, and data states automatically. The query is only
 * enabled when a valid address is provided.
 *
 * @param {string | null | undefined} address - The Bitcoin testnet address to monitor.
 *                                            The query is disabled if address is null or undefined.
 * @returns {object} The result object from TanStack Query's useQuery, including:
 *                   - data: The payment status response.
 *                   - isLoading: True if the query is currently fetching.
 *                   - isError: True if the query encountered an error.
 *                   - error: The error object if an error occurred.
 *                   - refetch: A function to manually refetch the query.
 *
 * @example
 * const { data, isLoading, isError, error } = usePaymentStatus("tb1...");
 * if (isLoading) return <p>Loading status...</p>;
 * if (isError) return <p>Error: {error?.message}</p>;
 * if (data) return <p>Status: {data.status}</p>;
 */
export function usePaymentStatus(address: string | null | undefined) {
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

    // Stale time: How long data is considered fresh (default 0).
    // staleTime: 0,

    // Garbage collection time: How long unused data is kept in cache (default 5 minutes).
    // gcTime: 1000 * 60 * 5,

    // Refetch interval: How often to automatically refetch (Phase 6).
    // For now, we'll rely on manual refetch or window focus refetch.
    // refetchInterval: false, // Explicitly false, will be configured in Phase 6

    // Other options like retry, refetchOnWindowFocus can be configured here.
    // refetchOnWindowFocus: true, // Default is true, usually good
  });
}
