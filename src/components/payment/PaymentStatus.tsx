// src/components/payment/PaymentStatus.tsx
"use client";

import React from "react";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { PaymentStatus as PaymentStatusEnum } from "../../../types";

interface PaymentStatusProps {
  address: string;
  onRetry?: () => void;
}

export function PaymentStatus({ address, onRetry }: PaymentStatusProps) {
  const {
    data: paymentStatus,
    isLoading,
    isError,
    error,
    refetch,
  } = usePaymentStatus(address, {
    enablePolling: true,
    refetchInterval: 10000, // 10 seconds
    aggressivePolling: true, // More frequent polling for awaiting payments
  });

  const testnetExplorerUrl = process.env.NEXT_PUBLIC_TESTNET_EXPLORER_ADDRESS;

  // Handle loading state
  if (isLoading || (!paymentStatus && !isError)) {
    return (
      <Card className="w-full max-w-md mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Checking payment status...</p>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (isError || !paymentStatus) {
    return (
      <Card className="w-full max-w-md mt-6 border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {error?.message ||
              "Unable to check payment status. Please try again."}
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="w-full"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render status based on current payment status
  const renderStatusContent = () => {
    switch (paymentStatus.status) {
      case PaymentStatusEnum.AWAITING_PAYMENT:
        return (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Clock className="h-5 w-5" />
                Awaiting Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  Waiting for payment to be sent to the address above.
                </p>
                <p className="text-sm text-muted-foreground">
                  This page will automatically update when a payment is
                  detected.
                </p>
              </div>
            </CardContent>
          </>
        );

      case PaymentStatusEnum.PAYMENT_DETECTED:
        return (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                Payment Detected
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-6">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-4 bg-orange-600 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-orange-600">
                  Payment detected in the blockchain!
                </p>
                <p className="text-muted-foreground">
                  Waiting for confirmation...
                </p>
                {paymentStatus.confirmations !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Confirmations: {paymentStatus.confirmations}/1
                  </p>
                )}
                {paymentStatus.transactionId && (
                  <div className="text-xs text-muted-foreground">
                    <p className="mb-1">Transaction:</p>
                    <a
                      href={`${testnetExplorerUrl}${paymentStatus.transactionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline break-all"
                    >
                      {paymentStatus.transactionId}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </>
        );

      case PaymentStatusEnum.CONFIRMED:
        return (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Payment Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-6">
                <div className="relative">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                  <div className="absolute inset-0 rounded-full border-2 border-green-600 animate-ping" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-green-600 text-lg">
                  Payment Successfully Confirmed!
                </p>
                <p className="text-muted-foreground">
                  Your Bitcoin testnet payment has been confirmed on the
                  blockchain.
                </p>
                {paymentStatus.confirmations !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Confirmations: {paymentStatus.confirmations}
                  </p>
                )}
                {paymentStatus.transactionId && (
                  <div className="text-xs text-muted-foreground">
                    <p className="mb-1">Transaction:</p>
                    <a
                      href={`${testnetExplorerUrl}${paymentStatus.transactionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline break-all"
                    >
                      {paymentStatus.transactionId}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </>
        );

      case PaymentStatusEnum.ERROR:
        return (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Payment Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-6">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-destructive">
                  An error occurred while processing the payment.
                </p>
                <p className="text-muted-foreground">
                  {paymentStatus.errorMessage ||
                    "Please try again or contact support if the issue persists."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="flex-1"
                >
                  Check Again
                </Button>
                {onRetry && (
                  <Button
                    variant="default"
                    onClick={onRetry}
                    className="flex-1"
                  >
                    Create New Payment
                  </Button>
                )}
              </div>
            </CardContent>
          </>
        );

      default:
        return (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Unknown Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Unable to determine payment status. Please try refreshing.
              </p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="w-full mt-4"
              >
                Refresh Status
              </Button>
            </CardContent>
          </>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mt-6">
      {renderStatusContent()}
      {paymentStatus.lastUpdated && (
        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground text-center">
            Last updated:{" "}
            {new Date(paymentStatus.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
      )}
    </Card>
  );
}
