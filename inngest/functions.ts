import { DataPlan } from "@/models/data-plan";
import { Transaction } from "@/models/transactions";
import { inngest } from "./client";
import { BuyVTU, refundUser, sendNotification } from "@/lib/server-utils";
import { dataPlan, IBuyVtuNetworks } from "@/types";

export const purchaseData = inngest.createFunction(
  {
    id: "purchase-data",
  },
  {
    event: "kinta-sme/purchase.data",
  },
  async ({ event, step }) => {
    const { data } = event;
    const { phoneNumber, planId, userEmail, transactionId } = data;

    const buyVtu = new BuyVTU();

    const plan = (await step.run("get-plan", async () => {
      const plan = await DataPlan.findById(planId);

      if (!plan) {
        //Refund the user and throw an error
        const { success } = await refundUser(transactionId);

        if (!success) {
          throw new Error("Failed to refund user");
        }
      }

      return plan;
    })) as unknown as dataPlan;

    //Purchase data from provider
    const { vendingSuccess, vendingMessage } = await step.run(
      "purchase-data",
      async () => {
        let success = false;
        let message = "";

        try {
          if (
            plan.network.toLowerCase() === "mtn" ||
            plan.network.toLowerCase() === "airtel"
          ) {
            // Use abanty data sme
            const n: Record<string, any> = {
              mtn: "1",
              airtel: "2",
              "9mobile": "3",
              glo: "4",
            };

            await buyVtu.buyDataFromSMEPLUG(
              n[plan.network.toLowerCase()],
              plan.planId as number,
              phoneNumber,
              plan.amount,
              transactionId,
            );
          } else {
            const networdId: Record<IBuyVtuNetworks, string> = {
              Mtn: "1",
              Airtel: "airtel-data",
              Glo: plan.type === "SME" ? "glo-sme-data" : "glo-data",
              "9Mobile": "etisalat-data",
            };

            await buyVtu.buyDataFromVtuPass({
              phone: phoneNumber,
              request_id: transactionId,
              serviceID: networdId[plan?.network!] as "airtel-data",
              variation_code: plan?.planId as string,
            });
          }

          success = buyVtu.status;
          message = buyVtu.message || "";
        } catch (vendingError) {
          success = false;
          message =
            vendingError instanceof Error
              ? vendingError.message
              : "Vending failed";
        }

        console.log({ transactionId });

        // Update transaction status based on vending result
        await Transaction.updateOne(
          {
            $or: [{ tx_ref: transactionId }],
          },
          {
            $set: {
              status: success ? "success" : "failed",
              "meta.vendingResponse": buyVtu.vendingResponse,
              "meta.vendingSuccess": success,
              "meta.vendingMessage": message,
              "meta.completedAt": new Date(),
            },
          },
        );

        return { vendingSuccess: success, vendingMessage: message };
      },
    );

    //If transaction failed please refund the user
    await step.run("refund-user", async () => {
      console.log(vendingSuccess);

      if (!vendingSuccess) {
        const { success } = await refundUser(transactionId);

        if (!success) {
          throw new Error("Failed to refund user");
        }
      }
    });

    //if transaction is successful or unsuccessful, please notify the user
    await step.run("notify-user", async () => {
      await sendNotification(
        userEmail,
        vendingSuccess ? "Data Purchase Successful" : "Data Purchase Failed",
        vendingMessage,
        {
          planName: plan.data,
          amount: plan.amount,
          network: plan.network,
          phoneNumber,
          transactionId,
          vendingSuccess,
          vendingMessage,
        },
      );
    });
  },
);
