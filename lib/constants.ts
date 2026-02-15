import {
  availableNetworks,
  meterType,
  PATHS,
  planTypes,
  IBuyVtuNetworks,
} from "@/types";
import z from "zod";
import { CreditCard, GraduationCap, Zap } from "lucide-react";

export const configs = {
  appName: "KINTA SME",
  "X-RAPIDAPI-HOST": process.env["X_RAPIDAPI_HOST"],
  "X-RAPIDAPI-KEY": process.env["NEXT_PUBLIC_X_RAPIDAPI_KEY"],
  FLW_ENCRYPTION_KEY: process.env["FLW_ENCRYPTION_KEY"],
  FLW_PUBK: process.env["FLW_PUBK"],
  FLW_SECK: process.env["FLW_SECK"],
  HOST_EMAIL: process.env["HOST_EMAIL"],
  HOST_EMAIL_PASSWORD: process.env["HOST_EMAIL_PASSWORD"],
  FLW_SECRET_HASH: process.env["FLW_SECRET_HASH"],
  RESEND_API_KEY: process.env["RESEND_API_KEY"],
  BUDPAY_SECRET_KEY: process.env["BUDPAY_SECRET_KEY"],
};

// FORM SCHEMAS
export const signUpSchema = z.object({
  fullName: z.string().min(3, "Full Name is too short"),
  country: z.enum(["nigeria"]),
  phoneNumber: z.string().min(11, "Please use a valid phone number."),
  email: z.string().email(),
  password: z.string().min(6, "Password is too short"),
});

export const AVIALABLE_NETWORKS: IBuyVtuNetworks[] = [
  "Mtn",
  "Glo",
  "Airtel",
  "9Mobile",
];

export const FREQUENTLY_PURCHASE_AIRTIME = [
  100, 200, 300, 400, 500, 1000, 2000, 5000, 10000,
];

export const Utilities = [
  {
    label: "Electricity",
    path: PATHS.ELECTRICITY_PAYMENTS,
    icon: Zap,
  },
  {
    label: "Result Checker",
    path: PATHS.EXAM,
    icon: GraduationCap,
  },
  {
    label: "Print Recharge Card",
    path: PATHS.RECHARGE_CARD,
    icon: CreditCard,
  },
];

export const ELECTRICITY_COMPANIES = [
  {
    label: "Ikeja Electricity",
    disco: 1,
  },
  {
    label: "Eko Electricity",
    disco: 2,
  },
  {
    label: "Kano Electricity",
    disco: 3,
  },
  {
    label: "Port Harcourt Electricity",
    disco: 4,
  },
  {
    label: "Jos Electricity",
    disco: 5,
  },
  {
    label: "Ibadan Electricity",
    disco: 6,
  },
  {
    label: "Kaduna Electricity",
    disco: 7,
  },
  {
    label: "Abuja Electricity",
    disco: 8,
  },
  {
    label: "Benin Electricity",
    disco: 9,
  },
  {
    label: "Enugu Electricity",
    disco: 10,
  },
  {
    label: "Yola Electricity",
    disco: 11,
  },
];

export const FREQUENTLY_PURCHASE_ELECTRICITY_BILLS = [
  1000, 2000, 3000, 5000, 50000, 100000,
];

export const EXAMS = [
  {
    label: "WAEC",
    amount: 3400,
    planId: 1,
  },
  {
    label: "NECO",
    amount: 1200,
    planId: 2,
  },
  {
    label: "NABTEB",
    amount: 850,
    planId: 3,
  },
];

export const PLAN_TYPES: planTypes[] = ["SME", "CHEAP", "GIFTING"];

export const METER_TYPE: meterType[] = ["POSTPAID", "PREPAID"];

export const networkTypes: Record<availableNetworks, number> = {
  mtn: 1,
  glo: 3,
  airtel: 4,
  "9mobile": 2,
};
