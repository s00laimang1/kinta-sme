"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import type {
  availableBanks,
  transactionType,
  appProps,
  IUserRole,
  systemMessage,
} from "@/types";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage, updateSectionSettings } from "@/lib/utils";

export default function SettingsPage() {
  // Initial state based on the AppProps interface
  // @ts-ignore
  const [settings, setSettings] = useState<appProps>({
    stopAllTransactions: false,
    stopSomeTransactions: [],
    bankAccountToCreateForUsers: "random",
    stopAccountCreation: false,
    transactionLimit: 10000,
    requireUserVerification: true,
    maintenanceMode: false,
    defaultUserRole: "user",
    systemMessage: "",
    apiRateLimit: 60,
    logLevel: "info",
    force2FA: false,
    passwordPolicy: "strong",
    sessionTimeout: 30,
    adminIpWhitelist: [],
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("transactions");

  // Transaction types for checkboxes
  const transactionTypes: transactionType[] = [
    "airtime",
    "bill",
    "data",
    "exam",
    "funding",
    "recharge-card",
  ];

  const disableAndEnableDataPlans = [
    "mtn-gifting",
    "mtn-sme",
    "mtn-cheap",
    "glo-sme",
    "glo-cheap",
    "glo-gifting",
    "airtel-sme",
    "airtel-cheap",
    "airtel-gifting",
    "9mobile-sme",
    "9mobile-gifting",
    "9mobile-cheap",
  ];

  // Available banks for select
  const availableBankOptions: availableBanks[] = [
    "9PSB",
    "BANKLY",
    "PALMPAY",
    "PROVIDUS",
    "SAFEHAVEN",
  ];

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () =>
      (await api.get<{ data: appProps }>(`/admin/settings/`))?.data,
  });

  const { data: _systemMessage } = useQuery({
    queryKey: ["system-message"],
    queryFn: async () =>
      (await api.get<{ data: systemMessage }>("/users/message/")).data,
  });

  const { data: _settings } = data || {};

  const { data: systemMessage } = _systemMessage || {};

  // Fetch settings on component mount
  useEffect(() => {
    if (_settings) {
      setSettings({ ...settings, ..._settings });
    }
  }, [_settings]);

  useEffect(() => {
    if (systemMessage) {
      setSettings({ ...settings, systemMessage: systemMessage.message || "" });
    }
  }, [systemMessage]);

  // Handle transaction type checkbox changes
  const handleTransactionTypeChange = (
    type: transactionType,
    checked: boolean
  ) => {
    if (checked) {
      setSettings({
        ...settings,
        stopSomeTransactions: [...settings.stopSomeTransactions, type],
      });
    } else {
      setSettings({
        ...settings,
        stopSomeTransactions: settings.stopSomeTransactions.filter(
          (t) => t !== type
        ),
      });
    }
  };

  const handleDiableAndEnableDataChange = (type: string, checked: boolean) => {
    if (checked) {
      setSettings({
        ...settings,
        disabledPlans: [...settings?.disabledPlans, type],
      });
    } else {
      setSettings({
        ...settings,
        disabledPlans: settings?.disabledPlans?.filter((t) => t !== type),
      });
    }
  };

  // Save settings for the current tab
  const saveSettings = async (section: string) => {
    setLoading(true);
    try {
      // Map section names to the properties that should be saved
      const sectionMap: Record<string, (keyof appProps)[]> = {
        transactions: [
          "stopAllTransactions",
          "stopSomeTransactions",
          "transactionLimit",
        ],
        accounts: [
          "stopAccountCreation",
          "bankAccountToCreateForUsers",
          "requireUserVerification",
          "defaultUserRole",
        ],
        system: [
          "maintenanceMode",
          "systemMessage",
          "apiRateLimit",
          "logLevel",
          "disabledPlans",
        ],
        security: [
          "force2FA",
          "passwordPolicy",
          "sessionTimeout",
          "adminIpWhitelist",
        ],
      };

      // Extract only the settings for the current section
      const sectionSettings = sectionMap[section].reduce((acc, key) => {
        // @ts-ignore
        acc[key] = settings[key];
        return acc;
      }, {} as Partial<appProps>);

      await updateSectionSettings(section, sectionSettings);

      if (sectionSettings.systemMessage !== systemMessage?.message) {
        await api.post(`/users/message/`, { message: settings.systemMessage });
      }

      toast("Settings saved successfully");
    } catch (error) {
      toast(errorMessage(error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences.
        </p>
      </div>

      <Tabs
        defaultValue="transactions"
        className="space-y-4 w-full"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="bg-primary/10 rounded-none">
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none"
          >
            Transactions
          </TabsTrigger>
          <TabsTrigger
            value="accounts"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none"
          >
            Accounts
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none"
          >
            System
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none"
          >
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="rounded-none border-primary/20 py-0">
            <CardHeader className="bg-primary/5 py-3">
              <CardTitle>Transaction Settings</CardTitle>
              <CardDescription>
                Configure transaction-related settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="stop-all-transactions"
                    className="text-base font-medium"
                  >
                    Stop All Transactions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable all transaction processing.
                  </p>
                </div>
                <Switch
                  id="stop-all-transactions"
                  checked={settings.stopAllTransactions}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, stopAllTransactions: checked })
                  }
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Stop Specific Transaction Types
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select which transaction types to disable.
                </p>
                <div className="grid gap-2 pt-2">
                  {transactionTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`transaction-${type}`}
                        checked={settings.stopSomeTransactions.includes(type)}
                        onCheckedChange={(checked) =>
                          handleTransactionTypeChange(type, checked as boolean)
                        }
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-none"
                      />
                      <label
                        htmlFor={`transaction-${type}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="transaction-limit"
                  className="text-base font-medium"
                >
                  Transaction Limit
                </Label>
                <p className="text-sm text-muted-foreground">
                  Set the maximum amount for a single transaction.
                </p>
                <div className="flex items-center">
                  <span className="mr-2 text-sm">$</span>
                  <Input
                    id="transaction-limit"
                    type="number"
                    value={settings.transactionLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        transactionLimit: Number.parseInt(e.target.value),
                      })
                    }
                    className="rounded-none"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t bg-primary/5 py-4">
              <Button
                className="bg-primary hover:bg-primary/90 rounded-none"
                onClick={() => saveSettings("transactions")}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Transaction Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card className="rounded-none border-primary/20 py-0">
            <CardHeader className="bg-primary/5 py-3">
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Configure user account settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="stop-account-creation"
                    className="text-base font-medium"
                  >
                    Stop Account Creation
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable new user registration.
                  </p>
                </div>
                <Switch
                  id="stop-account-creation"
                  checked={settings.stopAccountCreation}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, stopAccountCreation: checked })
                  }
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="bank-account-type"
                  className="text-base font-medium"
                >
                  Default Bank Account Type
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select which bank account to create for new users.
                </p>
                <Select
                  value={settings.bankAccountToCreateForUsers}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      bankAccountToCreateForUsers: value as
                        | availableBanks
                        | "random",
                    })
                  }
                >
                  <SelectTrigger
                    id="bank-account-type"
                    className="rounded-none"
                  >
                    <SelectValue placeholder="Select bank account type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="random">Random</SelectItem>
                    {availableBankOptions.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="require-verification"
                    className="text-base font-medium"
                  >
                    Require User Verification
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require email verification before account activation.
                  </p>
                </div>
                <Switch
                  id="require-verification"
                  checked={settings.requireUserVerification}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      requireUserVerification: checked,
                    })
                  }
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="default-role" className="text-base font-medium">
                  Default User Role
                </Label>
                <p className="text-sm text-muted-foreground">
                  Set the default role for new user accounts.
                </p>
                <Select
                  value={settings.defaultUserRole}
                  onValueChange={(value: IUserRole) =>
                    setSettings({ ...settings, defaultUserRole: value })
                  }
                >
                  <SelectTrigger id="default-role" className="rounded-none">
                    <SelectValue placeholder="Select default role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t bg-primary/5 py-4">
              <Button
                className="bg-primary hover:bg-primary/90 rounded-none"
                onClick={() => saveSettings("accounts")}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Account Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4 w-full">
          <Card className="rounded-none w-full border-primary/20 py-0">
            <CardHeader className="bg-primary/5 py-3">
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system-wide settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 w-full pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="maintenance-mode"
                    className="text-base font-medium"
                  >
                    Maintenance Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Put the system in maintenance mode. Only admins can access.
                  </p>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, maintenanceMode: checked })
                  }
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="space-y-3 w-full">
                <Label
                  htmlFor="maintenance-message"
                  className="text-base font-medium"
                >
                  System Message
                </Label>
                <p className="text-sm text-muted-foreground">
                  Message to display to users.
                </p>
                <Textarea
                  id="maintenance-message"
                  value={settings.systemMessage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      systemMessage: e.target.value,
                    })
                  }
                  placeholder="Write a message to your users."
                  className="rounded-none  max-w-[40rem]"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Disable And Enable Data
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select the data types you want to disable.
                </p>
                <div className="grid gap-2 pt-2">
                  {disableAndEnableDataPlans.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`data-${type}`}
                        checked={settings?.disabledPlans?.includes(type)}
                        onCheckedChange={(checked) =>
                          handleDiableAndEnableDataChange(
                            type,
                            checked as boolean
                          )
                        }
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-none"
                      />
                      <label
                        htmlFor={`transaction-${type}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="api-rate-limit"
                  className="text-base font-medium"
                >
                  API Rate Limit
                </Label>
                <p className="text-sm text-muted-foreground">
                  Maximum number of API requests per minute.
                </p>
                <Input
                  id="api-rate-limit"
                  type="number"
                  value={settings.apiRateLimit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      apiRateLimit: Number.parseInt(e.target.value),
                    })
                  }
                  className="rounded-none"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="log-level" className="text-base font-medium">
                  Log Level
                </Label>
                <p className="text-sm text-muted-foreground">
                  Set the system logging level.
                </p>
                <Select
                  value={settings.logLevel}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      logLevel: value as
                        | "error"
                        | "warn"
                        | "info"
                        | "debug"
                        | "trace",
                    })
                  }
                >
                  <SelectTrigger id="log-level" className="rounded-none">
                    <SelectValue placeholder="Select log level" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="trace">Trace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t bg-primary/5 py-4">
              <Button
                className="bg-primary hover:bg-primary/90 rounded-none"
                onClick={() => saveSettings("system")}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save System Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="rounded-none border-primary/20 py-0">
            <CardHeader className="bg-primary/5 py-3">
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="force-2fa" className="text-base font-medium">
                    Force Two-Factor Authentication
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require all users to set up 2FA.
                  </p>
                </div>
                <Switch
                  id="force-2fa"
                  checked={settings.force2FA}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, force2FA: checked })
                  }
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="password-policy"
                  className="text-base font-medium"
                >
                  Password Policy
                </Label>
                <p className="text-sm text-muted-foreground">
                  Set the password complexity requirements.
                </p>
                <Select
                  value={settings.passwordPolicy}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      passwordPolicy: value as
                        | "basic"
                        | "medium"
                        | "strong"
                        | "very-strong",
                    })
                  }
                >
                  <SelectTrigger id="password-policy" className="rounded-none">
                    <SelectValue placeholder="Select password policy" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                    <SelectItem value="medium">
                      Medium (8+ chars, mixed case)
                    </SelectItem>
                    <SelectItem value="strong">
                      Strong (8+ chars, mixed case, numbers)
                    </SelectItem>
                    <SelectItem value="very-strong">
                      Very Strong (12+ chars, mixed case, numbers, symbols)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="session-timeout"
                  className="text-base font-medium"
                >
                  Session Timeout
                </Label>
                <p className="text-sm text-muted-foreground">
                  Time in minutes before inactive sessions are terminated.
                </p>
                <Input
                  id="session-timeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sessionTimeout: Number.parseInt(e.target.value),
                    })
                  }
                  className="rounded-none"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="ip-whitelist" className="text-base font-medium">
                  Admin IP Whitelist
                </Label>
                <p className="text-sm text-muted-foreground">
                  Restrict admin access to specific IP addresses
                  (comma-separated).
                </p>
                <Textarea
                  id="ip-whitelist"
                  value={settings.adminIpWhitelist?.join(", ") || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      adminIpWhitelist: e.target.value
                        .split(",")
                        .map((ip) => ip.trim()),
                    })
                  }
                  placeholder="192.168.1.1, 10.0.0.1"
                  className="rounded-none"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t bg-primary/5 py-4">
              <Button
                className="bg-primary hover:bg-primary/90 rounded-none"
                onClick={() => saveSettings("security")}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Security Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="rounded-none border-primary/20 mt-4 py-0">
        <CardHeader className="bg-primary/5 py-3">
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>
            View the current application configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <pre className="bg-muted p-4 rounded-none overflow-auto">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
