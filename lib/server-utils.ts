import { Account } from "@/models/account";
import { App } from "@/models/app";
import { Transaction } from "@/models/transactions";
import { User } from "@/models/users";
import {
  availableBanks,
  buyVtuResponse,
  ChartDataPoint,
  createCustomerProps,
  createCustomerResponse,
  createDedicatedAccountProps,
  createDedicatedVirtualAccountResponse,
  createOneTimeVirtualAccountProps,
  createOneTimeVirtualAccountResponse,
  dedicatedAccountNumber,
  fetchTransactionResponse,
  IBuyNetworkResponse,
  IBuyVtuElectricityResponse,
  IBuyVtuNetworks,
  IUser,
  transactionRequestProps,
  IBuyVtuVendResponse,
  buyVtuDataPlan,
  IValidateMeterResponse,
  IVendPowerResponse,
  transaction,
  transactionType,
  IReferral,
  DataVendingResponse,
  AirtimeVendingResponse,
  VtuPassPayResponse,
  availableNetworks,
} from "@/types";
import axios from "axios";
import mongoose, { PipelineStage } from "mongoose";
import { connectToDatabase } from "./connect-to-db";
import {
  buyVtuApi,
  validatePhoneNumber as validatePhoneNumberApi,
} from "./utils";
import { addToRecentlyUsedContact } from "@/models/recently-used-contact";
import { createTransport } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { Referral } from "@/models/referral";

export const budPay = (type: "s2s" | "v2" = "v2") => {
  console.log(type)
  return axios.create({
    baseURL: `https://api.budpay.com/api/${type}`,
  });
};



export const vtuPassApi = axios.create({
  baseURL: `https://vtpass.com/api`,
  headers: {
    "api-key": process.env.VTU_PASS_API_KEY,
    "secret-key": process.env.VTU_PASS_SECRET_KEY,
    "public-key": process.env.VTU_PASS_PUBLIC_KEY,
  },
});

export const createOneTimeVirtualAccount = async (
  payload: createOneTimeVirtualAccountProps
) => {
  const response = await budPay(
    "s2s"
  ).post<createOneTimeVirtualAccountResponse>(
    `/banktransfer/initialize/`,
    payload,
    { headers: { Authorization: `Bearer ${process.env.BUDPAY_SECRET_KEY}` } }
  );

  return response.data;
};

export const createCustomer = async (payload: createCustomerProps) => {
  const response = await budPay("v2").post<createCustomerResponse>(
    `/customer/`,
    payload,
    {
      headers: { Authorization: `Bearer ${process.env.BUDPAY_SECRET_KEY}` },
    }
  );

  return response.data;
};

export const createDedicatedVirtualAccount = async (
  payload: createDedicatedAccountProps
) => {
  try {
    const response = await axios.post<createDedicatedVirtualAccountResponse>(
      `https://api.billstack.co/v2/thirdparty/generateVirtualAccount/`,
      { ...payload, reference: payload.reference.toString() },
      {
        headers: {
          Authorization: `Bearer ${process.env.BILL_STACK_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.log({ error: "We have an error" });
    return {
      status: false,
      message: (error as Error).message,
      err: error?.response?.data,
    } as createDedicatedVirtualAccountResponse;
  }
};

export const verifyTransactionWithBudPay = async (id: string) => {
  try {
    const res = await budPay("s2s").get<fetchTransactionResponse>(
      `/transaction/verify/${id}`,
      { headers: { Authorization: `Bearer ${process.env.BUDPAY_SECRET_KEY}` } }
    );

    return res.data;
  } catch (error) {
    console.log(error);
    return { status: false } as fetchTransactionResponse;
  }
};

export async function getChartData(year?: number): Promise<ChartDataPoint[]> {
  const currentYear = year || new Date().getFullYear();

  // Get revenue data from transactions
  const revenueData = await Transaction.aggregate([
    // Filter transactions for the specified year
    {
      $match: {
        createdAt: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`),
        },
        status: "success", // Only count successful transactions
        type: "funding", // Only count funding transactions for revenue
      },
    },
    // Group by month
    {
      $group: {
        _id: { $month: "$createdAt" },
        revenue: { $sum: "$amount" },
      },
    },
    // Format the output
    {
      $project: {
        _id: 0,
        month: "$_id",
        revenue: 1,
      },
    },
    // Sort by month
    {
      $sort: { month: 1 },
    },
  ]);

  // Get new user counts
  const userData = await User.aggregate([
    // Filter users created in the specified year
    {
      $match: {
        createdAt: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`),
        },
      },
    },
    // Group by month
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
    // Format the output
    {
      $project: {
        _id: 0,
        month: "$_id",
        users: "$count",
      },
    },
    // Sort by month
    {
      $sort: { month: 1 },
    },
  ]);

  // Create a map of month numbers to month names
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Initialize result array with all months
  const result: ChartDataPoint[] = monthNames.map((name, index) => ({
    name,
    revenue: 0,
    users: 0,
  }));

  // Fill in revenue data
  revenueData.forEach((item: { month: number; revenue: number }) => {
    if (item.month >= 1 && item.month <= 12) {
      result[item.month - 1].revenue = item.revenue;
    }
  });

  // Fill in user data
  userData.forEach((item: { month: number; users: number }) => {
    if (item.month >= 1 && item.month <= 12) {
      result[item.month - 1].users = item.users;
    }
  });

  return result;
}

export async function getTransactionsWithUserDetails(
  options: transactionRequestProps,
  filters: Record<string, any> = {}
) {
  const {
    startDate,
    endDate,
    status,
    limit = 50,
    page = 1,
    sortBy = "createdAt",
    sortOrder = -1,
    today = false,
  } = options;

  // Build the match stage for the pipeline
  const match: Record<string, any> = { ...filters };

  // Fix: Move the search condition to match instead of filters
  if (filters.search) {
    match.$or = [{ _id: { $regex: filters.search, $options: "i" } }];
    delete match.search; // Remove the search field from match criteria
  }

  // Fix: Handle date filtering properly, especially the 'today' option
  if (today) {
    // If today is true, set date range to the current day
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    match.createdAt = {
      $gte: startOfDay,
      $lte: endOfDay,
    };
  } else if (startDate || endDate) {
    // Traditional date range filtering
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  if (status) match.status = status;

  try {
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          let: { userId: "$user" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$userId" }] } },
            },
            {
              $project: {
                email: "$auth.email",
                fullName: 1,
              },
            },
          ],
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    // Fetch transactions with user details
    const transactions = await Transaction.aggregate(pipeline);

    // Format the result
    const formattedTransactions = transactions.map((transaction) => ({
      transaction_id: transaction._id,
      amount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.createdAt,
      userEmail: transaction.userDetails?.email || "No email available",
      userfullName: transaction.userDetails?.fullName || "Unknown user",
      ...transaction,
    }));

    // Count the total number of matching transactions for pagination
    const countPipeline = [{ $match: match }, { $count: "total" }];
    const countResult = await Transaction.aggregate(countPipeline);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    return {
      transactions: formattedTransactions,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching transactions with user details:", error);
    throw error;
  }
}

export async function getTransactionByIdWithUserDetails(id: string) {
  try {
    // Validate that the ID is a valid MongoDB ObjectId

    // Execute the aggregation
    const result = await Transaction.findById(id);

    // If no transaction is found, return null
    if (!result) {
      return null;
    }

    const user = await User.findById(result.user);

    return {
      transaction_id: result._id,
      amount: result.amount,
      tx_ref: result.tx_ref,
      user: result.user,
      note: result.note,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      status: result.status,
      type: result.type,
      paymentMethod: result.paymentMethod,
      accountId: result.accountId,
      meta: result.meta,
      userEmail: user?.auth.email || "No email available",
      userfullName: user?.fullName || "Unknown user",
    };
  } catch (error) {
    console.error("Error fetching transaction with user details:", error);
    throw error;
  }
}

export async function processVirtualAccountForUser(
  user: IUser,
  preferableBank: availableBanks = "PALMPAY"
) {
  const appConfigs = await App.findOne({});

  let dedicatedAccountToOpenForUsers: availableBanks;

  await connectToDatabase();

  // Check if the account to create for users is not random then assign the available one else generate randomly

  if (!preferableBank) {
    if (
      appConfigs?.bankAccountToCreateForUsers &&
      appConfigs?.bankAccountToCreateForUsers !== "random"
    ) {
      dedicatedAccountToOpenForUsers = appConfigs?.bankAccountToCreateForUsers;
    } else {
      const banks: availableBanks[] = [
        "9PSB",
        "BANKLY",
        "PALMPAY",
        "PROVIDUS",
        "SAFEHAVEN",
      ];

      dedicatedAccountToOpenForUsers = banks[2];
    }
  } else {
    dedicatedAccountToOpenForUsers = preferableBank;
  }

  const newUser = user; //Assign this as newUser for clarity
  const [firstName, lastName] = newUser?.fullName?.split(" "); //Split the user full name into firstName and lastName

  if (!lastName) {
    await sendEmail([newUser.auth.email], "", "Missing Last Name");
  }

  // Create a virtual account for the user
  const account = await createDedicatedVirtualAccount({
    bank: dedicatedAccountToOpenForUsers,
    email: newUser?.auth?.email,
    firstName,
    lastName: lastName || firstName,
    phone: newUser.phoneNumber,
    reference: user._id!,
  });

  // If the creation is not successful, notify the user about it
  if (!account.status) {
    throw new Error(
      account?.message ||
        "Unable to create a dedicated account for you, please try again later"
    );
  }

  // destructure the the virtual account response and rename some propertird
  const { account: newVirtualAccount, ...rest } = account.data;

  // Save dedicated account
  const virtualAccount = newVirtualAccount[0];

  // Prepare the payload for saving the user account
  const virtualAccountPayload: dedicatedAccountNumber = {
    accountDetails: {
      accountName: virtualAccount.account_name,
      accountNumber: virtualAccount.account_number,
      accountRef: rest.reference,
      bankCode: virtualAccount.bank_id,
      bankName: virtualAccount.bank_name,
      expirationDate: account.message,
    },
    hasDedicatedAccountNumber: true,
    order_ref: newUser._id!,
    user: newUser._id!,
  };

  // Instanciate the Account method
  const _account = new Account(virtualAccountPayload);

  // Save the virtual account the user create
  await _account.save();

  return virtualAccountPayload;
}

export async function sendEmail(
  recipients: string[],
  emailTemplate: string,
  subject: string,
  replyTo?: string
) {
  //let configOptions: SMTPTransport | SMTPTransport.Options | string = {
  //  host: "smtp-relay.brevo.com",
  //  port: 465,
  //  ignoreTLS: true,
  //  secure: false,
  //  auth: {
  //    user: process.env.HOST_EMAIL,
  //    pass: process.env.HOST_EMAIL_PASSWORD,
  //  },
  //};

  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        name: "KINTA SME",
        email: replyTo || "s00laimang00@gmail.com",
      },
      to: recipients.map((recipient) => ({ email: recipient })),

      subject: subject,
      htmlContent: emailTemplate,
    },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
    }
  );

  //const transporter = createTransport(configOptions);
  //await transporter.sendMail({
  //  from: "kinta@data.com",
  //  to: recipients,
  //  html: emailTemplate,
  //  replyTo,
  //  subject: subject,
  //});
}

//Class to purchase data, airtime, exam token, electricity

export class BuyVTU {
  private accessToken?: string;
  private transactionPin: string;
  network?: IBuyVtuNetworks;
  ref: string;
  vendingResponse?: IBuyVtuVendResponse;
  dataPlans?: buyVtuDataPlan[];
  electricityDisco?: IBuyVtuElectricityResponse[];
  networks?: IBuyNetworkResponse[];
  validateMeterResponse?: IValidateMeterResponse;
  powerVendResponse?: IVendPowerResponse;
  transaction?: transaction;
  session: null | mongoose.ClientSession;
  status: boolean;
  message: string | null;
  validatePhoneNumber?: boolean;
  amount?: number;

  constructor(
    accessToken?: string,
    phoneNumberValidatorPayload?: {
      validatePhoneNumber?: boolean;
      network?: string;
      phoneNumber: string;
    }
  ) {
    this.accessToken = accessToken;
    this.transactionPin = process.env.BUY_VTU_TRANSACTION_PIN!;
    this.ref = new mongoose.Types.ObjectId().toString();
    this.session = null;
    this.status = false;
    this.message = null;
    this.validatePhoneNumber = phoneNumberValidatorPayload?.validatePhoneNumber;
    this.amount = 0;

    //If we want to validate the user phone number first before moving on
    if (this.validatePhoneNumber) {
      const { isValid } = validatePhoneNumberApi(
        phoneNumberValidatorPayload?.phoneNumber!,
        phoneNumberValidatorPayload?.network!
      );

      if (!isValid) {
        throw new Error(
          "NETWORK_MISMATCH: this phone number you provided is not matching with the network you selected."
        );
      }
    }
  }

  private getNetworkId(networkId: IBuyVtuNetworks) {
    const networkIds: Record<IBuyVtuNetworks, 1 | 2 | 3 | 4> = {
      Mtn: 1,
      "9Mobile": 2,
      Glo: 3,
      Airtel: 4,
    };

    return networkIds[networkId];
  }

  public set setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
  }

  public set setNetwork(network: IBuyVtuNetworks) {
    this.network = network;
  }

  public async startSession() {
    if (!this.session) {
      this.session = await mongoose.startSession();
      this.session.startTransaction();
    }
    return this;
  }

  // Fixed session management - properly handle committed vs active transactions
  public async endSession() {
    if (this.session) {
      // Only abort if transaction is still active (not committed)
      if (this.session.inTransaction()) {
        await this.session.abortTransaction();
      }
      await this.session.endSession();
      this.session = null;
    }
    return this;
  }

  public async commitSession() {
    if (this.session && this.session.inTransaction()) {
      await this.session.commitTransaction();
    }
    return this;
  }

  // Add method to abort transaction explicitly
  public async abortSession() {
    if (this.session && this.session.inTransaction()) {
      await this.session.abortTransaction();
    }
    return this;
  }

  // Error handling improved with try/catch blocks
  public async getNetworks() {
    try {
      const resp = await buyVtuApi.get<buyVtuResponse<IBuyNetworkResponse[]>>(
        `/networks`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      this.networks = resp.data.data;
      return this;
    } catch (error) {
      this.status = false;
      this.message =
        error instanceof Error ? error.message : "Failed to fetch networks";
      return this;
    }
  }

  public async getElectricityDisco() {
    try {
      const resp = await buyVtuApi.get<
        buyVtuResponse<IBuyVtuElectricityResponse[]>
      >(`/power/discos/`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      this.electricityDisco = resp.data.data;
      return this;
    } catch (error) {
      this.status = false;
      this.message =
        error instanceof Error
          ? error.message
          : "Failed to fetch electricity distributors";
      return this;
    }
  }

  public async getDataPlans() {
    try {
      if (!this.network) {
        throw new Error("Network must be set before fetching data plans");
      }

      const resp = await buyVtuApi.get<buyVtuResponse<buyVtuDataPlan[]>>(
        `/data/plans/${this.getNetworkId(this.network!)}`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      this.dataPlans = resp.data.data;
      this.status = true;
      return this;
    } catch (error) {
      this.status = false;
      this.message =
        error instanceof Error ? error.message : "Failed to fetch data plans";
      return this;
    }
  }

  public async buyData(planId: string, phoneNumber: string) {
    try {
      if (!this.accessToken) {
        throw new Error("Access token not set");
      }

      const resp = await buyVtuApi.post<buyVtuResponse<IBuyVtuVendResponse>>(
        `/data/vend`,
        {
          planId,
          customRef: this.ref,
          transactionPin: this.transactionPin,
          recipient: phoneNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      this.vendingResponse = resp.data.data;
      this.status = Boolean(
        resp.data?.success &&
          resp.data.data.vendReport[phoneNumber] === "successful"
      );
      this.message = !this.status ? "Data vending failed" : resp.data?.message;

      return this;
    } catch (error) {
      console.error(error);
      this.status = false;
      this.message =
        error instanceof Error && error.message
          ? error.message
          : "DATA_PURCHASE_FAILED: unable to process your request.";
      return this;
    }
  }

  public async buyAirtime(phoneNumber: string, amount: number) {
    try {
      if (!this.accessToken) {
        throw new Error("Access token not set");
      }

      const resp = await buyVtuApi.post<buyVtuResponse<IBuyVtuVendResponse>>(
        `/airtime/vend`,
        {
          customRef: this.ref,
          transactionPin: this.transactionPin,
          amount,
          recipient: phoneNumber,
          networkId: this.getNetworkId(this.network!),
        },
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );

      this.vendingResponse = resp.data.data;
      this.status = Boolean(
        resp.data?.success &&
          resp.data.data.vendReport[phoneNumber] === "successful"
      );
      this.message = !this.status
        ? "Airtime vending failed"
        : resp.data?.message;

      return this;
    } catch (error) {
      this.status = false;

      this.message =
        //@ts-ignore
        error.response?.data?.data?.errorDesc ||
        "AIRTIME_PURCHASE_FAILED: unable to process your request.";
      return this;
    }
  }

  public async buyAirtimeFromA4bData(payload: {
    network: string;
    phone: string;
    amount: number;
    "request-id": string;
    bypass?: boolean;
  }) {
    try {
      const { data, status } = await axios.post<AirtimeVendingResponse>(
        `https://a4bdata.com/api/topup/`,
        { ...payload, plan_type: "VTU" },
        {
          headers: {
            Authorization: `Token ${process.env.A4BDATA_ACCESS_TOKEN}`,
          },
        }
      );

      this.vendingResponse = {
        commissionEarned: data.discount,
        cost: data.amount,
        recipientCount: 1,
        recipients: data.phone_number,
        totalAmount: data.amount,
        vendReport: {
          [data.phone_number]: "successful",
        },
        vendStatus: null,
      };
      this.status = Boolean(
        status === 200 &&
          this.vendingResponse.vendReport?.[data.phone_number] === "successful"
      );
      this.message = !this.status
        ? "Airtime vending failed"
        : "Airtime purchase successful, you will be creditted soon";

      return this;
    } catch (error: any) {
      console.log(error.response);

      this.status = false;

      this.message =
        //@ts-ignore
        error.response?.data?.data?.errorDesc ||
        "AIRTIME_PURCHASE_FAILED: unable to process your request.";
      return this;
    }
  }

  public async validateMeterNo(discoId: string, meterNo: string) {
    try {
      if (!this.accessToken) {
        throw new Error("Access token not set");
      }

      const resp = await buyVtuApi.post<buyVtuResponse<IValidateMeterResponse>>(
        `/power/validateMeterNo`,
        {
          meterNo,
          discoId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      this.validateMeterResponse = resp.data.data;
      this.status = true;
      return this;
    } catch (error) {
      this.status = false;
      this.message =
        error instanceof Error
          ? error.message
          : "METER_VALIDATION_FAILED: unable to validate meter.";
      return this;
    }
  }

  public async buyPower(payload: {
    amount: number;
    discoId: string;
    meterNo: string;
  }) {
    try {
      if (!this.accessToken) {
        throw new Error("Access token not set");
      }

      const resp = await buyVtuApi.post<buyVtuResponse<IVendPowerResponse>>(
        `/power/vend`,
        {
          customRef: this.ref,
          transactionPin: this.transactionPin,
          ...payload,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      this.powerVendResponse = resp.data.data;
      this.status = resp.data?.success;
      this.message = resp.data?.message ?? "Power purchase successful";

      return this;
    } catch (error) {
      this.status = false;
      this.message =
        error instanceof Error
          ? error.message
          : "POWER_PURCHASE_FAILED: unable to process your request.";
      return this;
    }
  }

  //  public async createTransaction(
  //    type: transactionType,
  //    userId: string,
  //    options?: Record<string, any>
  //  ) {
  //    try {
  //      if (!this.session) {
  //        throw new Error("Session not started. Call startSession first.");
  //      }
  //
  //      if (!this.status) return;
  //
  //      const meta = {
  //        ...this.vendingResponse,
  //        ...this.powerVendResponse,
  //        ...options,
  //      };
  //
  //      const trxPayload: transaction = {
  //        amount:
  //          this.amount ||
  //          this.vendingResponse?.totalAmount ||
  //          this.powerVendResponse?.cost ||
  //          0,
  //        paymentMethod: "ownAccount",
  //        accountId:
  //          this.vendingResponse?.recipients ||
  //          this.powerVendResponse?.recipients,
  //        status: this.status ? "success" : "failed",
  //        tx_ref: this.ref,
  //        type,
  //        user: userId,
  //        meta,
  //      };
  //
  //      const transaction = new Transaction(trxPayload);
  //      await transaction.save({ session: this.session });
  //
  //      // Save the user contact to recently used contact
  //      await addToRecentlyUsedContact(
  //        userId,
  //        trxPayload.type,
  //        { ...meta, network: this.network },
  //        this.session
  //      );
  //
  //      this.transaction = transaction;
  //      this.status = true;
  //      return this;
  //    } catch (error) {
  //      this.status = false;
  //      this.message =
  //        error instanceof Error
  //          ? error.message
  //          : "TRANSACTION_CREATION_FAILED: unable to create transaction.";
  //      return this;
  //    }
  //  }

  // Implementation for validator method
  public async validator(phoneNumber: string) {
    try {
      // Add your validation logic here
      // For example, check if phoneNumber is valid for the network
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error("Invalid phone number");
      }

      this.status = true;
      return this;
    } catch (error) {
      this.status = false;
      this.message =
        error instanceof Error
          ? error.message
          : "VALIDATION_FAILED: Invalid input.";
      return this;
    }
  }

  public async buyDataFromSMEPLUG(
    networkId: number,
    planId: number,
    phoneNumber: string,
    amount: number,
    ref: string
  ) {
    try {
      interface IRes {
        status: boolean;
        data: {
          current_status: string;
          reference: string;
          msg: string;
        };
      }

      const payload = {
        network_id: networkId,
        plan_id: planId,
        phone: phoneNumber,
        customer_reference: ref,
      };

      const res = await axios.post<IRes>(
        `https://smeplug.ng/api/v1/data/purchase`,
        payload,
        {
          headers: {
            Authorization: `Bearer 34a79f30767afa70514e239c5b990e68a16ba073db6a03ec2d8d6245075236df`,
          },
        }
      );

      console.log(res.data);

      this.vendingResponse = {
        recipientCount: 1,
        recipients: phoneNumber,
        cost: amount,
        totalAmount: amount,
        vendReport: {
          [phoneNumber]: res.data.data.current_status ? "successful" : "failed",
        },
        vendStatus: null,
        commissionEarned: 0,
      };

      this.status = Boolean(
        res.data.status &&
          this.vendingResponse.vendReport[phoneNumber] === "successful"
      );
      this.message = !this.status
        ? res.data.data.msg || "Data vending failed"
        : res.data.data.msg;

      return this;
    } catch (error: any) {
      console.log(error.response);
      this.status = false;
      this.message =
        error instanceof Error && error.message
          ? error.message
          : "DATA_PURCHASE_FAILED: unable to process your request.";
      return this;
    }
  }

  public async buyDataFromA4BData(
    network: string,
    data_plan: string,
    phoneNumber: string,
    bypass: boolean = false
  ) {
    try {
      const payload = {
        network,
        data_plan,
        phone: phoneNumber,
        "request-id": this.ref,
        bypass,
      };

      const res = await axios.post<DataVendingResponse>(
        `https://a4bdata.com/api/data`,
        payload,
        {
          headers: {
            Authorization: `Token ${process.env.A4BDATA_ACCESS_TOKEN}`,
          },
        }
      );

      console.log(res.data);

      this.vendingResponse = {
        recipientCount: 1,
        recipients: phoneNumber,
        cost: Number(res.data?.amount),
        totalAmount: Number(res.data?.amount),
        vendReport: {
          [phoneNumber]:
            res.data.status === "success" ? "successful" : "failed",
        },
        vendStatus: null,
        commissionEarned: 0,
      };

      this.status = Boolean(
        res.data.status &&
          this.vendingResponse.vendReport[phoneNumber] === "successful"
      );
      this.message = !this.status
        ? "Data vending failed"
        : `Your data purchase was successful and you will credited shortly`;

      return this;
    } catch (error: any) {
      console.error(error.response.data);
      this.status = false;
      this.message =
        error instanceof Error && error.message
          ? error.message
          : "DATA_PURCHASE_FAILED: unable to process your request.";
      return this;
    }
  }

  public createRequestIdForVtuPass(suffix = "") {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);

    const dateParts: Record<string, any> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        dateParts[part.type] = part.value;
      }
    }
    const formattedDate =
      dateParts.year +
      dateParts.month +
      dateParts.day +
      dateParts.hour +
      dateParts.minute;

    const randomSuffix = suffix || Math.random().toString(36).substring(2, 14);
    const requestId = formattedDate + randomSuffix;

    return requestId;
  }

  public async buyDataFromVtuPass({
    ..._payload
  }: {
    phone: number | string;
    request_id?: string;
    serviceID: "airtel-data" | "glo-data" | "etisalat-data";
    variation_code: string;
  }) {
    try {
      const payload = {
        ..._payload,
        request_id: _payload.request_id || this.createRequestIdForVtuPass(),
        billersCode: _payload.phone,
      };

      console.log({ payload });

      const res = await vtuPassApi.post<VtuPassPayResponse>("/pay", payload);

      console.log(res);

      this.vendingResponse = {
        recipientCount: 1,
        recipients: String(_payload.phone),
        cost: Number(res.data?.amount),
        totalAmount: Number(res.data?.amount),
        vendReport: {
          [_payload.phone]: res.data.code === "000" ? "successful" : "failed",
        },
        vendStatus: null,
        commissionEarned: 0,
      };

      this.status = res.data.code === "000";
      this.message = !this.status
        ? res.data.response_description
        : `Your data purchase was successful and you will credited shortly`;

      return this;
    } catch (error: any) {
      console.log(error);
      this.status = false;
      this.message =
        error instanceof Error && error.message
          ? error.message
          : "DATA_PURCHASE_FAILED: unable to process your request.";
      return this;
    }
  }

  public async createPendingTransaction(
    type: transactionType,
    userId: string,
    options?: Record<string, any>
  ) {
    try {
      if (!this.session) {
        throw new Error("Session not started. Call startSession first.");
      }

      const meta = {
        ...options,
        status: "pending", // Mark as pending initially
      };

      const trxPayload: transaction = {
        amount: this.amount || 0,
        paymentMethod: "ownAccount",
        accountId: options?.customerPhone || "",
        status: "pending",
        tx_ref: options?.transactionRef || "",
        type,
        user: userId,
        meta,
      };

      const transaction = new Transaction(trxPayload);
      await transaction.save({ session: this.session });

      this.transaction = transaction;
      this.status = true;
      return this;
    } catch (error) {
      this.status = false;
      this.message =
        error instanceof Error
          ? error.message
          : "TRANSACTION_CREATION_FAILED: unable to create transaction.";
      return this;
    }
  }

  public async updateTransactionStatus(success: boolean, message: string) {
    try {
      if (!this.transaction) {
        throw new Error("No transaction to update");
      }

      const updateData = {
        status: success ? "success" : "failed",
        "meta.vendingResponse": this.vendingResponse,
        "meta.vendingSuccess": success,
        "meta.vendingMessage": message,
        "meta.completedAt": new Date(),
      };

      await Transaction.findByIdAndUpdate(this.transaction._id, {
        $set: updateData,
      });

      // Save the user contact to recently used contact only if successful
      if (success && this.transaction) {
        await addToRecentlyUsedContact(
          this.transaction.user,
          this.transaction.type,
          { ...this.transaction.meta, network: this.network }
        );
      }

      this.status = success;
      this.message = message;
      return this;
    } catch (error) {
      console.error("Error updating transaction status:", error);
      return this;
    }
  }

  public async createTransaction(
    type: transactionType,
    userId: string,
    options?: Record<string, any>
  ) {
    try {
      if (!this.session) {
        throw new Error("Session not started. Call startSession first.");
      }

      if (!this.status) return;

      const meta = {
        vendingResponse: {
          ...this.vendingResponse,
          commissionEarned: this.amount! * 0.02,
        },
        ...this.powerVendResponse,
        ...options,
        status: this.status ? "success" : "failed",
      };

      const trxPayload: transaction = {
        amount:
          this.amount ||
          this.vendingResponse?.totalAmount ||
          this.powerVendResponse?.cost ||
          0,
        paymentMethod: "ownAccount",
        accountId:
          this.vendingResponse?.recipients ||
          this.powerVendResponse?.recipients,
        status: this.status ? "success" : "failed",
        tx_ref: this.ref,
        type,
        user: userId,
        meta,
      };

      const transaction = new Transaction(trxPayload);
      await transaction.save({ session: this.session });

      // Save the user contact to recently used contact
      await addToRecentlyUsedContact(
        userId,
        trxPayload.type,
        { ...meta, network: this.network, reciepients: options?.phoneNumber },
        this.session
      );

      this.transaction = transaction;
      this.status = true;
      return this;
    } catch (error) {
      this.status = false;
      this.message =
        error instanceof Error
          ? error.message
          : "TRANSACTION_CREATION_FAILED: unable to create transaction.";
      return this;
    }
  }

  public async buyAirtimeFromVTPass(_payload: {
    phone: string;
    request_id: string;
    amount: number;
    network: availableNetworks;
  }) {
    try {
      const serviceID: Record<availableNetworks, string | availableNetworks> = {
        mtn: _payload.network,
        glo: _payload.network,
        airtel: _payload.network,
        "9mobile": "etisalat",
      };

      const payload = {
        ..._payload,
        serviceID: serviceID[_payload.network],
      };

      const res = await vtuPassApi.post<VtuPassPayResponse>("/pay", payload);

      this.vendingResponse = {
        recipientCount: 1,
        recipients: String(payload.phone),
        cost: Number(res.data?.amount),
        totalAmount: Number(res.data?.amount),
        vendReport: {
          [_payload.phone]: res.data.code === "000" ? "successful" : "failed",
        },
        vendStatus: null,
        commissionEarned: 0,
      };

      this.status = res.data.code === "000";
      this.message = !this.status
        ? "Airtime vending failed"
        : "Airtime purchase successful, you will be creditted soon";
    } catch (error) {
      console.log(error);

      this.status = false;

      this.message =
        "Oops, there was an error when trying to purchase an airtime for you";

      return this;
    }
  }
}

export class ReferralProcessor {
  private readonly userId: string;
  private readonly depositAmount: number;
  private readonly isEmailVerified: boolean;

  private referralRecord: IReferral | null = null;
  private isEligibleForReward = false;
  private result = {
    success: false,
    message: "",
  };

  constructor(userId: string, depositAmount: number, isEmailVerified: boolean) {
    this.userId = userId;
    this.depositAmount = depositAmount;
    this.isEmailVerified = isEmailVerified;
  }

  /**
   * Main method to process the entire referral flow
   */
  public async processReferral(): Promise<{
    success: boolean;
    message: string;
    processedAmount?: number;
  }> {
    try {
      await this.findReferralRecord();

      if (!this.referralRecord) {
        return {
          success: false,
          message: "User was not referred by anyone",
        };
      }

      await this.checkDepositEligibility();

      if (!this.isEligibleForReward) {
        return this.result;
      }

      return await this.creditReferrer();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        message: `Referral processing failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Find if the user was referred by someone
   */
  private async findReferralRecord(): Promise<void> {
    try {
      this.referralRecord = await Referral.findOne({
        referree: this.userId,
        rewardClaimed: false,
      });
    } catch (error) {
      throw new Error(
        `Failed to find referral record: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if this is one of the user's first deposits (eligible for referral bonus)
   */
  private async checkDepositEligibility(): Promise<void> {
    try {
      const MAX_ELIGIBLE_TRANSACTIONS = 2; // User's first and second transactions are eligible

      const depositCount = await Transaction.countDocuments({
        user: this.userId,
        type: "funding",
      });

      if (depositCount > MAX_ELIGIBLE_TRANSACTIONS) {
        this.result = {
          success: false,
          message:
            "User has exceeded the maximum eligible transactions for referral rewards",
        };
        this.isEligibleForReward = false;
        return;
      }

      this.isEligibleForReward = true;
    } catch (error) {
      throw new Error(
        `Failed to check deposit eligibility: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Credit the referrer with the reward amount
   */
  private async creditReferrer(): Promise<{
    success: boolean;
    message: string;
    processedAmount?: number;
  }> {
    try {
      if (
        !this.referralRecord ||
        !this.isEligibleForReward ||
        !this.isEmailVerified
      ) {
        return {
          success: false,
          message: "Not eligible for referral reward",
        };
      }

      // Find the referrer using the referral code
      const referrer = await User.findOne({
        refCode: this.referralRecord.referralCode,
      });

      if (!referrer) {
        return {
          success: false,
          message: "Referrer not found",
        };
      }

      // Calculate reward amount (1% of deposit)
      const REWARD_PERCENTAGE = 0.01;
      const rewardAmount = this.depositAmount * REWARD_PERCENTAGE;

      //Create a transaction record
      const trxPayload: transaction = {
        amount: rewardAmount,
        paymentMethod: "ownAccount",
        accountId: this.userId,
        status: "success",
        tx_ref: new mongoose.Types.ObjectId().toString(),
        type: "funding",
        user: this.referralRecord.referree,
        meta: {
          message: `Referral Bonus`,
        },
      };

      const transaction = new Transaction(trxPayload);

      await Promise.all([
        transaction.save(),
        User.updateOne(
          { _id: referrer._id },
          { $inc: { balance: rewardAmount } }
        ),
        Referral.updateOne(
          { _id: this.referralRecord._id },
          { rewardClaimed: true }
        ),
      ]);

      return {
        success: true,
        message: `Successfully credited referrer with reward`,
        processedAmount: rewardAmount,
      };
    } catch (error) {
      throw new Error(
        `Failed to credit referrer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

import { Types } from "mongoose";

interface RefundResult {
  success: boolean;
  message: string;
  transactionId?: string;
  refundAmount?: number;
}

interface RefundError extends Error {
  code?: string;
  statusCode?: number;
}

/**
 * Processes a refund for a user transaction
 * @param txRef - Transaction reference ID or MongoDB ObjectId
 * @returns Promise<RefundResult> - Result of the refund operation
 * @throws {RefundError} When refund cannot be processed
 */
export const refundUser = async (txRef: string): Promise<RefundResult> => {
  // Input validation
  if (!txRef || typeof txRef !== "string" || txRef.trim().length === 0) {
    const error: RefundError = new Error(
      "Transaction reference is required and must be a valid string"
    );
    error.code = "INVALID_INPUT";
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      // Find transaction by ID or reference
      const transaction = await Transaction.findOne({
        $or: [
          { _id: Types.ObjectId.isValid(txRef) ? txRef : null },
          { tx_ref: txRef },
        ],
        //status: "success",
      }).session(session);

      if (!transaction) {
        const error: RefundError = new Error(
          `Transaction not found with reference: ${txRef}`
        );
        error.code = "TRANSACTION_NOT_FOUND";
        error.statusCode = 404;
        throw error;
      }

      // Validate transaction status
      if (transaction.status === "refunded") {
        const error: RefundError = new Error(
          `Transaction with status: ${transaction.status} has already been refunded.`
        );
        error.code = "TRANSACTON_ALREADY_REFUNDED";
        error.statusCode = 422;
        throw error;
      }

      console.log(transaction);

      // Find associated user
      const user = await User.findById(transaction.user).session(session);

      if (!user) {
        const error: RefundError = new Error(
          `User not found with ID: ${transaction.user}`
        );
        error.code = "USER_NOT_FOUND";
        error.statusCode = 404;
        throw error;
      }

      // Validate refund amount
      if (!transaction.amount || transaction.amount <= 0) {
        const error: RefundError = new Error(
          "Invalid transaction amount for refund"
        );
        error.code = "INVALID_AMOUNT";
        error.statusCode = 422;
        throw error;
      }

      // Process refund - update user balance
      const previousBalance = user.balance;
      user.balance = (user.balance || 0) + transaction.amount;

      // Update transaction status
      transaction.status = "refunded";

      // Save both documents within transaction
      await Promise.all([
        user.save({ session }),
        transaction.save({ session }),
      ]);

      // Log successful refund
      console.log(
        `Refund processed successfully: Transaction ${transaction._id}, Amount: ${transaction.amount}, User: ${user._id}`
      );

      return {
        success: true,
        message: "Refund processed successfully",
        transactionId: transaction._id.toString(),
        refundAmount: transaction.amount,
      };
    });
  } catch (error) {
    console.log(error);
    // Log error for monitoring
    console.error("Refund processing failed:", {
      txRef,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Re-throw with proper error handling
    if (error instanceof Error && "code" in error) {
      throw error; // Re-throw custom errors
    }

    // Handle unexpected errors
    const unexpectedError: RefundError = new Error(
      "An unexpected error occurred during refund processing"
    );
    unexpectedError.code = "INTERNAL_ERROR";
    unexpectedError.statusCode = 500;
    throw unexpectedError;
  } finally {
    await session.endSession();
  }
};
