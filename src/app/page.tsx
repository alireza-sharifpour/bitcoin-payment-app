// src/app/page.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

import { PaymentForm } from "@/components/payment/PaymentForm";
import { QrCodeDisplay } from "@/components/payment/QrCodeDisplay";
import type { PaymentRequestData } from "@/actions/payment";

export default function Home() {
  const [paymentRequest, setPaymentRequest] =
    useState<PaymentRequestData | null>(null);

  const handlePaymentRequestCreated = (data: PaymentRequestData) => {
    setPaymentRequest(data);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      {/* The test div has been removed from here */}

      <header className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Bitcoin Testnet Payment
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate a testnet Bitcoin QR code payment request.
        </p>
      </header>

      <main className="w-full max-w-md">
        {!paymentRequest ? (
          <PaymentForm onPaymentRequestCreated={handlePaymentRequestCreated} />
        ) : (
          <>
            <QrCodeDisplay paymentRequest={paymentRequest} />
            <Button
              variant="outline"
              onClick={() => setPaymentRequest(null)}
              className="w-full mt-6"
            >
              Create Another Payment Request
            </Button>
          </>
        )}
      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        <p className="mt-1">
          This application uses the Bitcoin test network. Do not use real Bitcoin.
        </p>
      </footer>
    </div>
  );
}
