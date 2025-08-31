"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter } from "lucide-react";
import DataPlanCard from "@/components/data-plan-card";
import PhoneNumberBadge from "@/components/phone-number-badge";
import BalanceCard from "@/components/balance-card";
import { Input } from "@/components/ui/input";
import { useNavBar } from "@/hooks/use-nav-bar";
import { AVIALABLE_NETWORKS, PLAN_TYPES } from "@/lib/constants";
import type { appProps, availableNetworks, dataPlan } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { api, getRecentlyUsedContacts } from "@/lib/utils";
import { useMediaQuery } from "@uidotdev/usehooks";
import Text from "@/components/text";
import { useHealthChecker } from "@/hooks/use-health-checker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Page = () => {
  useNavBar("Buy Data");
  useHealthChecker("data");
  const [network, setNetwork] = useState<availableNetworks | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [planType, setPlanType] = useState("");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const { isLoading, data } = useQuery({
    queryKey: ["data-plans"],
    queryFn: () => api.get<{ data: dataPlan[] }>(`/create/data-plan/`),
    enabled: !!network && !!planType,
  });

  const { isLoading: _isLoading, data: recentlyUsed } = useQuery({
    queryKey: ["recently-used"],
    queryFn: () => getRecentlyUsedContacts("data", 3),
  });

  const { data: appSettingsData } = useQuery<{ data: { data: appProps } }>({
    queryKey: ["app-settings"],
    queryFn: () => api.get("/admin/settings"),
  });

  const appSettings = appSettingsData?.data?.data;

  const disablePlans = appSettings?.disabledPlans;

  const { data: _data } = data || {};
  const { data: dataPlans = [] } = _data || {};

  // Filter data plans based on selected filters
  const filteredDataPlans = useMemo(() => {
    if (network === ("all" as availableNetworks) && planType === "all") {
      return dataPlans;
    }

    return dataPlans.filter((plan) => {
      // If no network is selected or the plan matches the selected network
      const networkMatch =
        !network || plan.network.toLowerCase() === network.toLowerCase();

      // If no plan type is selected or the plan matches the selected type
      const typeMatch =
        !planType || plan.type.toLowerCase() === planType.toLowerCase();

      return networkMatch && typeMatch;
    });
  }, [dataPlans, network, planType]);

  return (
    <div className="w-full max-w-6xl mx-auto py-6">
      <div className="space-y-8">
        {/* Balance Section */}
        <div className="mb-8">
          <BalanceCard flexBtn={isMobile} />
        </div>

        {/* Phone Number Section */}
        <div className="bg-white rounded-none shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Enter Phone Number
          </h2>

          <div className="relative">
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Phone Number (+234)"
              className="h-14 rounded-none pl-4 pr-4 border-gray-200 bg-gray-50 focus:border-primary focus:ring-1 focus:ring-primary text-base"
            />
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-sm text-gray-600 mb-3">
              RECENTLY USED
            </h3>
            <div className="flex items-center overflow-x-auto pb-2 gap-3 scrollbar-hide">
              {!recentlyUsed?.length ? (
                <Text className="underline font-bold text-primary">
                  No recently used contact
                </Text>
              ) : (
                recentlyUsed?.map((p, idx) => (
                  <PhoneNumberBadge
                    key={idx}
                    onSelect={setPhoneNumber}
                    network={p.meta?.network!}
                    number={p?.meta?.payerNumber! || p?.meta?.customerPhone!}
                    dataPlan={p.meta?.data!}
                    amount={0}
                    date={p.lastUsed}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Data Plans Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Select Data Plan
          </h2>

          {/* Network Selection */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Choose Plan:</span>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-[3rem] w-full rounded-none capitalize"
                >
                  {network || "  Select Network"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Network</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3 w-full">
                  {AVIALABLE_NETWORKS.map((ntw, idx) => (
                    <DialogClose key={idx} asChild>
                      <Button
                        variant="outline"
                        className="rounded-none w-full h-[3rem]"
                        onClick={() => {
                          setNetwork(ntw as availableNetworks);
                        }}
                      >
                        {ntw.toUpperCase()}
                      </Button>
                    </DialogClose>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-[3rem] w-full rounded-none"
                >
                  {planType || "Select Plan Type"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Plan Type</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3 w-full">
                  {PLAN_TYPES.map((plantype, idx) => {
                    const c = disablePlans?.find((p) => {
                      const [n, t] = p.split("-");

                      return (
                        n.toLowerCase() === network?.toLowerCase() &&
                        t.toLowerCase() === plantype.toLowerCase()
                      );
                    });

                    const cdp = c?.split("-");

                    return (
                      <DialogClose asChild key={idx}>
                        <Button
                          variant="outline"
                          disabled={
                            cdp?.[1].toLowerCase() === plantype.toLowerCase()
                          }
                          className="rounded-none w-full h-[3rem]"
                          onClick={() => {
                            setPlanType(plantype);
                          }}
                        >
                          {plantype.toUpperCase()}
                        </Button>
                      </DialogClose>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="w-full h-px bg-gray-100 my-6" />

          {/* Data Plan Cards */}
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              transition={{
                default: { ease: "easeInOut" },
                layout: { duration: 0.3 },
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredDataPlans.length > 0 ? (
                filteredDataPlans.map((plan, idx) => (
                  <motion.div
                    key={`${plan.network}-${plan.data}-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DataPlanCard
                      {...plan}
                      _isLoading={isLoading}
                      phoneNumber={phoneNumber}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="col-span-full text-center py-8 text-gray-500"
                >
                  Please select a network to show data plans
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Page;
