import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { User } from "../models/users";
import { users } from "./schema";
import { api } from "./_generated/api";

export const createUser = mutation({
  args: users,
  handler: async (ctx, args) => {
    return ctx.db.insert("users", {
      ...args,
      mongoDbUserId: args.mongoDbUserId,
    });
  },
});

export const findUser = query({
  args: {
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    mongoDbUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email, phoneNumber, mongoDbUserId } = args;

    if (!(email || phoneNumber || mongoDbUserId)) {
      throw new Error("Please provide an email, phone number or mongoDbUserId");
    }

    let user: typeof users.type | null = null;

    if (email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (phoneNumber) {
      user = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", phoneNumber))
        .first();
    }

    if (mongoDbUserId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_mongoDbUserId", (q) =>
          q.eq("mongoDbUserId", mongoDbUserId),
        )
        .first();
    }

    return user;
  },
});

export const migrateUsers = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { limit = 800 } = args;

    console.log("Fetching All Existing Users...");

    const mongoUsers = await User.find({});

    console.log(`Found ${mongoUsers.length} users`);

    for (const mongoUser of mongoUsers) {
      console.log(
        "Trying to create user with email and id",
        mongoUser.auth.email,
        mongoUser._id,
      );

      const user: typeof users.type = {
        balance: mongoUser.balance,
        email: mongoUser.auth.email,
        mongoDbUserId: mongoUser._id,
        name: mongoUser.fullName,
        phone: mongoUser.phoneNumber!,
        role: mongoUser.role as unknown as (typeof users.type)["role"],
      };

      const convexUserId = await ctx.runMutation(api.users.createUser, user);

      console.log("User created with the convexId of ", convexUserId);
    }

    console.log("All users created successfully");
  },
});

export const updateUser = mutation({
  args: {},
  handler: async (ctx, args) => {},
});
