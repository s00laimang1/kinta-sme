// scripts/migrateToConvex.ts (separate file, not in /convex folder)
import { ConvexHttpClient } from "convex/browser";
import mongoose from "mongoose";
import { api } from "../convex/_generated/api";
import { User } from "@/models/users";

import { configDotenv } from "dotenv";

configDotenv({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function migrate() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_DB_URI!);

  const mongoUsers = await User.find({});
  console.log(`Found ${mongoUsers.length} users`);

  for (const mongoUser of mongoUsers) {
    const user = {
      balance: mongoUser.balance,
      email: mongoUser.auth.email,
      mongoDbUserId: mongoUser._id.toString(),
      name: mongoUser.fullName,
      phone: mongoUser.phoneNumber!,
      role: mongoUser.role,
    };

    const convexUserId = await client.mutation(api.users.createUser, user);
    console.log(`Migrated user: ${user.email} -> ${convexUserId}`);
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
}

migrate();
