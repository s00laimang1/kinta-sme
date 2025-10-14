import {
  AirtimeVendingResponse,
  appProps,
  availableNetworks,
  BillPaymentResponse,
  CableSubscriptionResponse,
  dataPlan,
  DataVendingResponse,
  dedicatedAccountNumber,
  ExamResponse,
  flutterwaveWebhook,
  IUser,
  IUserRole,
  IValidateMeterResponse,
  meterType,
  IBuyVtuNetworks,
  paymentMethod,
  PrintRechargeCard,
  recentlyUsedContact,
  transaction,
  transactionRequestProps,
  transactionStatus,
  transactionsWithUserDetails,
  transactionType,
  UsersResponse,
  VirtualAccountResponse,
} from "@/types";
import axios from "axios";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { configs } from "./constants";
import { Session } from "next-auth";
import { NextResponse } from "next/server";
import queryString from "query-string";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getNetworkLogo = (network: IBuyVtuNetworks) => {
  const logos: Record<IBuyVtuNetworks, string> = {
    Mtn: "/mtn-logo.png",
    Glo: "/glo-logo.png",
    Airtel: "/airtel-logo.png",
    "9Mobile": "/9mobile-logo.png",
  };

  return logos[network];
};

export const generateDate = () => {
  const currentDate = new Date();

  const [days, month] = [
    Math.floor(Math.random() * 30),
    Math.floor(Math.random() * 12),
  ];

  currentDate.setDate(currentDate.getDate() - days);
  currentDate.setMonth(currentDate.getMonth() - month);

  return currentDate.toISOString();
};

export const sortPlan = (
  plans: dataPlan[],
  network?: availableNetworks,
  planType?: string
) => {
  let _plans: dataPlan[] = [];
  _plans = plans.sort((plan) => (plan.isPopular ? -1 : 1));

  if (network) {
    console.log({ network });
    _plans.filter(
      (plan) => plan.network.toLowerCase() === network.toLowerCase()
    );
  }

  if (planType) {
    _plans.filter((plan) => plan.type.toLowerCase() === planType.toLowerCase());
  }

  return _plans;
};

export const isPathMathching = (path: string) => {
  const Window = typeof window !== "undefined" && window;

  if (Window) {
    const location = Window.location.pathname.split("/");

    return path.split("/")[2] === location[2];
  }
};

export const formatCurrency = (amount: number, mfd = 1) => {
  return new Intl.NumberFormat("en-NG", {
    currency: "NGN",
    style: "currency",
    minimumFractionDigits: mfd,
  }).format(amount);
};

//export const validatePhoneNumber = async (phoneNumber: string) => {
//  const res = await axios.get<{ is_valid: boolean }>(
//    `https://validate-phone-by-api-ninjas.p.rapidapi.com/v1/validatephone?number=${phoneNumber}&country=NG`,
//    {
//      headers: {
//        "x-rapidapi-host": configs["X-RAPIDAPI-HOST"],
//        "x-rapidapi-key": configs["X-RAPIDAPI-KEY"],
//      },
//    }
//  );
//
//  return res.data;
//};

export const errorMessage = (error: any) => {
  return error.response.data;
};

export const httpStatusResponse = (
  code: number,
  message?: string,
  data?: any,
  _status?: string
) => {
  const status: Record<number, any> = {
    200: {
      status: "success",
      message: message || "Request successful",
      data,
    },
    400: {
      status: "bad request",
      message: message || "An error has occurred on the client side.",
      data,
    },
    401: {
      status: "unauthorized access",
      message:
        message ||
        "You are not authorized to make this request or access this endpoint",
      data,
    },
    404: {
      status: "not found",
      message:
        message ||
        "The resources you are looking for cannot be found or does not exist",
      data,
    },
    409: {
      status: "conflict",
      message:
        message ||
        "The resources you are requesting for is having a conflict with something, please message us if this issue persist",
      data,
    },
    429: {
      status: "too-many-request",
      message:
        message || "Please wait again later, you are sending too many request.",
      data,
    },
    500: {
      status: "server",
      message:
        message ||
        "Sorry, The problem is from our end please try again later or message us if this issue persist, sorry for the inconvenience",
      data,
    },
  };

  const checkCode = Object.keys(status).includes(code + "");

  return checkCode ? status[code] : { status: _status, message, code, data };
};

export const checkIfUserIsAuthenticated = async (session: Session | null) => {
  if (!session) {
    throw new Error("UNAUTHENTICATED: Please signIn to continue.");
  }

  return true;
};

export const restrictPropertyModification = (
  data: object,
  restrictedKeys: string[]
) => {
  const allKeys = Object.keys(data);

  for (const restrictedKey of restrictedKeys) {
    if (allKeys.includes(restrictedKey)) {
      throw new Error(
        "UNAUTHORIZE_ACTION: You are not allow to modify/configure this properties"
      );
    }
  }
};

export const api = axios.create({
  baseURL: "/api/",
});

export const buyVtuApi = axios.create({
  baseURL: "https://buyvtu.online/api/v1",
});

export interface apiResponse<T = any> {
  status: string;
  message: string;
  data: T;
  code?: string | number;
}

export const refundTransactionsBulk = async (ids: string[]) => {
  const response = await api.post<
    apiResponse<{ results: any[]; summary: any }>
  >("/admin/overview/transactions/refund", { ids });
  return response.data;
};

export const getUser = async () => {
  const res = await api.get<apiResponse<IUser>>("/users/me");

  return res.data.data;
};

export const getDedicatedAccount = async () => {
  const res = await api.get<apiResponse<dedicatedAccountNumber>>(
    "/account/me/"
  );

  return res.data;
};

export const getInitials = (name = "") => {
  let c = "";

  name.split(" ").map((n) => {
    c += n[0]?.toUpperCase();
  });

  return c;
};

export const createVirtualAccount = async <T = any>(
  email: string,
  tx_ref?: string,
  isPermanent = false,
  amount?: number,
  bvn?: String,
  note?: string,
  meta?: T
) => {
  const payload = {
    email,
    tx_ref,
    is_permanent: isPermanent,
    amount,
    bvn,
    note,
    meta,
  };

  try {
    const res = await axios.post<VirtualAccountResponse>(
      `https://api.flutterwave.com/v3/virtual-account-numbers`,
      payload,
      { headers: { Authorization: `Bearer ${configs.FLW_SECK}` } }
    );

    return res.data.data;
  } catch (error) {
    console.log(error);
  }
};

export const getTransferFee = async (amount: number) => {
  const q = new URLSearchParams({
    amount: amount.toString(),
    currency: "NGN",
    type: "amount",
  });

  const res = await axios.get<
    VirtualAccountResponse<
      [
        {
          currency: string;
          fee_type: string;
          fee: number;
        }
      ]
    >
  >(`https://api.flutterwave.com/v3/transfers/fee?${q}`, {
    headers: { Authorization: `Bearer ${configs.FLW_SECK}` },
  });

  return res.data.data[0];
};

export const getAccountNumber = async (order_ref: string) => {
  console.log({ order_ref });
  const res = await axios.get<VirtualAccountResponse>(
    `https://api.flutterwave.com/v3/virtual-account-numbers/${order_ref}`,
    { headers: { Authorization: `Bearer ${configs.FLW_SECK}` } }
  );

  return res.data.data;
};

export function countdownTime(targetDate: string) {
  let formattedTime;
  const interval = setInterval(() => {
    const now = new Date();
    const target = new Date(targetDate);
    // @ts-ignore
    const difference = target - now; // Time difference in milliseconds

    if (difference <= 0) {
      clearInterval(interval);
      console.log("Countdown complete!");
      return;
    }

    // Convert milliseconds to hours, minutes, and seconds
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, 1000); // Update every second

  return formattedTime;
}

export const verifyTransaction = async (id: string) => {
  const res = await axios.get<
    flutterwaveWebhook<{ user: string; type: paymentMethod }>
  >(`https://api.flutterwave.com/v3/transactions/${id}/verify`, {
    headers: { Authorization: `Bearer ${configs.FLW_SECK}` },
  });

  return res.data.data;
};

export const verifyTransactionWithTxRef = async (tx_ref: string) => {
  const res = await axios.get<flutterwaveWebhook>(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
    { headers: { Authorization: `Bearer ${configs.FLW_SECK}` } }
  );

  return res.data.data;
};

export const getTransactions = async (payload: {
  type?: transactionType;
  status?: transactionStatus;
  page?: number;
  limit?: number;
}) => {
  const q = queryString.stringify(payload);
  const res = await api.get<{
    transactions: transaction[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }>(`/transactions/all/?${q}`);

  return res.data;
};

export const getRecentlyUsedContacts = async (
  type: transactionType,
  limit = 4
) => {
  const q = queryString.stringify({ type, limit });
  const res = await api.get<{
    data: recentlyUsedContact<{
      user: string;
      network: IBuyVtuNetworks;
      data: string;
      amount: number;
      recipients: string;
      payerNumber?: string;
      customerPhone?: string;
    }>[];
  }>(`/users/me/recently-used/?${q}`);

  return res.data.data;
};

export function stringToBase64(str: string) {
  // For browser environments
  if (typeof window !== "undefined" && window.btoa) {
    // Handle Unicode characters properly
    const binaryString = Array.from(str)
      .map((char) => String.fromCharCode(char.charCodeAt(0)))
      .join("");
    return window.btoa(binaryString);
  }

  // For Node.js environments
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str).toString("base64");
  }

  // Fallback implementation if neither browser nor Node.js methods are available
  const base64chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;

  // Convert string to UTF-8 byte array
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode < 128) {
      bytes.push(charCode);
    } else if (charCode < 2048) {
      bytes.push((charCode >> 6) | 192);
      bytes.push((charCode & 63) | 128);
    } else {
      bytes.push((charCode >> 12) | 224);
      bytes.push(((charCode >> 6) & 63) | 128);
      bytes.push((charCode & 63) | 128);
    }
  }

  // Process byte array in groups of 3
  while (i < bytes.length) {
    const triplet =
      (bytes[i] << 16) +
      (i + 1 < bytes.length ? bytes[i + 1] << 8 : 0) +
      (i + 2 < bytes.length ? bytes[i + 2] : 0);

    // Convert triplet to four base64 characters
    result += base64chars[(triplet >> 18) & 63];
    result += base64chars[(triplet >> 12) & 63];
    result += i + 1 < bytes.length ? base64chars[(triplet >> 6) & 63] : "=";
    result += i + 2 < bytes.length ? base64chars[triplet & 63] : "=";

    i += 3;
  }

  return result;
}

export const buyData = async (
  planId: number,
  phoneNumber: string,
  tx_ref: string,
  network: number,
  byPassValidator = false
) => {
  const payload = {
    data_plan: planId,
    bypass: byPassValidator,
    phone: phoneNumber,
    "request-id": tx_ref,
    network,
  };

  console.log({ payload });

  try {
    const res = await axios.post<DataVendingResponse>(
      "https://a4bdata.com/api/data/",
      payload,
      {
        headers: { Authorization: `Token ${process.env.A4BDATA_ACCESS_TOKEN}` },
      }
    );

    return res.data;
  } catch (error: any) {
    return {
      status: "failed",
      message: error.response?.data?.message,
    } as DataVendingResponse;
  }
};

export const buyAirtime = async (
  network: number,
  phoneNumber: string,
  amount: number,
  tx_ref: string,
  byPassValidator = false,
  plan_type = "VTU"
) => {
  try {
    const payload = {
      network,
      bypass: byPassValidator,
      phone: phoneNumber,
      "request-id": tx_ref,
      amount: amount.toString(),
      plan_type,
    };
    const res = await axios.post<AirtimeVendingResponse>(
      "https://a4bdata.com/api/topup/",
      payload,
      {
        headers: { Authorization: `Token ${process.env.A4BDATA_ACCESS_TOKEN}` },
      }
    );

    return res.data;
  } catch (error: any) {
    return {
      status: "failed",
      message: error.response.data.message,
    } as AirtimeVendingResponse;
  }
};

export const subscribeForCable = async (
  cableId: number,
  iuc: number,
  cablePlan: number,
  tx_ref: string,
  byPassValidator = false
) => {
  const payload = {
    cable: cableId,
    iuc,
    cable_plan: cablePlan,
    bypass: byPassValidator,
    "request-id": tx_ref,
  };
  const res = await axios.post<CableSubscriptionResponse>(
    `https://a4bdata.com/api/cable/`,
    payload,
    { headers: { Authorization: `Token ${process.env.A4BDATA_ACCESS_TOKEN}` } }
  );

  return res.data;
};

export async function buyExam(examId: number, requestId: string, quantity = 1) {
  // Create the payload
  const payload = {
    exam: examId,
    quantity: quantity,
    "request-id": requestId,
  };

  // Make the request
  const response = await axios.post<ExamResponse>(
    "https://a4bdata.com/api/exam",
    payload,
    {
      headers: { Authorization: `Token ${process.env.A4BDATA_ACCESS_TOKEN}` },
    }
  );

  // Parse and return the JSON response
  return response.data;
}

export const billPayment = async (payload: {
  disco: number;
  meter_type: "prepaid" | "postpaid";
  meter_number: number;
  amount: number;
  bypass?: boolean;
  "request-id": string;
}) => {
  try {
    const res = await axios.post<BillPaymentResponse>(
      `https://a4bdata.com/api/bill/`,
      payload,
      {
        headers: { Authorization: `Token ${process.env.A4BDATA_ACCESS_TOKEN}` },
      }
    );

    return res.data;
  } catch (error: any) {
    return {
      status: "failed",
      message: error.response.data.message,
    } as BillPaymentResponse;
  }
};

export const printRechargeCard = async (payload: {
  network: number;
  plan_type: number;
  quantity: number;
  card_name: string;
  "request-id": string;
}) => {
  const res = await axios.post<PrintRechargeCard>(
    `https://a4bdata.com/api/recharge_card/`,
    payload,
    { headers: { Authorization: `Token ${process.env.A4BDATA_ACCESS_TOKEN}` } }
  );

  return res.data;
};

export const verifyMeterNumber = async (
  meter_number: number,
  disco: number,
  meter_type: meterType
) => {
  try {
    const res = await axios.get<{
      status: transactionStatus;
      name: string;
    }>(
      `https://a4bdata.com/api/bill/bill-validation?meter_number=${meter_number}&disco=${disco}&meter_type=${meter_type}`,
      {
        headers: { Authorization: `Token ${process.env.A4BDATA_ACCESS_TOKEN}` },
      }
    );

    console.log(res.data);

    return res.data;
  } catch (error) {
    throw error;
  }
};

export function validatePhoneNumber(phoneNumber: string, network: string) {
  // Clean the number and ensure it's in a standard format
  const cleaned = phoneNumber.replace(/\D/g, "");
  network = network.toUpperCase();
  let prefix;

  // Extract the prefix - Nigerian networks are identified by the first 4 digits after the country code
  if (cleaned.startsWith("0")) {
    prefix = cleaned.substring(0, 4);
  } else if (cleaned.startsWith("234")) {
    prefix = "0" + cleaned.substring(3, 6);
  } else {
    prefix = "0" + cleaned.substring(0, 3);
  }

  // Network identification based on prefixes
  const networks: Record<string, string> = {
    // MTN prefixes
    "0803": "MTN",
    "0806": "MTN",
    "0703": "MTN",
    "0706": "MTN",
    "0813": "MTN",
    "0816": "MTN",
    "0810": "MTN",
    "0814": "MTN",
    "0903": "MTN",
    "0906": "MTN",
    "0913": "MTN",
    "0916": "MTN",

    // Glo prefixes
    "0805": "GLO",
    "0807": "GLO",
    "0705": "GLO",
    "0815": "GLO",
    "0811": "GLO",
    "0905": "GLO",
    "0915": "GLO",

    // Airtel prefixes
    "0802": "AIRTEL",
    "0808": "AIRTEL",
    "0708": "AIRTEL",
    "0812": "AIRTEL",
    "0701": "AIRTEL",
    "0901": "AIRTEL",
    "0902": "AIRTEL",
    "0904": "AIRTEL",
    "0912": "AIRTEL",

    // 9mobile (formerly Etisalat) prefixes
    "0809": "9MOBILE",
    "0818": "9MOBILE",
    "0817": "9MOBILE",
    "0909": "9MOBILE",
    "0908": "9MOBILE",
    "0919": "9MOBILE",
  };

  return {
    isValid: networks[prefix] === network,
    network: networks[prefix] || "Unknown",
  };
}

export const _verifyMeterNumber = async (
  meterNumber: string,
  electricityId: string
) => {
  const q = queryString.stringify({
    meterNumber,
    electricityId,
  });

  const res = await api.get<apiResponse<IValidateMeterResponse>>(
    `/create/electricity/verify-meter/?${q}`
  );

  return res.data.data;
};

export function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): void {
  // Clean the phone number (remove spaces, dashes, parentheses, etc.)
  const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");

  // Encode the message for URL
  const encodedMessage = encodeURIComponent(message);

  // Create the WhatsApp API URL
  const whatsappUrl = `https://wa.me/${cleanedPhoneNumber}?text=${encodedMessage}`;

  // Open WhatsApp in a new tab
  window.open(whatsappUrl, "_blank");
}

export const getTransactionsForAdmin = async (
  params: transactionRequestProps
) => {
  try {
    // Create filters object for search functionality
    const q = queryString.stringify(params);

    // Add search parameter if it exists

    // Call the server function with params and filters
    const response = await api.get<{
      data: {
        transactions: transactionsWithUserDetails[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          pages: number;
        };
      };
    }>(`/admin/overview/transactions/?${q}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
};

export const getStatusColor = (status: transactionStatus) => {
  switch (status) {
    case "success":
      return "text-green-500";
    case "failed":
      return "text-red-500";
    case "pending":
      return "text-yellow-500";
    default:
      return "text-gray-500";
  }
};

export const fetchUsers = async ({
  debouncedSearchQuery,
  status,
  role,
  currentPage = 1,
  limit = 10,
}: {
  debouncedSearchQuery?: string;
  status?: transactionStatus;
  role?: IUserRole;
  currentPage?: number;
  limit?: number;
}): Promise<UsersResponse> => {
  const params = new URLSearchParams();
  params.set("page", currentPage.toString());
  params.set("limit", limit.toString());

  if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
  if (status) params.set("status", status);
  if (role) params.set("role", role);

  const response = await fetch(`/api/admin/users?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
};

export const exportTransactions = async (params: transactionRequestProps) => {
  try {
    // Show loading state in the UI
    console.log("Exporting transactions with params:", params);

    // Create filters object for search functionality
    const filters: Record<string, any> = {};

    // Call the API to get the data for export with responseType: 'blob'
    const response = await api.post(
      "/admin/overview/transactions/export",
      { options: params, filters },
      { responseType: "blob" } // This is important for Axios to handle the response as a blob
    );

    // With Axios, the blob is directly in response.data
    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "text/csv",
    });

    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create a link element
    const a = document.createElement("a");
    a.href = url;

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers["content-disposition"];
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1].replace(/"/g, "")
      : `transactions-export-${new Date().toISOString().split("T")[0]}.csv`;

    a.download = filename;

    // Append the link to the body
    document.body.appendChild(a);

    // Click the link to trigger the download
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return true;
  } catch (error) {
    console.error("Error exporting transactions:", error);
    throw error;
  }
};

export const getTransactionById = async (id: string) => {
  try {
    const response = await api.get<{ data: transactionsWithUserDetails }>(
      `/admin/overview/transactions/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching transaction:", error);
    throw error;
  }
};

export const updateSectionSettings = async (
  section: string,
  updates: Partial<appProps>
) => {
  try {
    const res = await api.patch<{ data: appProps }>(
      `/admin/settings/${section}`,
      updates
    );
    return res.data;
  } catch (error) {}
};

/**
 * Utility function to detect browser compatibility issues
 * @returns Object containing compatibility information
 */
export const detectBrowserCompatibility = () => {
  if (typeof window === "undefined") return { isCompatible: true };

  const missingFeatures: string[] = [];

  // Check for essential modern browser features
  if (!window.Promise) missingFeatures.push("Promise");
  if (!window.fetch) missingFeatures.push("fetch");
  if (!window.IntersectionObserver)
    missingFeatures.push("IntersectionObserver");
  if (!window.requestAnimationFrame)
    missingFeatures.push("requestAnimationFrame");
  if (!window.localStorage) missingFeatures.push("localStorage");

  // Check for CSS features
  const testEl = document.createElement("div");
  if (testEl.style.flex === undefined) missingFeatures.push("flexbox");
  if (testEl.style.gridArea === undefined) missingFeatures.push("grid");

  return {
    isCompatible: missingFeatures.length === 0,
    missingFeatures,
    isOldBrowser: missingFeatures.length > 2, // Consider it an old browser if missing multiple features
    browserInfo: {
      userAgent: window.navigator.userAgent,
      vendor: window.navigator.vendor,
    },
  };
};
