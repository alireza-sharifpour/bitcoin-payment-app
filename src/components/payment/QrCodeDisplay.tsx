// src/components/payment/QrCodeDisplay.tsx
"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy } from "lucide-react"; // Using lucide-react for icons

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // For read-only display with copy button
import { Label } from "@/components/ui/label";

import type { PaymentRequestData } from "@/actions/payment"; // Type for props

interface QrCodeDisplayProps {
  paymentRequest: PaymentRequestData;
}

/**
 * QrCodeDisplay component
 *
 * Displays the QR code for a Bitcoin payment request, along with the address
 * and amount. Includes copy-to-clipboard functionality.
 *
 * @param {QrCodeDisplayProps} props - Component props.
 * @param {PaymentRequestData} props.paymentRequest - The payment request data.
 * @returns {JSX.Element | null} The QR code display component or null if no data.
 */
export function QrCodeDisplay({ paymentRequest }: QrCodeDisplayProps) {
  if (!paymentRequest) {
    return null; // Don't render if there's no payment request data
  }

  const { paymentUri, address, amount } = paymentRequest;

  const handleCopyToClipboard = async (textToCopy: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(`${fieldName} copied to clipboard!`);
    } catch (err) {
      toast.error(`Failed to copy ${fieldName}. Please try again.`);
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <Card className="w-full max-w-md mt-6">
      <CardHeader>
        <CardTitle>Scan to Pay</CardTitle>
        <CardDescription>
          Use your Bitcoin testnet wallet to scan the QR code below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {paymentUri && (
          <div className="p-4 bg-white rounded-lg shadow">
            <QRCodeSVG
              value={paymentUri}
              size={256} // Adjust size as needed
              bgColor="#ffffff"
              fgColor="#000000"
              level="Q" // Error correction level (L, M, Q, H)
              includeMargin={true}
            />
          </div>
        )}

        <div className="w-full space-y-3 pt-4">
          <div>
            <Label htmlFor="bitcoin-address">Bitcoin Address (Testnet)</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="bitcoin-address"
                type="text"
                value={address}
                readOnly
                className="truncate"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopyToClipboard(address, "Address")}
                aria-label="Copy Bitcoin Address"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="bitcoin-amount">Amount (BTC)</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="bitcoin-amount"
                type="text"
                value={amount.toString()} // Display amount
                readOnly
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  handleCopyToClipboard(amount.toString(), "Amount")
                }
                aria-label="Copy Amount"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>
          Ensure you are sending testnet Bitcoin (tBTC). Real Bitcoin sent to
          this address will be lost.
        </p>
      </CardFooter>
    </Card>
  );
}
