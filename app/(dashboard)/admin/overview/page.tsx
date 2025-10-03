"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "@/components/dashboard/overview";
import { RecentSales } from "@/components/dashboard/recent-sales";
import {
  ArrowUpRight,
  Users,
  CreditCard,
  DollarSign,
  Activity,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardPage() {
  const [dataSoldNetwork, setDataSoldNetwork] = useState<string>("");
  const [dataSoldTimeframe, setDataSoldTimeframe] = useState<
    "today" | "yesterday" | "last-week" | "all"
  >("today");

  const { isLoading, data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () =>
      await api.get<{
        data: {
          todaysPayment: number;
          totalUsersBalance: number;
          totalTransactions: string;
          users: number;
        };
      }>(`/admin/overview/`),
  });

  const { data: overviewData } = data || {};

  type DataSoldItem = {
    network: string;
    type: string;
    dataAmountSold: number;
    amount: number;
  };

  const {
    isLoading: isLoadingDataSold,
    data: dataSoldResp,
    refetch: refetchDataSold,
  } = useQuery({
    queryKey: [
      "admin-data-sold",
      { network: dataSoldNetwork, timeframe: dataSoldTimeframe },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ timeframe: dataSoldTimeframe });
      if (dataSoldNetwork) params.set("network", dataSoldNetwork);
      return await api.get<{ data: { items: DataSoldItem[] } }>(
        `/admin/overview/data-sold/?${params.toString()}`
      );
    },
  });

  const dataSold = useMemo(
    () => dataSoldResp?.data?.data?.items || [],
    [dataSoldResp]
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your business metrics and performance.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 rounded-none">
        <TabsList className="rounded-none">
          <TabsTrigger value="overview" className="rounded-none">
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-none">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-none">
            Reports
          </TabsTrigger>
          <TabsTrigger value="data-sold" className="rounded-none">
            Data Sold
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                {Array(4)
                  .fill(0)
                  .map((_, index) => (
                    <Card key={index} className="rounded-none">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-[80px] mb-2" />
                        <Skeleton className="h-3 w-[120px]" />
                      </CardContent>
                    </Card>
                  ))}
              </>
            ) : (
              <>
                <Card className="rounded-none">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overviewData?.data.totalTransactions}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-emerald-500 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> +20.1%
                      </span>{" "}
                      overall insight
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-none">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Users Balance
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overviewData?.data.totalUsersBalance}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-emerald-500 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> +12.2%
                      </span>{" "}
                      overall insight
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-none">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overviewData?.data.users}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-emerald-500 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> +5.4%
                      </span>{" "}
                      overall insight
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-none">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Todays Payments
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overviewData?.data.todaysPayment}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-emerald-500 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> +19%
                      </span>{" "}
                      overall insight
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 rounded-none">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>
                  Monthly revenue and user growth.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className="md:col-span-3 col-span-4 rounded-none">
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  Recent transactions from your customers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1">
                <RecentSales />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="data-sold" className="space-y-4">
          <Card className="rounded-none">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Data Sold</CardTitle>
                <CardDescription>
                  Aggregated data volume and amount by network and type.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">
                    Network
                  </label>
                  <Select
                    value={dataSoldNetwork || "all"}
                    onValueChange={(val) =>
                      setDataSoldNetwork(val === "all" ? "" : val)
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Mtn">Mtn</SelectItem>
                      <SelectItem value="Airtel">Airtel</SelectItem>
                      <SelectItem value="Glo">Glo</SelectItem>
                      <SelectItem value="9Mobile">9Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">
                    Timeframe
                  </label>
                  <Select
                    value={dataSoldTimeframe}
                    onValueChange={(val) =>
                      setDataSoldTimeframe(val as typeof dataSoldTimeframe)
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Today" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="last-week">Last Week</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDataSold ? (
                <div className="grid gap-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                </div>
              ) : dataSold.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data found</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-4">Network</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Data Amount Sold</th>
                        <th className="py-2 pr-4">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataSold.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="py-2 pr-4">{item.network}</td>
                          <td className="py-2 pr-4">{item.type}</td>
                          <td className="py-2 pr-4">{`${item.dataAmountSold}GB`}</td>
                          <td className="py-2 pr-4">{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and insights about your business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Overview />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                Generate and view reports about your business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground">
                  Reports content will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
