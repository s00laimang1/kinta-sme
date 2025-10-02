import { LucideProps } from "lucide-react";
import mongoose from "mongoose";
import { ReactNode } from "react";

// AUTHENTICATION
export interface AuthHeaderProps {
  title: string;
  description?: ReactNode;
  showWaveEmoji?: boolean;
}

// PATHS
export enum PATHS {
  SIGNIN = "/auth/sign-in/",
  SIGNUP = "/auth/sign-up/",
  FORGET_PASSWORD = "/auth/forget-password/",
  TOP_UP_ACCOUNT = "/dashboard/wallet/top-up/",
  HOME = "/dashboard/home/",
  WALLET = "/dashboard/wallet/",
  BUY_DATA = "/dashboard/buy-data/",
  BUY_AIRTIME = "/dashboard/buy-airtime/",
  UTILITY_PAYMENT = "/dashboard/utility-payment/",
  TRANSACTIONS = "/dashboard/transactions/",
  SETTINGS = "/dashboard/settings/",
  ELECTRICITY_PAYMENTS = "/dashboard/utility-payment/electricity/",
  EXAM = "/dashboard/utility-payment/exam",
  RECHARGE_CARD = "/dashboard/utility-payment/recharge-card/",
  DATA_PLAN_PRICING = "/dashboard/data-plans/",
  ADMIN_OVERVIEW = "/admin/overview/",
  ADMIN_USERS = "/admin/users/",
  ADMIN_TRANSACTIONS = "/admin/transactions/",
  ADMIN_DATA_PLANS = "/admin/data-plans/",
  ADMIN_ELECTRICITY_BILLS = "/admin/electricity-bills/",
  ADMIN_SETTINGS = "/admin/settings/",
  ADMIN_REFERRALS = "/admin/referrals",
  REFER = "/dashboard/refer/",
}

// DASHBOARD
export interface HeaderProps {
  name: string;
  fullName: string;
  email: string;
  balance: string;
}

// BUY-DATA
export type dataTypes = string;

export type availableNetworks = "mtn" | "glo" | "airtel" | "9mobile";
export type planTypes = "CHEAP" | "SME" | "GIFTING";

export interface recentPurchaseNumbers {
  number: string;
  network: IBuyVtuNetworks;
  dataPlan: string;
  amount: number;
  date: string;
  onSelect?: (phoneNumber: string) => void;
}

export interface dataPlan {
  _id?: string;
  network: IBuyVtuNetworks;
  data: string;
  amount: number;
  type: planTypes;
  availability: string;
  isPopular?: boolean;
  planId: number | string;
  provider: "buyVTU" | "smePlug";
  isDisabled?: boolean;
  removedFromList?: boolean;
  dataAmount?: number;
}

export interface FeatureCardProps {
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  title: string;
  description: string;
  className?: string;
}

export interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

// STORES
export interface dashboardStore {
  // Getters
  title: string;

  // Setters
  setTitle: (title: string) => void;

  notification: {
    open: boolean;
    options?: {
      type: transactionStatus;
      title?: string;
      description?: string;
      tx_ref?: string;
    };
  };
  setNotification: (
    prop: boolean,
    options?: {
      type: transactionStatus;
      title?: string;
      description?: string;
      tx_ref?: string;
    }
  ) => void;
}

export interface userStore {
  user: IUser | null;
  setUser: (user: IUser | null) => void;
  getUserFirstName: (fullName: string) => string;
}

// MODELS

export type IUserRole = "user" | "admin";
export type accountStatus = "active" | "inactive";

export interface IUser extends Document {
  _id?: string;
  fullName: string;
  phoneNumber: string;
  country: string;
  balance: number;
  auth: {
    email: string;
    password: string;
    transactionPin: string;
  };
  role: IUserRole;
  createdAt?: string;
  updatedAt?: string;
  hasSetPin: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: accountStatus;
  refCode?: string;

  verifyTransactionPin: (pin: string) => Promise<boolean>;
  verifyUserBalance: (amount: number) => Promise<void>;
  sendResetPasswordToken: () => Promise<void>;
  verifyResetPasswordToken: (token: string) => Promise<boolean>;
  resetPassword: (password: string) => Promise<void>;
}

export interface accountDetailsTypes {
  accountNumber: string;
  accountName: string;
  bankName: availableBanks;
  bankCode: string;
  accountRef: string;
  expirationDate: string;
}

export interface dedicatedAccountNumber {
  accountDetails: accountDetailsTypes;
  user: string;
  hasDedicatedAccountNumber: boolean;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
  order_ref: string;
}

export interface otp {
  user: mongoose.Schema.Types.ObjectId;
  otp: string;
  createdAt?: string;
  updatedAt?: string;
  expirationTime: Date;
}

export interface VirtualAccountResponse<T = VirtualAccountData> {
  status: string;
  message: string;
  data: T;
}

export interface VirtualAccountData {
  response_code: string;
  response_message: string;
  flw_ref: string;
  order_ref: string;
  account_number: string;
  frequency: string;
  bank_name: string;
  created_at: string;
  expiry_date: string;
  note: string;
  amount?: number;
  tx_ref: string;
}

// TRANSACTIONS

export type transactionStatus = "success" | "failed" | "pending" | "refunded";
export type transactionType =
  | "funding"
  | "airtime"
  | "data"
  | "bill"
  | "recharge-card"
  | "exam";
export type paymentMethod =
  | "dedicatedAccount"
  | "virtualAccount"
  | "ownAccount";

export interface transaction<T = any> {
  amount: number;
  tx_ref: string;
  user: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  status: transactionStatus;
  type: transactionType;
  paymentMethod: paymentMethod;
  accountId?: string;
  meta?: T & {
    dataId?: string;
  };
  _id?: string;
}

export interface recentlyUsedContact<T = any> {
  uid: string;
  type: transactionType;
  createdAt?: string;
  updatedAt?: string;
  lastUsed: string;
  meta?: T;
}

export type meterType = "PREPAID" | "POSTPAID";

export interface electricity {
  _id?: string;
  discoId: string;
  discoName: string;
  logoUrl?: string;
  type: meterType;
}

// FLUTTERWAVE WEBHOOK

export interface flutterwaveWebhook<T = any> {
  event: "charge.completed";
  data: {
    id: string;
    tx_ref: string;
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    currency: "NGN";
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: "PIN";
    ip: string;
    narration: string;
    status: "successful" | "failed";
    payment_type: "card";
    created_at: "2020-07-06T19:17:04.000Z";
    account_id: number;
    customer: {
      id: number;
      name: string;
      phone_number: null;
      email: string;
      created_at: string;
    };
    meta?: T;
  };
}

// VERIFYING PAYMENT
export interface VerifyingPaymentProps {
  paymentId: string;
  onSuccess?: () => void;
  onFailure?: () => void;
}

// APP CONFIGS

export interface appProps extends Document {
  stopAllTransactions: boolean;
  stopSomeTransactions: transactionType[];
  stopAccountCreation: boolean;
  bankAccountToCreateForUsers: availableBanks | "random";
  transactionLimit: number;
  requireUserVerification: boolean;
  maintenanceMode: boolean;
  defaultUserRole: IUserRole;
  systemMessage?: string;
  apiRateLimit?: number;
  logLevel?: "error" | "warn" | "info" | "debug" | "trace";
  force2FA?: boolean;
  passwordPolicy?: "basic" | "medium" | "strong" | "very-strong";
  sessionTimeout?: number;
  adminIpWhitelist?: string[];
  buyVtu: {
    accessToken: string;
    expiredAt: string;
    url: string;
  };

  disabledPlans: string[];

  // Methods
  isTransactionEnable: (transactionType?: transactionType) => Promise<void>;
  checkTransactionLimit: (amount: number) => Promise<void>;
  systemIsunderMaintainance: () => Promise<void>;
  isAccountCreationStopped: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
}

export interface ChartDataPoint {
  name: string; // month
  revenue: number; // amount for that month
  users: number; // users registered that month
}

// Vending Responses
export interface DataVendingResponse {
  network: string;
  "request-id": string;
  amount: string;
  dataplan: string;
  status: string;
  message: string;
  phone_number: string;
  oldbal: string;
  newbal: number;
  system: string;
  plan_type: string;
  wallet_vending: string;
}

export interface AirtimeVendingResponse {
  network: string;
  "request-id": string;
  amount: number;
  discount: number;
  status: string;
  message: string;
  phone_number: string;
  oldbal: string;
  newbal: number;
  system: string;
  plan_type: string;
  wallet_vending: string;
}

export interface CableSubscriptionResponse {
  cabl_name: string;
  "request-id": string;
  amount: string;
  charges: number;
  status: string;
  message: string;
  iuc: string;
  oldbal: string;
  newbal: number;
  system: string;
  wallet_vending: string;
  plan_name: string;
}

export interface BillPaymentResponse {
  disco_name: string;
  "request-id": string;
  amount: number;
  charges: number;
  status: transactionStatus;
  message: string;
  meter_number: string;
  meter_type: "POSTPAID" | "PREPAID";
  oldbal: string;
  newbal: number;
  system: "API";
  token: string;
  wallet_vending: "wallet";
}

export interface PrintRechargeCard {
  network: availableNetworks;
  "request-id": string;
  amount: number;
  quantity: number;
  status: transactionStatus;
  message: string;
  card_name: string;
  oldbal: string;
  newbal: number;
  system: "API";
  serial: string;
  pin: string;
  load_pin: string;
  check_balance: string;
}

export interface ExamResponse {
  username: string;
  amount: number;
  quantity: number;
  message: string;
  oldbal: string;
  newbal: number;
  date: string;
  status: "success";
  "request-id": string;
  pin: string;
}

export interface MeterVerificationResponse {
  status: "success";
  name: string;
}

export type examType = "waec" | "neco" | "nabteb";

export interface exam {
  _id?: string;
  examType: examType;
  amount: number;
  examId: number;
}

// BUDPAY TYPES
export interface createOneTimeVirtualAccountProps {
  email: string;
  amount: string;
  currency: "NGN";
  reference: string;
  name: string;
}

export interface createOneTimeVirtualAccountResponse {
  status: boolean;
  message: string;
  data: {
    account_name: string;
    account_number: string;
    bank_name: string;
  };
  tx_ref?: string;
}

export interface createDedicatedAccountProps {
  email: string;
  reference: string;
  firstName: string;
  lastName: string;
  phone: string;
  bank: availableBanks;
}

export interface createCustomerProps<T = any> {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  metadata?: T;
}

export interface createCustomerResponse {
  status: boolean;
  message: string;
  data: {
    email: string;
    domain: "test";
    customer_code: string;
    id: number;
    created_at: string;
    updated_at: string;
  };
}

// Customer information
interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  customer_code: string;
  phone: string;
}

// BILL_STACK TYPES
export type availableBanks =
  | "9PSB"
  | "SAFEHAVEN"
  | "PROVIDUS"
  | "BANKLY"
  | "PALMPAY";

export interface generatedBankAccount {
  account_number: string;
  account_name: string;
  bank_name: availableBanks;
  bank_id: availableBanks;
  created_at: string;
}

export interface createDedicatedVirtualAccountResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    account: generatedBankAccount[];
    meta: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  err?: any;
}

// BUDPAY WEBHOOK PROPS
interface Customer {
  id: number;
  email: string;
  phone: string;
  domain: string;
  status: string;
  metadata: string;
  last_name: string;
  first_name: string;
  customer_code: string;
}

// Transfer details
interface TransferDetails {
  amount: string;
  bankcode: string;
  bankname: string;
  craccount: string;
  narration: string;
  sessionid: string;
  craccountname: string;
  originatorname: string;
  paymentReference: string;
  originatoraccountnumber: string;
}

// Transaction data
interface TransactionData {
  id: number;
  fees: string;
  plan: null;
  type: string;
  amount: string;
  domain: string;
  status: string;
  channel: string;
  gateway: string;
  message: string;
  paid_at: string;
  currency: string;
  customer: Customer;
  reference: string;
  created_at: string;
  ip_address: null;
  business_id: number;
  customer_id: number;
  card_attempt: number;
  requested_amount: string;
}

// Main response structure
export interface BudPayWebhookPayload {
  data: TransactionData;
  notify: string;
  notifyType: string;
  transferDetails: TransferDetails;
}

// History entry in transaction log
interface LogHistoryEntry {
  type: string;
  message: string;
  time: number;
}

// Transaction log information
interface TransactionLog {
  time_spent: number;
  attempts: number;
  authentication: null | string;
  errors: number;
  success: boolean;
  channel: string;
  history: LogHistoryEntry[];
}

// Customer information
interface Customer {
  id: number;
  customer_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  metadata: string;
}

// Transaction data
interface TransactionData {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: string;
  gateway_response: null | string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  // ip_address: string;
}

// Main response structure
export interface fetchTransactionResponse {
  status: boolean;
  message: string;
  data: TransactionData;
  log: TransactionLog;
  fees: null | string | number;
  customer: Customer;
  plan: null | string | object;
  paid_at: string;
  created_at: string;
  requested_amount: string;
}

// BILL_STACK_WEBHOOK_PAYLOAD
export interface BillStackWebhookPayload {
  event: "PAYMENT_NOTIFICATION";
  data: {
    type: "RESERVED_ACCOUNT_TRANSACTION";
    reference: string;
    merchant_reference: string;
    transaction_ref: string;
    wiaxy_ref: string;
    amount: number;
    created_at: string;
    account: {
      account_number: string;
      account_name: string;
      bank_name: string;
      created_at: string;
    };
    payer: {
      account_number: string;
      first_name: string;
      last_name: string;
      createdAt: string;
    }[];
  };
}

export interface transactionRequestProps {
  startDate?: string;
  endDate?: string;
  status?: transactionStatus;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: -1 | 1;
  search?: string;
  today?: boolean;
}

export interface transactionsWithUserDetails extends transaction {
  transaction_id: string;
  amount: number;
  status: transactionStatus;
  createdAt: string;
  userEmail: string;
  userfullName: string;
}

export type UsersResponse = {
  status: string;
  message: string;
  data: {
    users: IUser[];
    total: number;
  };
};

export interface systemMessage {
  message: string;
  messageId: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
  title?: string;

  // METHODS
  updateMessage: (message: string, title?: string) => Promise<systemMessage>;
}

export interface buyVtuResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

export type IBuyVtuNetworks = "Mtn" | "9Mobile" | "Glo" | "Airtel";

export interface buyVtuDataPlan {
  id: number;
  network: IBuyVtuNetworks;
  data: string;
  value: string;
  amount: number;
  validity: string;
  availabilityStatus: number;
}

export interface IBuyNetworkResponse {
  id: number;
  name: string;
}

export interface IBuyVtuElectricityResponse {
  id: number;
  name: string;
  type: "PREPAID" | "POSTPAID";
}

export interface IBuyVtuVendResponse {
  recipientCount: number;
  recipients: string;
  cost: number;
  totalAmount: number;
  vendReport: Record<string, string>;
  vendStatus: null;
  commissionEarned: number;
}

export interface IValidateMeterResponse {
  customerName: string;
  customerAddress: string;
}

export interface IVendPowerResponse {
  recipientCount: number;
  recipients: string;
  cost: number;
  totalAmount: string;
  vendReport: [];
  vendStatus: "successful";
  commissionEarned: number;
  token: string;
}

export interface IReferral {
  _id?: string;
  referralCode: string;
  user: string;
  referree: string;
  rewardClaimed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IReferralResponse extends IReferral {
  referreeName: string;
  referreeEmail: string;
  isEmailVerified: boolean;
  referralCount: number;
}

//"event": "PAYMENT_NOTIFICATION",
//  "data": {
//    "type": "RESERVED_ACCOUNT_TRANSACTION",
//    "reference": "R-WBKQMRXZYU",
//    "merchant_reference": "6805e8bc1cb5bf768baba38c",
//    "wiaxy_ref": "100004250421075326131232151998",
//    "transaction_ref": "100004250421075326131232151998",
//    "amount": "500",
//    "created_at": "2025-04-21 08:53:37",
//    "account": {
//      "account_number": "5760483856",
//      "account_name": "Am for even business alias-Abubakar Sadiq",
//      "bank_name": "9PSB Bank",
//      "bank_id": "9PSB",
//      "created_at": "2025-04-21 07:42:14"
//    },
//    "payer": {
//      "account_number": "5760483856",
//      "account_name": "Am for even business alias-Abubakar Sadiq",
//      "bank_name": "9PSB Bank",
//      "bank_id": "9PSB",
//      "created_at": "2025-04-21 07:42:14"
//    },
//    "customer": {
//      "firstName": "Abubakar",
//      "lastName": "Sadiq",
//      "email": "wanchiko20@gmail.com"
//    }

export interface VtuPassPayResponse {
  code: string;
  content: {
    transactions: {
      status: string;
      product_name: string;
      unique_element: string;
      unit_price: string;
      quantity: number;
      service_verification: null;
      channel: string;
      commission: number;
      total_amount: number;
      discount: null;
      type: string;
      email: string;
      phone: string;
      name: null;
      convinience_fee: number;
      amount: string;
      platform: string;
      method: string;
      transactionId: string;
      commission_details: {
        amount: number;
        rate: string;
        rate_type: string;
        computation_type: string;
      };
    };
  };
  response_description: string;
  requestId: string;
  amount: number;
  transaction_date: string;
  purchased_code: string;
}
