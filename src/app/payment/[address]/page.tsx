// src/app/payment/[address]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { QrCodeDisplay } from "@/components/payment/QrCodeDisplay";
import { PaymentStatus } from "@/components/payment/PaymentStatus";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getFullPaymentData } from "@/lib/store/payment-status";
import { generateBip21Uri } from "@/lib/validation/payment";
import { isValidTestnetAddress } from "@/lib/bitcoin/wallet";
import type { PaymentRequestData } from "@/actions/payment";
import type { PaymentStatusResponse } from "@/types";
import getQueryClient from "@/lib/query-client-server";

interface PaymentPageProps {
  params: Promise<{
    address: string;
  }>;
}

// Server-side version of the payment status fetch
// This should ideally reuse the same logic as the client-side version
// Consider extracting shared fetch logic to a separate module
async function fetchPaymentStatusServer(
  address: string
): Promise<PaymentStatusResponse> {
  try {
    // In a real app, you might want to call an internal API or service directly
    // This is better than duplicating logic - consider extracting to shared utility
    const fullPaymentData = await getFullPaymentData(address);

    if (!fullPaymentData) {
      throw new Error(`Payment data not found for address: ${address}`);
    }

    return {
      status: fullPaymentData.status,
      confirmations: fullPaymentData.confirmations,
      transactionId: fullPaymentData.transactionId,
      errorMessage: fullPaymentData.errorMessage,
      lastUpdated: fullPaymentData.lastUpdated,
    };
  } catch (error) {
    // Re-throw with more context for debugging
    throw new Error(
      `Failed to fetch payment status for ${address}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { address } = await params;

  // Validate address format (Bitcoin testnet addresses)
  if (!isValidTestnetAddress(address)) {
    notFound();
  }

  // Get full payment data from the store with error handling
  let fullPaymentData;
  try {
    fullPaymentData = await getFullPaymentData(address);
  } catch (error) {
    // Log error for monitoring but don't expose internal details
    console.error("Failed to fetch payment data:", error);
    notFound();
  }

  if (!fullPaymentData) {
    notFound();
  }

  // Use the cached server query client
  const queryClient = getQueryClient();

  // Prefetch the payment status data using the EXACT same query key
  // that the client-side hook will use
  try {
    await queryClient.prefetchQuery({
      queryKey: ["paymentStatus", address], // Must match exactly with client hook
      queryFn: () => fetchPaymentStatusServer(address),
      staleTime: 60 * 1000, // Must match client-side staleTime
    });
  } catch (error) {
    // Log error but continue rendering - client will retry
    console.error("Failed to prefetch payment status:", error);
    // Don't throw - let the page render with client-side fetching as fallback
  }

  // Reconstruct PaymentRequestData for QrCodeDisplay component
  const paymentRequest: PaymentRequestData = {
    address: fullPaymentData.address,
    amount: fullPaymentData.expectedAmount || 0,
    paymentUri: generateBip21Uri(
      fullPaymentData.address,
      fullPaymentData.expectedAmount || 0,
      "testnet"
    ),
    requestTimestamp: new Date(fullPaymentData.createdAt),
    webhookId: fullPaymentData.webhookId,
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Bitcoin Testnet Payment
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate a testnet Bitcoin QR code payment request.
          </p>
        </header>

        <main className="w-full max-w-md">
          <div className="space-y-6">
            <QrCodeDisplay paymentRequest={paymentRequest} />
            {/* The PaymentStatus component will automatically use the hydrated data */}
            <PaymentStatus address={address} />
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Create Another Payment Request</Link>
            </Button>
          </div>
        </main>

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Bitcoin Testnet Payment. All
            rights reserved.
          </p>
          <p className="mt-1">
            This application uses the Bitcoin test network. Do not use real
            Bitcoin.
          </p>
        </footer>
      </div>
    </HydrationBoundary>
  );
}
