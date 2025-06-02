// src/components/payment/PaymentForm.tsx
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  createPaymentRequest,
  PaymentRequestData,
  CreatePaymentRequestResult,
} from "@/actions/payment";
import { paymentRequestSchema } from "@/lib/validation/payment";

// Define the form schema based on the Zod schema
// We only need the 'amount' field for the form input
type PaymentFormValues = z.infer<typeof paymentRequestSchema>;

interface PaymentFormProps {
  // Callback to pass the successful payment request data to the parent component
  onPaymentRequestCreated: (data: PaymentRequestData) => void;
}

/**
 * PaymentForm component
 *
 * This component renders a form for users to enter a BTC amount to request payment.
 * It handles form validation using Zod and React Hook Form, and calls a Server Action
 * to create the payment request using TanStack Query's useMutation.
 *
 * @param {PaymentFormProps} props - Component props
 * @param {function} props.onPaymentRequestCreated - Callback function triggered upon successful payment request.
 * @returns {JSX.Element} The payment form component.
 */
export function PaymentForm({ onPaymentRequestCreated }: PaymentFormProps) {
  // Initialize React Hook Form
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentRequestSchema),
    defaultValues: {
      amount: "", // Zod schema expects a string, will transform to number
    },
  });

  // Initialize TanStack Query's useMutation for the server action
  const mutation = useMutation<
    CreatePaymentRequestResult, // Type of the data returned by the mutationFn
    Error, // Type of the error
    FormData // Type of the variables passed to mutationFn
  >({
    mutationFn: async (formData: FormData) => {
      // The actual server action call
      return createPaymentRequest(formData);
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        toast.success("Payment request created successfully!");
        onPaymentRequestCreated(result.data); // Pass data to parent
        form.reset(); // Reset form after successful submission
      } else {
        toast.error(
          result.error || "Failed to create payment request. Please try again."
        );
      }
    },
    onError: (error) => {
      toast.error(
        `An error occurred: ${error.message || "Unknown error. Please try again."}`
      );
    },
  });

  // Handle form submission
  function onSubmit(values: PaymentFormValues) {
    // Create FormData to pass to the server action
    const formData = new FormData();
    formData.append("amount", String(values.amount)); // Server action expects string amount

    // Trigger the mutation
    mutation.mutate(formData);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Bitcoin Payment Request</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (BTC)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter BTC amount (e.g., 0.001)"
                      {...field}
                      type="number" // Use number type for better UX, but Zod schema handles string validation
                      step="any" // Allow any decimal for number input type
                      disabled={mutation.isPending} // Disable input while submitting
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the amount of Bitcoin (testnet) you want to request.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending} // Disable button while submitting
            >
              {mutation.isPending
                ? "Creating Request..."
                : "Create Payment Request"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
