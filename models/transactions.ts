import type { transaction } from "@/types";
import mongoose from "mongoose";
import { Resend } from "resend";
import { User } from "./users";
import { configs } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

const TransactionSchema: mongoose.Schema<transaction> = new mongoose.Schema(
  {
    amount: {
      type: Number, // Changed from String to Number to match the actual data type
      required: true,
      min: 0,
      validate: {
        validator(amount: number) {
          return !isNaN(amount);
        },
        message: "Amount must be a number",
      },
    },
    note: {
      type: String,
      maxlength: 256,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["virtualAccount", "dedicatedAccount", "ownAccount"],
      default: "virtualAccount",
    },
    tx_ref: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["funding", "airtime", "bill", "data", "exam", "recharge-card"],
      default: "funding",
    },
    user: {
      type: String,
      required: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // Added timestamps for better tracking
  },
);

TransactionSchema.post("save", async function (doc) {
  if (doc.isNew) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Populate the user field to get user details
      const transaction = doc;

      // Get the user from the populated transaction
      const user = await User.findById(transaction.user);

      if (!user || !user.auth || !user.auth.email) {
        console.log("MISSING_USER_EMAIL: Cannot send email notification");
        return;
      }

      // Format the date
      const formattedDate = new Date(transaction.createdAt!).toLocaleString(
        "en-NG",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      );

      // Create HTML email content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Transaction Successful</h2>
          <p style="color: #555;">Hello ${
            user.fullName || "Valued Customer"
          },</p>
          <p style="color: #555;">A new transaction has taken place on your account.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Amount:</strong> ${formatCurrency(
              doc.amount,
            )}</p>
            <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${
              transaction._id
            }</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: green; font-weight: bold;">Successful</span></p>
            <p style="margin: 5px 0;"><strong>Type:</strong> ${
              transaction.type || "Funding"
            }</p>
          </div>
          
          <p style="color: #555;">Thank you for choosing ${configs.appName}.</p>
          <p style="color: #555;">If you did not initiate this transaction, please contact our support team immediately.</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #888; font-size: 12px;">© ${new Date().getFullYear()} ${
              configs.appName
            }. All rights reserved.</p>
          </div>
        </div>
      `;

      // Send the email
      const { data, error } = await resend.emails.send({
        from: `${configs.appName} <noreply@${"yourdomain.com"}>`,
        to: user.auth.email,
        subject: "NEW TRANSACTION ON YOUR ACCOUNT",
        html: htmlContent,
      });

      if (error) {
        console.log("EMAIL_SEND_ERROR: ", error);
      } else {
        console.log("FUNDING_EMAIL_SENT: ", data);
      }
    } catch (error) {
      console.log("FAIL_TO_SEND_EMAIL: ", error);
    }
  }
});

const Transaction: mongoose.Model<transaction> =
  mongoose?.models?.Transaction ||
  mongoose?.model<transaction>("Transaction", TransactionSchema);

export { Transaction };
