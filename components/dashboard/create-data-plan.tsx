"use client";

import { ReactNode, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formSchema } from "@/lib/validator.schema";
import { ScrollArea } from "../scroll-area";
import { api } from "@/lib/utils";
import { dataPlan } from "@/types";

type FormValues = z.infer<typeof formSchema>;

export function CreateDataPlanDialog({
  children,
  dataPlan,
  _open = false,
  onClose = () => {},
}: {
  children?: ReactNode;
  dataPlan?: dataPlan;
  _open?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(_open);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Initialize form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      network: dataPlan?.network,
      data: dataPlan?.data || "",
      amount: dataPlan?.amount || undefined,
      availability: dataPlan?.availability || "30 Days",
      type: dataPlan?.type || "SME",
      planId: dataPlan?.planId as string,
      isPopular: dataPlan?.isPopular || false,
      provider: dataPlan?.provider || "buyVTU",
    },
  });

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (dataPlan) {
        await api.patch("/admin/data/", { _id: dataPlan._id, ...values });

        toast("Data plan updated successfully");
      } else {
        await api.post("/admin/data", values);

        // Show success message
        toast("Data plan created successfully");
      }

      setOpen(false);

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["dataPlans"] });
    } catch (error) {
      console.error("Error creating data plan:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create data plan"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(e) => {
        if (!e) {
          setOpen(false);
          onClose();
          return;
        }

        setOpen(e);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[570px] max-w-[95%] rounded-none">
        <DialogHeader>
          <DialogTitle>Create New Data Plan</DialogTitle>
          <DialogDescription>
            Add a new data plan to your catalog. Fill in all the required
            details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[450px]">
              <div className="grid md:grid-cols-2 grid-cols-1 gap-4 ">
                <FormField
                  control={form.control}
                  name="network"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-none">
                            <SelectValue placeholder="Select network" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Mtn">MTN</SelectItem>
                          <SelectItem value="Airtel">Airtel</SelectItem>
                          <SelectItem value="Glo">Glo</SelectItem>
                          <SelectItem value="9Mobile">9mobile</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-none">
                            <SelectValue placeholder="Select plan type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CHEAP">CHEAP</SelectItem>
                          <SelectItem value="SME">SME</SelectItem>
                          <SelectItem value="GIFTING">GIFTING</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 grid-cols-1 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-none"
                          placeholder="e.g. 1GB, 500MB"
                        />
                      </FormControl>
                      <FormDescription>
                        Specify the data amount with unit (e.g., 1GB)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₦)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-none"
                          type="number"
                          placeholder="Enter price in kobo"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter price in kobo (e.g., 100000 for ₦1,000)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 grid-cols-1 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Availability</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-none"
                          placeholder="e.g. 30 Days"
                        />
                      </FormControl>
                      <FormDescription>
                        Specify the validity period
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-none"
                          type="text"
                          placeholder="Enter unique plan ID"
                        />
                      </FormControl>
                      <FormDescription>
                        Must be a unique identifier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 grid-cols-1 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="isPopular"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 border p-4 rounded-none">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Featured Plan</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-none">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="buyVTU">BUY VTU</SelectItem>
                          <SelectItem value="smePlug">SME PLUG</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => {
                  setOpen(false);
                  onClose();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {!dataPlan ? "Creating..." : "Updating..."}
                  </>
                ) : dataPlan ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
