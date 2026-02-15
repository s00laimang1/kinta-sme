"use client";

import { PATHS } from "@/types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import Link from "next/link";
import { useAuthentication } from "@/hooks/use-authentication";
import { FC } from "react";
import { cn } from "@/lib/utils";

const BalanceCard: FC<{ flexBtn?: boolean }> = ({ flexBtn }) => {
  const { user } = useAuthentication("me", 5000);
  return (
    <Card className="rounded-sm bg-primary/80 w-full">
      <CardContent
        className={cn(
          "flex items-center justify-between flex-wrap",
          flexBtn && "flex-col items-start justify-start",
        )}
      >
        <div className="flex items-baseline">
          <span className="text-6xl font-bold text-white">
            {user?.balance.toFixed(2) || "0.00"}
          </span>
          <span className="ml-2 text-gray-200">NGN</span>
        </div>
        <div className="mt-6 space-x-3">
          <Button
            asChild
            variant="ringHover"
            className="rounded-sm bg-white/20 hover:bg-white/30"
          >
            <Link href={PATHS.TOP_UP_ACCOUNT}>FUND ACCOUNT</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceCard;
