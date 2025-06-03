// src/components/payment/QrCodeDisplay.tsx
"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button"; // Will use themed styles
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Will use themed styles
import { Input } from "@/components/ui/input"; // Will use themed styles
import { Label } from "@/components/ui/label"; // Will use themed styles

import type { PaymentRequestData } from "@/actions/payment";

interface QrCodeDisplayProps {
  paymentRequest: PaymentRequestData;
}

export function QrCodeDisplay({ paymentRequest }: QrCodeDisplayProps) {
  if (!paymentRequest) {
    return null;
  }

  const { paymentUri, address, amount } = paymentRequest;

  const handleCopyToClipboard = async (
    textToCopy: string,
    fieldName: string
  ) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(`${fieldName} copied to clipboard!`);
    } catch (err) {
      toast.error(`Failed to copy ${fieldName}. Please try again.`);
      console.error("Failed to copy to clipboard:", err);
    }
  };

  // Card foreground color (text-main: #1A1A1A in light mode)
  const qrFgColor = "#1A1A1A";
  // QR code's own background explicitly white for contrast on the card.
  const actualQrBgColor = "#FFFFFF";

  return (
    // Card component uses --card and --card-foreground
    <Card className="w-full max-w-md mt-6">
      <CardHeader>
        {/* CardTitle uses --card-foreground */}
        <CardTitle>Scan to Pay</CardTitle>
        {/* CardDescription uses --muted-foreground (applied to card's text) */}
        <CardDescription>
          Use your Bitcoin testnet wallet to scan the QR code below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {paymentUri && (
          // This div provides a white padded area for the QR code.
          <div className="p-4 bg-white rounded-lg shadow">
            <QRCodeSVG
              value={paymentUri}
              size={256}
              bgColor={actualQrBgColor} // QR code modules background (white)
              fgColor={qrFgColor} // QR code modules foreground (dark)
              level="Q"
              includeMargin={true} // This margin area will also be actualQrBgColor
            />
          </div>
        )}

        <div className="w-full space-y-3 pt-4">
          <div>
            {/* Label uses themed text color */}
            <Label htmlFor="bitcoin-address">Bitcoin Address (Testnet)</Label>
            <div className="flex items-center space-x-2">
              {/* Input uses themed styles */}
              <Input
                id="bitcoin-address"
                type="text"
                value={address}
                readOnly
                className="truncate"
              />
              {/* Button with variant="outline" uses themed border/text */}
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
                value={amount.toString()}
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
      {/* CardFooter text explicitly set to use --muted-foreground */}
      <CardFooter className="text-xs text-muted-foreground">
        <p>
          Ensure you are sending testnet Bitcoin (tBTC). Real Bitcoin sent to
          this address will be lost.
        </p>
      </CardFooter>
    </Card>
  );
}
