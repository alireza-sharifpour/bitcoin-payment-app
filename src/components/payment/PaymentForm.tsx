// src/components/payment/PaymentForm.tsx
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button"; // Will use themed styles
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"; // Will use themed styles
import { Input } from "@/components/ui/input"; // Will use themed styles
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Will use themed styles

import {
  createPaymentRequest,
  PaymentRequestData,
  CreatePaymentRequestResult,
} from "@/actions/payment";
import { paymentRequestSchema } from "@/lib/validation/payment";

// Create a form-specific schema that doesn't transform values
const formSchema = z.object({
  amount: z.string().trim().min(1, "Amount is required"),
});

type PaymentFormValues = z.infer<typeof formSchema>;

interface PaymentFormProps {
  onPaymentRequestCreated: (data: PaymentRequestData) => void;
}

export function PaymentForm({ onPaymentRequestCreated }: PaymentFormProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
    },
  });

  const mutation = useMutation<CreatePaymentRequestResult, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      return createPaymentRequest(formData);
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        toast.success("Payment request created successfully!");
        onPaymentRequestCreated(result.data);
        form.reset();
      } else {
        toast.error(
          result.error || "Failed to create payment request. Please try again."
        );
      }
    },
    onError: (error) => {
      toast.error(
        `An error occurred: ${
          error.message || "Unknown error. Please try again."
        }`
      );
    },
  });

  function onSubmit(values: PaymentFormValues) {
    // Validate with the real schema before submission
    const validationResult = paymentRequestSchema.safeParse({
      amount: values.amount,
    });

    if (!validationResult.success) {
      // Show validation errors
      validationResult.error.errors.forEach((error) => {
        form.setError("amount", { message: error.message });
      });
      return;
    }

    const formData = new FormData();
    formData.append("amount", String(validationResult.data.amount));
    mutation.mutate(formData);
  }

  return (
    // Card component will use --card and --card-foreground
    <Card className="w-full max-w-md">
      <CardHeader>
        {/* CardTitle will use --card-foreground */}
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
                  {/* FormLabel will use --foreground or similar */}
                  <FormLabel>Amount (BTC)</FormLabel>
                  <FormControl>
                    {/* Input will use --input for border, --background for bg, --foreground for text */}
                    <Input
                      placeholder="Enter BTC amount (e.g., 0.001)"
                      {...field}
                      type="number"
                      step="any"
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  {/* FormDescription will use --muted-foreground */}
                  <FormDescription>
                    Enter the amount of Bitcoin (testnet) you want to request.
                  </FormDescription>
                  {/* FormMessage will use --destructive for error text */}
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Default Button uses --primary and --primary-foreground */}
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
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
