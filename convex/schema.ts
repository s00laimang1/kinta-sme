import { v } from "convex/values";
import { defineSchema, defineTable } from "convex/server";

export const transactionType = v.union(
  v.literal("data"),
  v.literal("airtime"),
  v.literal("electricity"),
  v.literal("cable"),
  v.literal("funding"),
  v.literal("refund"),
  v.literal("other"),
);

export const transactionStatus = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("failed"),
);

export const balanceChangeType = v.union(
  v.literal("credit"),
  v.literal("debit"),
);

export const networks = v.union(
  v.literal("mtn"),
  v.literal("airtel"),
  v.literal("glo"),
  v.literal("9mobile"),
);

export const users = v.object({
  balance: v.number(),
  email: v.string(),
  name: v.string(),
  phone: v.string(),
  role: v.union(v.literal("admin"), v.literal("user")),
  mongoDbUserId: v.string(),
});

export const transactionMetadata = v.optional(
  v.object({
    data: v.optional(
      v.object({
        id: v.string(),
        planName: v.string(),
        planDataAmount: v.number(),
        networks,
      }),
    ),
    balanceChange: v.object({
      previousBalance: v.number(),
      newBalance: v.number(),
      type: balanceChangeType,
    }),
    airtime: v.optional(
      v.object({
        airtimeType: v.literal("vtu"),
        networks,
        discountApplied: v.optional(v.number()),
      }),
    ),
  }),
);

export const transactions = v.object({
  userId: v.id("users"),
  amount: v.number(),
  type: transactionType,
  status: transactionStatus,
  reference: v.string(),
  externalReference: v.optional(v.string()),
  mongoDbUserId: v.string(),
  mongoDbTransactionId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  metadata: transactionMetadata,
});

export default defineSchema({
  users: defineTable(users)
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_mongoDbUserId", ["mongoDbUserId"]),
  transactions: defineTable(transactions),
});
