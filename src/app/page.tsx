// src/app/page.tsx
"use client"; // This page now uses client-side state and components

import React, { useState } from "react";
import Image from "next/image"; // Keep Image if needed for branding, or remove

// Import the components we created
import { PaymentForm } from "@/components/payment/PaymentForm";
import { QrCodeDisplay } from "@/components/payment/QrCodeDisplay";
import type { PaymentRequestData } from "@/actions/payment"; // Type for state
import { Button } from "@/components/ui/button"; // Import Button

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-8 text-center">
        {/* Optional: Add a logo or branding here */}
        {/* <Image
          className="dark:invert mx-auto mb-4"
          src="/next.svg" // Replace with your app's logo
          alt="App Logo"
          width={120}
          height={25}
          priority
        /> */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">
          Bitcoin Testnet Payment
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
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
              variant="outline"
              onClick={() => setPaymentRequest(null)} // Allow creating a new request
              className="w-full mt-6"
            >
              Create Another Payment Request
            </Button>
          </>
        )}
      </main>

      <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        <p className="mt-1">
          This application uses the Bitcoin test network. Do not use real Bitcoin.
        </p>
        {/* Optional: Links to GitHub, documentation, etc. */}
        {/* <p className="mt-2">
          <a href="#" className="hover:underline">GitHub</a> | <a href="#" className="hover:underline">Docs</a>
        </p> */}
      </footer>
    </div>
  );
}
