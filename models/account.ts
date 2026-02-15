import type { dedicatedAccountNumber } from "@/types";
import mongoose from "mongoose";

const AccountSchema: mongoose.Schema<dedicatedAccountNumber> =
  new mongoose.Schema(
    {
      accountDetails: {
        accountName: { type: String },
        accountNumber: {
          type: String,
          required: true,
          unique: true,
        },
        accountRef: { type: String, required: true, unique: true },
        bankName: { type: String },
        bankCode: { type: String },
        expirationDate: { type: String },
      },
      user: { type: String, ref: "user", index: true },
      hasDedicatedAccountNumber: { type: Boolean, default: false }, // Fixed type definition
      order_ref: { type: String, required: true },
    },
    { timestamps: true },
  );

// Hash BVN before saving
AccountSchema.pre("save", async function (next) {});

// Create virtual account after initial save
AccountSchema.post("save", async (doc, next) => {});

const Account: mongoose.Model<dedicatedAccountNumber> =
  mongoose?.models?.Account || mongoose?.model("Account", AccountSchema);

export { Account };
