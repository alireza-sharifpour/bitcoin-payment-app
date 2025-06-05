// src/components/payment/PaymentForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  onPaymentRequestCreated?: (data: PaymentRequestData) => void;
}

// Wrapper function to make Server Action compatible with useActionState
async function createPaymentRequestAction(
  prevState: CreatePaymentRequestResult | null,
  formData: FormData
): Promise<CreatePaymentRequestResult> {
  return createPaymentRequest(formData);
}

export function PaymentForm({ onPaymentRequestCreated }: PaymentFormProps) {
  const router = useRouter();
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
    },
    mode: "onChange",
  });

  // Initialize useActionState with the wrapper function
  const [state, formAction, isPending] = useActionState(
    createPaymentRequestAction,
    null
  );

  // Handle state changes from Server Action
  useEffect(() => {
    if (state?.success && state.data) {
      toast.success("Payment request created successfully!");
      // Call the callback if provided (for backward compatibility)
      onPaymentRequestCreated?.(state.data);
      // Redirect to the dynamic payment route
      router.push(`/payment/${state.data.address}`);
      form.reset();
    } else if (state && !state.success && state.error) {
      toast.error(
        state.error || "Failed to create payment request. Please try again."
      );
    }
  }, [state, form, onPaymentRequestCreated, router]);

  // Client-side validation before form submission
  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const amount = formData.get("amount") as string;

    // Validate with the real schema before submission
    const validationResult = paymentRequestSchema.safeParse({
      amount: amount,
    });

    if (!validationResult.success) {
      // Prevent form submission and show validation errors
      event.preventDefault();
      validationResult.error.errors.forEach((error) => {
        form.setError("amount", { message: error.message });
      });
      return;
    }

    // If validation passes, let the form submit naturally to the action
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
          <form
            action={formAction}
            onSubmit={handleFormSubmit}
            className="space-y-6"
          >
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
                      disabled={isPending}
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
              disabled={isPending || !form.formState.isValid}
            >
              {isPending ? "Creating Request..." : "Create Payment Request"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
