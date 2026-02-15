import { IUser } from "@/types";
import mongoose from "mongoose";
import { systemPasswordPolicy } from "./app";
import bcrypt from "bcryptjs";

const UserSchema: mongoose.Schema<IUser> = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please provide a name"],
    },
    auth: {
      email: {
        type: String,
        required: [true, "Please provide an email"],
        unique: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          "Please provide a valid email",
        ],
        trim: true,
      },
      password: {
        type: String,
        required: [true, "Please provide a password"],
        minlength: 6,
        select: false,
      },
      transactionPin: {
        type: String,
        select: false,
        min: [4, "Transaction pin must be at least 4 characters"],
        max: [4, "Transaction pin must be at most 4 characters"],
      },
    },
    phoneNumber: {
      type: String,
      required: [true, "Please provide a phone number"],
      unique: true,
      trim: true,
    },
    country: {
      type: String,
      enum: ["nigeria"],
      lowercase: true,
      default: "nigeria",
    },
    balance: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    hasSetPin: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    refCode: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function (next) {
  this.isEmailVerified = !this.isModified("auth.email");
  this.isPhoneVerified = !this.isModified("phoneNumber");

  // This will run when the transactionPin is available and modified
  if (this.auth.transactionPin && this.isModified("auth.transactionPin")) {
    const rawPin = this.auth.transactionPin;

    // Validate PIN before hashing
    if (rawPin.length !== 4) {
      return next(new Error("PIN must be 4 digits"));
    }

    if (!/^\d{4}$/.test(rawPin)) {
      return next(new Error("PIN must contain only digits"));
    }

    if (/^(.)\1{3}$/.test(rawPin)) {
      return next(new Error("PIN cannot be all the same digits"));
    }

    if (/^(0123|1234|2345|3456|4567|5678|6789|7890)$/.test(rawPin)) {
      return next(new Error("PIN cannot be sequential digits"));
    }

    const SALT = await bcrypt.genSalt(10);
    this.auth.transactionPin = await bcrypt.hash(rawPin, SALT);

    this.hasSetPin = true;
  }

  // This will only run if this is the first time the user is creating their account.
  //if (this.isNew) {
  //  // Check if user does not need to verify their account before assigning an account to them
  //  if (!(await accountRequiresVerificationBeforeVirtualAccountActivation())) {
  //    await processVirtualAccountForUser(this);
  //  }
  //}

  // Hash password if modified
  if (this.isModified("auth.password")) {
    await systemPasswordPolicy(this.auth.password); // Check password policy

    // Hash password
    const salt = await bcrypt.genSalt(10);
    this.auth.password = await bcrypt.hash(this.auth.password, salt);
  }

  //if (!this.hasSetPin) {
  //  this.auth.transactionPin = "";
  //}

  //  const verificationRequired =
  //    await accountRequiresVerificationBeforeVirtualAccountActivation();
  //
  //  if (this.isEmailVerified && verificationRequired) {
  //    const userHasVirtualAccount = await Account.findOne({
  //      hasDedicatedAccountNumber: true,
  //      user: this._id,
  //    });
  //
  //    if (userHasVirtualAccount) return next();
  //
  //    await processVirtualAccountForUser(this);
  //  }

  next();
});

UserSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any;

  // Only proceed if there are updates
  if (!update) return next();

  // Handle email and phone verification flags
  if (update?.$set?.["auth.email"]) {
    update.isEmailVerified = false;
  }

  if (update?.$set?.phoneNumber) {
    update.isPhoneVerified = false;
  }

  //  // Handle transaction PIN updates
  if (update?.$set?.["auth.transactionPin"]) {
    const rawPin = update?.$set?.["auth.transactionPin"];

    // Validate PIN before hashing
    if (rawPin.length !== 4) {
      throw new Error("PIN must be 4 digits");
    }

    //This check to see that the transaction pin should only be a digit
    if (!/^\d{4}$/.test(rawPin)) {
      throw new Error("PIN must contain only digits");
    }

    //This checks so the transaction pin is not the same
    if (/^(.)\1{3}$/.test(rawPin)) {
      throw new Error("PIN cannot be all the same digits");
    }

    //Making sure the transaction pin is not sequencial
    if (/^(0123|1234|2345|3456|4567|5678|6789|7890)$/.test(rawPin)) {
      throw new Error("PIN cannot be sequential digits");
    }

    // Hash the PIN
    const salt = await bcrypt.genSalt(10);
    update["auth.transactionPin"] = await bcrypt.hash(rawPin, salt);

    // Set hasSetPin flag
    update.hasSetPin = true;
  }

  // Handle password updates
  if (update?.$set?.["auth.password"] !== undefined) {
    // Check password policy
    await systemPasswordPolicy(update["auth.password"]);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    update["auth.password"] = await bcrypt.hash(update["auth.password"], salt);
  }

  // Handle PIN reset
  if (!update?.$set.hasSetPin) {
    update["auth.transactionPin"] = "";
  }

  // For handling virtual account creation, we need to get the document first
  // since we need the _id and other fields
  //  if (update["isEmailVerified"]) {
  //    // Get the document that's being updated
  //    const docToUpdate = await this.model.findOne(this.getQuery());
  //
  //    if (docToUpdate) {
  //      const verificationRequired =
  //        await accountRequiresVerificationBeforeVirtualAccountActivation();
  //
  //      if (verificationRequired) {
  //        const userHasVirtualAccount = await Account.findOne({
  //          hasDedicatedAccountNumber: true,
  //          user: docToUpdate._id,
  //        });
  //
  //        if (!userHasVirtualAccount) {
  //          await processVirtualAccountForUser(docToUpdate);
  //        }
  //      }
  //    }
  //  }
});

UserSchema.methods.verifyTransactionPin = async function (pin: string) {
  if (!this.auth.transactionPin) {
    throw new Error(
      "TRANSACTION_PIN_NOT_SET: please contact the admin if you think this is an error.",
    );
  }

  const isTransactionPinMatching = await bcrypt.compare(
    pin,
    this.auth.transactionPin,
  );
  if (!isTransactionPinMatching) {
    throw new Error(
      "INCORRECT_TRANSACTION_PIN: please contact the admin if you think this is an error.",
    );
  }
};

UserSchema.methods.verifyUserBalance = async function (amount: number) {
  if (isNaN(amount) || typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid amount");
  }

  // Check if the user has sufficient balance
  if (amount > this.balance) {
    throw new Error("Insufficient balance");
  }
};

const User: mongoose.Model<IUser> =
  mongoose?.models?.User || mongoose?.model("User", UserSchema);

const findUser = async (
  id: string,
  options = { includePassword: false, throwOn404: false },
) => {
  const u = await User.findById(id).select(
    options.includePassword ? "+auth.password" : "",
  );

  if (options.throwOn404 && !u) throw new Error("User not found");

  return u;
};

const findUserByEmail = async (
  email: string,
  options = { includePassword: false, throwOn404: false },
) => {
  const u = await User.findOne({ "auth.email": email }).select(
    options.includePassword ? "+auth.password" : "",
  );

  if (options.throwOn404 && !u) throw new Error("User not found");

  return u;
};

export { User, findUser, findUserByEmail };
