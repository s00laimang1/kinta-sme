import mongoose from "mongoose";
import type {
  appProps,
  availableBanks,
  buyVtuResponse,
  transactionType,
} from "@/types";
import { buyVtuApi } from "@/lib/utils";

const BuyVtuSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    default: "",
  },
  expiredAt: {
    type: String,
    default: "",
  },
  url: {
    type: String,
    default: "",
  },
});

const AppSchema: mongoose.Schema<appProps> = new mongoose.Schema({
  stopAllTransactions: {
    type: Boolean,
    default: false,
  },
  stopSomeTransactions: {
    type: [String],
    enum: ["funding", "airtime", "data", "bill", "recharge-card", "exam"],
    default: [],
  },
  stopAccountCreation: {
    type: Boolean,
    default: false,
  },
  bankAccountToCreateForUsers: {
    type: String,
    enum: ["9PSB", "BANKLY", "PALMPAY", "PROVIDUS", "SAFEHAVEN", "random"] as (
      | availableBanks
      | "random"
    )[],
    default: "random",
  },
  transactionLimit: {
    type: Number,
    default: 10000,
  },
  requireUserVerification: {
    type: Boolean,
    default: true,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  defaultUserRole: {
    type: String,
    enum: ["user", "customer", "client", "guest"],
    default: "user",
  },
  apiRateLimit: {
    type: Number,
    default: 60,
  },
  logLevel: {
    type: String,
    enum: ["error", "warn", "info", "debug", "trace"],
    default: "info",
  },
  force2FA: {
    type: Boolean,
    default: false,
  },
  passwordPolicy: {
    type: String,
    enum: ["basic", "medium", "strong", "very-strong"],
    default: "strong",
  },
  sessionTimeout: {
    type: Number,
    default: 30,
  },
  adminIpWhitelist: {
    type: [String],
    default: [],
  },
  systemMessage: {
    type: String,
    default: "",
  },
  buyVtu: {
    type: BuyVtuSchema,
    select: false,
  },
  disabledPlans: {
    type: [String],
    default: [],
  },
});

AppSchema.methods.isTransactionEnable = async function (
  transactionType?: transactionType
) {
  if (this?.stopAllTransactions) {
    throw new Error(
      "ALL_TRANSACTIONS_DISABLE: All transactions has been disable, please contact the admin"
    );
  }

  if (transactionType) {
    const transactionsToStop = this?.stopSomeTransactions || [];

    if (transactionsToStop.includes(transactionType)) {
      throw new Error(
        `${transactionType.toUpperCase()}_TRANSACTION_HAS_BEEN_STOPPED: this transaction has stopped, please contact the admin.`
      );
    }
  }
};

AppSchema.methods.checkTransactionLimit = async function (amount: number) {
  if (isNaN(Number(amount))) {
    throw new Error("Invalid amount");
  }

  if (amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  if (!this?.transactionLimit) return;

  if (amount >= Number(this.transactionLimit)) {
    throw new Error(
      "TRANSACTION_LIMIT_EXCEEDED: this transaction limit has been exceeded."
    );
  }
};

AppSchema.methods.systemIsunderMaintainance = async function () {
  if (this?.maintenanceMode) {
    throw new Error(
      "SYSTEM_IS_UNDER_MAINTENANCE: All transactions may be paused or delayed for maintenance."
    );
  }
};

AppSchema.methods.isAccountCreationStopped = async function () {
  if (this?.stopAccountCreation) {
    throw new Error(
      "ACCOUNT_CREATION_TEMPORARILY_STOPPED: please contact the admin"
    );
  }
};

AppSchema.methods.refreshAccessToken = async function () {
  const app = await App.findOne({}).select("+buyVtu");

  if (!app) return;

  const buyVtu = this.buyVtu as appProps["buyVtu"];

  const now = new Date();
  const expiredAt = new Date(buyVtu?.["expiredAt"] || now.toISOString());

  if (!buyVtu?.["expiredAt"] || expiredAt < now) {
    const phone_no = process.env.BUY_VTU_PHONE_NUMBER;
    const password = process.env.BUY_VTU_PASSWORD;

    try {
      //Refresh the accessToken
      const response = await buyVtuApi.post<
        buyVtuResponse<{ token: string; success: boolean }>
      >("/login", {
        phone_no,
        password,
      });

      now.setDate(now.getDate() + 25);

      await App.findByIdAndUpdate(this._id, {
        $set: {
          "buyVtu.accessToken": response?.data?.data?.token,
          "buyVtu.expiredAt": now.toISOString(),
        },
      });

      return response.data.data.token;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  return buyVtu?.accessToken;
};

AppSchema.methods.addOrRemoveDisablePlans = async function (plan: string) {
  const [network, planType] = plan.split("-");

  if (this.disabledPlans.includes(plan)) {
    this.disabledPlans = this.disabledPlans.filter((p: string) => p !== plan);
  } else {
    this.disabledPlans.push(plan);
  }

  await App.findByIdAndUpdate(this._id, {
    $set: {
      disabledPlans: this.disabledPlans,
    },
  });
};

const App: mongoose.Model<appProps> =
  mongoose.models.App || mongoose.model<appProps>("App", AppSchema);

const accountRequiresVerificationBeforeVirtualAccountActivation = async () => {
  const app = await App.findOne({});

  return app?.requireUserVerification;
};

const systemPasswordPolicy = async (password: string) => {
  const app = await App.findOne({});

  if (!password) {
    throw new Error("Password is required");
  }

  switch (app?.passwordPolicy) {
    case "basic":
      // Basic: Minimum 6 characters
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }
      break;

    case "medium":
      // Medium: Minimum 8 characters, at least 1 letter and 1 number
      if (
        password.length < 8 ||
        !/\d/.test(password) ||
        !/[a-zA-Z]/.test(password)
      ) {
        throw new Error(
          "Password must be at least 8 characters long and include at least one letter and one number"
        );
      }
      break;

    case "strong":
      // Strong: Minimum 10 characters, at least 1 uppercase letter, 1 lowercase letter, and 1 number
      if (
        password.length < 10 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/\d/.test(password)
      ) {
        throw new Error(
          "Password must be at least 10 characters long and include an uppercase letter, a lowercase letter, and a number"
        );
      }
      break;

    case "very-strong":
      // Very-Strong: Minimum 12 characters, must include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character
      if (
        password.length < 12 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/\d/.test(password) ||
        !/[!@#$%^&*(),.?":{}|<>]/.test(password)
      ) {
        throw new Error(
          "Password must be at least 12 characters long and include an uppercase letter, a lowercase letter, a number, and a special character"
        );
      }
      break;

    default:
      throw new Error("Invalid password policy");
  }

  return app?.passwordPolicy;
};

export {
  App,
  accountRequiresVerificationBeforeVirtualAccountActivation,
  systemPasswordPolicy,
};
