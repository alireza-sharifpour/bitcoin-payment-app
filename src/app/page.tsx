// src/app/page.tsx
"use client";

import React from "react";
import { PaymentForm } from "@/components/payment/PaymentForm";

export default function Home() {
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
        <PaymentForm />
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
