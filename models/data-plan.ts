import { dataPlan } from "@/types";
import mongoose from "mongoose";

const DataPlanSchema: mongoose.Schema<dataPlan> = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  availability: {
    type: String,
    required: true,
  },
  data: {
    type: String,
    required: true,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  network: {
    type: String,
    enum: ["Mtn", "Airtel", "Glo", "9Mobile"],
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["CHEAP", "SME", "GIFTING"],
  },
  planId: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  provider: {
    type: String,
    required: true,
    enum: ["smePlug", "buyVTU"],
  },
  isDisabled: {
    type: Boolean,
    default: false,
  },
  removedFromList: {
    type: Boolean,
    default: false,
  },
  dataAmount: {
    type: Number,
    required: false,
  },
});

const DataPlan: mongoose.Model<dataPlan> =
  mongoose.models.DataPlan || mongoose.model("DataPlan", DataPlanSchema);

//DataPlanSchema.pre("save", async function (next) {
//  try {
//    const planExist = await DataPlan.exists({
//      amount: this.amount,
//      network: this.network,
//      provider: this.provider,
//      planId: this.planId,
//    });
//
//    if (planExist) {
//      next(new Error("Plan already exists"));
//    }
//  } catch (error) {
//    const err = error as Error;
//    next(err);
//  }
//});

export { DataPlan };
