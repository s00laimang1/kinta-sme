"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  exportTransactions,
  formatCurrency,
  getTransactionsForAdmin,
  refundTransactionsBulk,
} from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { transactionRequestProps, transactionStatus } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

export default function TransactionsPage() {
  const router = useRouter();
  const [requestParams, setRequestParams] = useState<transactionRequestProps>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: -1,
    today: false,
  });

  const [searchInput, setSearchInput] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportLimit, setExportLimit] = useState("100");
  const [isExporting, setIsExporting] = useState(false);

  const { isLoading, data, error, refetch } = useQuery({
    queryKey: ["transactions", requestParams, searchInput],
    queryFn: () =>
      getTransactionsForAdmin({
        ...requestParams,
        search: searchInput,
        sortBy: "updatedAt",
        sortOrder: -1,
      }),
  });

  const { transactions = [], pagination } = data?.data || {};

  // Refund Failed Dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedRefundIds, setSelectedRefundIds] = useState<string[]>([]);
  const [isRefunding, setIsRefunding] = useState(false);

  const failedTransactions = (transactions || []).filter(
    (t) => t.status === "failed"
  );

  const openRefundDialog = () => {
    setSelectedRefundIds(
      failedTransactions.map((t) => String(t.transaction_id))
    );
    setRefundDialogOpen(true);
  };

  const toggleRefundSelection = (id: string, checked: boolean | string) => {
    setSelectedRefundIds((prev) => {
      const isChecked = Boolean(checked);
      if (isChecked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((x) => x !== id);
    });
  };

  const handleRefundSelected = async () => {
    try {
      if (selectedRefundIds.length === 0) {
        toast.error("Select at least one failed transaction");
        return;
      }
      setIsRefunding(true);
      const res = await refundTransactionsBulk(selectedRefundIds);
      const summary = res?.data?.summary;
      toast.success(
        `Refund complete: ${summary?.succeeded || 0} succeeded, ${
          summary?.failed || 0
        } failed`
      );
      setRefundDialogOpen(false);
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || "Refund failed");
    } finally {
      setIsRefunding(false);
    }
  };

  // Handle pagination
  const handlePreviousPage = () => {
    if (pagination && pagination.page > 1) {
      setRequestParams((prev) => ({
        ...prev,
        page: (prev.page || 1) - 1,
      }));
    }
  };

  // Handle next page
  const handleNextPage = () => {
    if (pagination && pagination.page < pagination.pages) {
      setRequestParams((prev) => ({
        ...prev,
        page: (prev.page || 1) + 1,
      }));
    }
  };

  // Handle status filter
  const handleStatusFilter = (
    status: transactionStatus | undefined,
    today = false
  ) => {
    setRequestParams((prev) => ({
      ...prev,
      status,
      page: 1,
      today,
    }));
  };

  // Handle sort change
  const handleSortChange = (sortBy: string) => {
    setRequestParams((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy ? (prev.sortOrder === 1 ? -1 : 1) : -1,
    }));
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestParams((prev) => ({
      ...prev,
      search: searchInput,
      page: 1, // Reset to first page when searching
    }));
  };

  // Clear search
  const clearSearch = () => {
    setSearchInput("");
    setRequestParams((prev) => {
      const newParams = { ...prev };
      delete newParams.search;
      return { ...newParams, page: 1 };
    });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const limit = Number.parseInt(exportLimit);
      if (isNaN(limit) || limit <= 0) {
        alert("Please enter a valid limit");
        setIsExporting(false);
        return;
      }

      // Create export parameters based on current filters
      const exportParams = {
        ...requestParams,
        limit,
        page: 1, // Start from the first page
      };

      await exportTransactions(exportParams);
      setExportDialogOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground text-xs md:text-sm">
              View and manage financial transactions.
            </p>
          </div>
          <Button size="sm" variant="outline" className="rounded-none" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search transactions..."
              className="pl-8 rounded-none h-[2.5rem]"
              disabled
            />
          </div>
          <Button variant="outline" className="rounded-none" disabled>
            Filter
          </Button>
        </div>

        <div className="rounded-none border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5)
                .fill(0)
                .map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              View and manage financial transactions.
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Failed to load transactions. Please try again later."}
          </AlertDescription>
        </Alert>

        <div className="flex justify-center mt-4">
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              View and manage financial transactions.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => setExportDialogOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by ID, email or name..."
              className="pl-8 rounded-none h-[2.5rem]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </form>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-none">
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusFilter("success")}>
                Successful Transactions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilter("pending")}>
                Pending Transactions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilter("failed")}>
                Failed Transactions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilter(undefined)}>
                All Statuses
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-none border p-8 text-center">
          <p className="text-muted-foreground">No transactions found</p>
          {requestParams.search && (
            <Button onClick={clearSearch} variant="link" className="mt-2">
              Clear search
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Render main content
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage financial transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => setExportDialogOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={openRefundDialog}
            disabled={failedTransactions.length === 0}
          >
            Refund failed
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by ID, email or name..."
            className="pl-8 rounded-none h-[2.5rem]"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </form>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-none">
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusFilter("success")}>
              Successful Transactions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusFilter("pending")}>
              Pending Transactions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusFilter("failed")}>
              Failed Transactions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusFilter(undefined)}>
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSortChange("amount")}>
              Sort by Amount{" "}
              {requestParams.sortBy === "amount" &&
                (requestParams.sortOrder === 1 ? "↑" : "↓")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("createdAt")}>
              Sort by Date{" "}
              {requestParams.sortBy === "createdAt" &&
                (requestParams.sortOrder === 1 ? "↑" : "↓")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleStatusFilter(undefined, !requestParams.today)
              }
            >
              Today
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {requestParams.search && (
        <div className="flex items-center">
          <Badge
            variant="outline"
            className="rounded-none flex items-center gap-1"
          >
            Search: {requestParams.search}
            <div onClick={clearSearch} className="ml-1">
              <X className="h-3 w-3" />
            </div>
          </Badge>
        </div>
      )}

      <div className="rounded-none border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.transaction_id}>
                <TableCell className="font-medium">
                  {transaction.transaction_id}
                </TableCell>
                <TableCell>{transaction.userfullName}</TableCell>
                <TableCell>{formatCurrency(transaction.amount, 1)}</TableCell>
                <TableCell>
                  <Badge
                    className="rounded-none"
                    variant={
                      transaction.status === "success"
                        ? "default"
                        : transaction.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {transaction.status}
                  </Badge>
                </TableCell>
                <TableCell>{transaction.createdAt}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          router.push(
                            `/admin/transactions/${transaction.transaction_id}`
                          );
                        }}
                      >
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem>Download receipt</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <strong>
            {((pagination?.page || 1) - 1) * (pagination?.limit || 10) + 1}-
            {Math.min(
              (pagination?.page || 1) * (pagination?.limit || 10),
              pagination?.total || 0
            )}
          </strong>{" "}
          of <strong>{pagination?.total || 0}</strong> transactions
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={handlePreviousPage}
            disabled={!pagination || pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={handleNextPage}
            disabled={!pagination || pagination.page >= pagination.pages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-none">
          <DialogHeader>
            <DialogTitle>Export Transactions</DialogTitle>
            <DialogDescription>
              Enter the maximum number of transactions to export. The export
              will include your current filters and sorting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="limit" className="text-right">
                Limit
              </Label>
              <Input
                id="limit"
                type="number"
                value={exportLimit}
                onChange={(e) => setExportLimit(e.target.value)}
                className="col-span-3 rounded-none h-[2.5rem]"
                min="1"
                max="1000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              className="rounded-none"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                "Export"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Failed Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="sm:max-w-[640px] rounded-none">
          <DialogHeader>
            <DialogTitle>Refund Failed Transactions</DialogTitle>
            <DialogDescription>
              Select which failed transactions to refund now. You can remove or
              re-add items before confirming.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-auto border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No failed transactions on this page
                    </TableCell>
                  </TableRow>
                ) : (
                  failedTransactions.map((t) => {
                    const id = String(t.transaction_id);
                    const checked = selectedRefundIds.includes(id);
                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggleRefundSelection(id, v as boolean | string)
                            }
                            aria-label="Select transaction"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{id}</TableCell>
                        <TableCell>{t.userfullName}</TableCell>
                        <TableCell>{formatCurrency(t.amount, 1)}</TableCell>
                        <TableCell>{t.createdAt}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Select all failed
                setSelectedRefundIds(
                  failedTransactions.map((t) => String(t.transaction_id))
                );
              }}
              className="rounded-none"
            >
              Select all
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedRefundIds([])}
              className="rounded-none"
            >
              Clear all
            </Button>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              className="rounded-none"
              onClick={handleRefundSelected}
              disabled={isRefunding || selectedRefundIds.length === 0}
            >
              {isRefunding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refunding...
                </>
              ) : (
                `Refund ${selectedRefundIds.length || 0}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
