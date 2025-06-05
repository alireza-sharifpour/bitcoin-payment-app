// src/app/payment/[address]/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { QrCodeDisplay } from "@/components/payment/QrCodeDisplay";
import { PaymentStatus } from "@/components/payment/PaymentStatus";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  getPaymentStatus,
  getAllPaymentStatuses,
} from "@/lib/store/payment-status";
import { generateBip21Uri } from "@/lib/validation/payment";
import { isValidTestnetAddress } from "@/lib/bitcoin/wallet";
import type { PaymentRequestData } from "@/actions/payment";

interface PaymentPageProps {
  params: Promise<{
    address: string;
  }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { address } = await params;

  // Validate address format (Bitcoin testnet addresses)
  if (!isValidTestnetAddress(address)) {
    notFound();
  }

  // Get payment status from the store
  const paymentStatus = await getPaymentStatus(address);

  if (!paymentStatus) {
    notFound();
  }

  // Get full payment data to reconstruct PaymentRequestData
  const allStatuses = await getAllPaymentStatuses();
  const fullPaymentData = allStatuses.find(
    (status) => status.address === address
  );

  if (!fullPaymentData) {
    notFound();
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
          <PaymentStatus address={address} />
          <Button variant="outline" asChild className="w-full">
            <Link href="/">Create Another Payment Request</Link>
          </Button>
        </div>
      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} Bitcoin Testnet Payment. All rights
          reserved.
        </p>
        <p className="mt-1">
          This application uses the Bitcoin test network. Do not use real
          Bitcoin.
        </p>
      </footer>
    </div>
  );
}
