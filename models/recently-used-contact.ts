import { recentlyUsedContact, transactionType } from "@/types";
import mongoose from "mongoose";

const RecentlyUsedContactSchema: mongoose.Schema<recentlyUsedContact> =
  new mongoose.Schema({
    meta: {
      type: mongoose?.SchemaTypes?.Mixed,
    },
    type: {
      type: String,
      enum: [
        "airtime",
        "bill",
        "data",
        "exam",
        "recharge-card",
      ] as transactionType[],
      required: true,
    },
    uid: {
      type: String,
      required: true,
    },
    lastUsed: {
      type: String,
    },
  });

const RecentlyUsedContact: mongoose.Model<recentlyUsedContact> =
  mongoose?.models?.RecentlyUsedContact ||
  mongoose?.model("RecentlyUsedContact", RecentlyUsedContactSchema);

const addToRecentlyUsedContact = async (
  uid: string,
  type: transactionType,
  meta: any,
  session?: any,
) => {
  try {
    const contactAlreadyExist = await RecentlyUsedContact.findOne({
      uid,
      type,
    }).session(session);
    const now = new Date();

    // Update the last use, if contact already exist;
    if (contactAlreadyExist) {
      contactAlreadyExist.lastUsed = now.toISOString();
      contactAlreadyExist.meta = meta;

      await contactAlreadyExist.save({ validateModifiedOnly: true, session });
      return contactAlreadyExist;
    }

    const contactPayload: recentlyUsedContact = {
      lastUsed: now.toISOString(),
      meta,
      type,
      uid,
    };

    const recentlyUsedContact = new RecentlyUsedContact(contactPayload);

    await recentlyUsedContact.save({ session });

    return recentlyUsedContact;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export { RecentlyUsedContact, addToRecentlyUsedContact };
