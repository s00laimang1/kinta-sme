import { PATHS, transaction, transactionStatus } from "@/types";
import React, { FC, useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import successSvg from "../public/success-check.json";
import errorSvg from "../public/error-status.json";
import pendingSvg from "../public/pending-status.json";
import Lottie from "lottie-react";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import Link from "next/link";
import { useDashboard } from "@/stores/dashboard.store";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/utils";

export const NotificationModal: FC<{}> = ({}) => {
  const { notification, setNotification } = useDashboard();

  const { data: transaction, isError } = useQuery({
    queryKey: ["transaction", notification.options?.tx_ref],
    queryFn: async () => {
      const res = await api.get<{ data: transaction }>(
        `/transactions/get-transaction?tx_ref=${notification.options?.tx_ref}`,
      );

      setNotification(true, {
        type: res.data.data.status,
        tx_ref: res.data.data.tx_ref,
        title: "Transaction Completed Successfully",
        description:
          res.data.data.meta?.vendingMessage ||
          "Your transaction has been completed successfully and your data has been sent to your phone number.",
      });
      return res.data;
    },
  });

  const data: Record<transactionStatus, any> = {
    failed: {
      animationData: errorSvg,
      title: "Transaction Failed",
      description:
        "Your transaction could not be completed. Please try again later.",
    },
    pending: {
      animationData: pendingSvg,
      title: "Transaction Pending",
      description:
        "Your transaction is still pending. Please check back later.",
    },
    refunded: {
      animationData: successSvg,
      title: "Transaction Refunded",
      description:
        "Your transaction has been refunded. Please check your account for more details.",
    },
    success: {
      animationData: successSvg,
      title: "Transaction Successful",
      description: "Your transaction has been completed successfully.",
    },
  };

  return (
    <Dialog
      key={notification.options?.type}
      open={notification.open}
      onOpenChange={(e) => {
        setNotification(e);
      }}
    >
      <DialogContent className="w-[90%] md:max-w-xl">
        <div className="w-full flex items-center flex-col justify-center">
          <Lottie
            animationData={data[notification.options?.type!]?.animationData}
            loop={false}
            className="md:w-[170px] md:h-[170px] w-[120px] h-[120px]"
          />
          <DialogTitle>
            {notification.options?.title ||
              data[notification.options?.type!]?.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {notification.options?.description ||
              data[notification.options?.type!]?.description}
          </DialogDescription>
        </div>

        {notification.options?.tx_ref && (
          <div className="text-center flex items-center gap-1 justify-center mt-3">
            <p className="text-muted-foreground text-sm">Transaction ID:</p>{" "}
            <DialogTitle className="font-bold text-xs">
              {notification.options?.tx_ref}
            </DialogTitle>
          </div>
        )}
        <Separator className="mt-5" />
        <div className="flex flex-col gap-2 mt-2">
          <DialogClose asChild>
            <Button className="cursor-pointer">Close</Button>
          </DialogClose>
          {notification.options?.tx_ref && (
            <Button asChild variant="outline" className="cursor-pointer">
              <Link
                href={`${PATHS.TRANSACTIONS}?tx_ref=${notification.options?.tx_ref}`}
              >
                View Reciept
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
