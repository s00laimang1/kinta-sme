import { connectToDatabase } from "@/lib/connect-to-db";
import { httpStatusResponse } from "@/lib/utils";
import { signUpSchema } from "@/lib/validator.schema";
import { App } from "@/models/app";
import { Referral } from "@/models/referral";
import { User } from "@/models/users";
import { NextResponse } from "next/server";
import { Client as QClient } from "@upstash/qstash";
import { configs } from "@/lib/constants";

/**
 * This is a public function use to create an account with this platform
 * @param request
 * @returns This will return either a success or an error
 */

const AllQStashKeys = [
  process.env["QSTASHKEY7"],
  process.env["QSTASHKEY8"],
  process.env["QSTASHKEY9"],
  process.env["QSTASHKEY1"],
  process.env["QSTASHKEY2"],
  process.env["QSTASHKEY3"],
  process.env["QSTASHKEY4"],
  process.env["QSTASHKEY5"],
  process.env["QSTASHKEY6"],
  process.env["QSTASH_TOKEN"],
];

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const validatedData = signUpSchema.safeParse(requestBody); //Safely parsing the request body to match what i expect

    if (!validatedData.success) {
      return NextResponse.json(
        httpStatusResponse(400, validatedData.error.message),
        { status: 400 }
      );
    }

    const { fullName, email, password, phoneNumber, country, ref } =
      validatedData.data;

    // Validate input
    if (!(fullName && email && password && phoneNumber)) {
      return NextResponse.json(
        { message: "MISSING_REQUIRED_FIELDS: Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const app = await App.findOne();

    await app?.isAccountCreationStopped();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ "auth.email": email }, { phoneNumber }],
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message:
            "USER_ALREADY_EXISTED: Looks like you already have an account, Please signIn",
        },
        { status: 409 }
      );
    }

    let role = "user";

    if (app && app?.defaultUserRole === "admin") {
      role = "admin";
    } else {
      role = "user";
    }

    // Create user
    const user = await User.create([
      {
        phoneNumber,
        fullName,
        country,
        auth: {
          email,
          password,
        },
        isEmailVerified: false,
        isPhoneVerified: false,
        role,
        refCode: phoneNumber,
      },
    ]);

    try {
      if (ref) {
        const u = await User.findOne({ refCode: ref });

        if (!u) return;

        await Referral.create([
          {
            referralCode: ref, //Referral code from the referrer
            user: u?._id.toString(), //Referrer userId
            referree: user[0]._id.toString(), //userid of the referree
          },
        ]);
      }
    } catch (error) {
      console.log(error);
    }

    let retry = 0;

    while (retry < AllQStashKeys.length) {
      try {
        const qStashKey = AllQStashKeys[retry];

        const qClient = new QClient({ token: qStashKey || "" });
        await qClient.publishJSON({
          url: "https://miscellaneous-kinta.vercel.app/api/generate-dedicated-account-number",
          body: {
            userId: user[0]._id.toString(),
            signature:
              configs["X-RAPIDAPI-KEY"] ||
              "2628430868msha458838465f332fp14cf7djsn7696ae8601c9",
          },
          retries: 3,
        });

        break;
      } catch (error) {
        retry++;
      }
    }

    // Return success without exposing password
    return NextResponse.json(
      httpStatusResponse(201, "User created successfully", {
        user: {
          id: user[0]._id.toString(),
          fullName: user[0].fullName,
          email: user[0].auth.email,
          phoneNumber: user[0].phoneNumber,
          country: user[0].country,
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      httpStatusResponse(
        500,
        (error as Error).message || "An error occurred during registration"
      ),
      { status: 500 }
    );
  }
}
