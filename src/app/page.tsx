// src/app/page.tsx
"use client"; // This page now uses client-side state and components

import React, { useState } from "react";
// import Image from "next/image"; // Uncomment if you add a logo
import { Button } from "@/components/ui/button"; // Button will be themed by globals.css

import { PaymentForm } from "@/components/payment/PaymentForm";
import { QrCodeDisplay } from "@/components/payment/QrCodeDisplay";
import type { PaymentRequestData } from "@/actions/payment"; // Type for state

/**
 * Home page for the Bitcoin Testnet Payment Application.
 *
 * This page allows users to generate a Bitcoin payment request and see a QR code
 * for the payment. It manages the state for the payment request data.
 */
export default function Home() {
  // State to hold the payment request data once created
  const [paymentRequest, setPaymentRequest] =
    useState<PaymentRequestData | null>(null);

  // Callback function to be passed to PaymentForm
  // This will be called when a payment request is successfully created
  const handlePaymentRequestCreated = (data: PaymentRequestData) => {
    setPaymentRequest(data);
  };

  return (
    // Use bg-background for the main page container, ensuring it fills the viewport
    // The body tag already has bg-background and text-foreground via globals.css
    // This div ensures content is centered and uses padding.
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <header className="mb-8 text-center">
        {/* Optional: Add a logo here */}
        {/* <Image
          className="dark:invert mx-auto mb-4" // dark:invert might need review with new theme
          src="/your-logo.svg" // Replace with your app's logo
          alt="App Logo"
          width={120}
          height={25}
          priority
        /> */}
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Bitcoin Testnet Payment
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate a testnet Bitcoin QR code payment request.
        </p>
      </header>

      <main className="w-full max-w-md">
        {!paymentRequest ? (
          // Show PaymentForm if no payment request has been created yet
          <PaymentForm onPaymentRequestCreated={handlePaymentRequestCreated} />
        ) : (
          // Show QrCodeDisplay once payment request data is available
          <>
            <QrCodeDisplay paymentRequest={paymentRequest} />
            <Button
              variant="outline" // Outline buttons will use themed border and text colors
              onClick={() => setPaymentRequest(null)} // Allow creating a new request
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
        {/* Example of themed links if needed:
        <p className="mt-2">
          <a href="#" className="text-primary hover:underline">GitHub</a> | <a href="#" className="text-primary hover:underline">Docs</a>
        </p>
        */}
      </footer>
    </div>
  );
}
