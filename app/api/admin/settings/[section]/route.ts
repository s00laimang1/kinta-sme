import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/connect-to-db";
import { App } from "@/models/app";

// GET handler to retrieve specific section settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  try {
    await connectToDatabase();

    const settings = await App.findOne({});

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    // Map section names to groups of settings
    const sectionMap: Record<string, string[]> = {
      transactions: [
        "stopAllTransactions",
        "stopSomeTransactions",
        "transactionLimit",
      ],
      accounts: [
        "stopAccountCreation",
        "bankAccountToCreateForUsers",
        "requireUserVerification",
        "defaultUserRole",
      ],
      system: [
        "maintenanceMode",
        "maintenanceMessage",
        "apiRateLimit",
        "logLevel",
      ],
      security: [
        "force2FA",
        "passwordPolicy",
        "sessionTimeout",
        "adminIpWhitelist",
      ],
    };

    if (!sectionMap[section]) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    // Extract only the settings for the requested section
    const sectionSettings = sectionMap[section].reduce((acc, key) => {
      acc[key] = settings[key as keyof typeof settings];
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json(sectionSettings, { status: 200 });
  } catch (error) {
    console.error(`Error fetching ${section} settings:`, error);
    return NextResponse.json(
      { error: `Failed to fetch ${section} settings` },
      { status: 500 }
    );
  }
}

// PATCH handler to update specific section settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  try {
    await connectToDatabase();

    const body = await request.json();

    // Map section names to groups of settings
    const sectionMap: Record<string, string[]> = {
      transactions: [
        "stopAllTransactions",
        "stopSomeTransactions",
        "transactionLimit",
      ],
      accounts: [
        "stopAccountCreation",
        "bankAccountToCreateForUsers",
        "requireUserVerification",
        "defaultUserRole",
      ],
      system: [
        "maintenanceMode",
        "maintenanceMessage",
        "apiRateLimit",
        "logLevel",
        "disabledPlans",
      ],
      security: [
        "force2FA",
        "passwordPolicy",
        "sessionTimeout",
        "adminIpWhitelist",
      ],
    };

    if (!sectionMap[section]) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    // Find settings or create default if none exists
    let settings = await App.findOne({});

    if (!settings) {
      settings = await App.create({});
    }

    // Only update fields that belong to the specified section
    Object.keys(body).forEach((key) => {
      if (sectionMap[section].includes(key)) {
        //   @ts-ignore
        settings[key as keyof typeof settings] = body[key];
      }
    });

    await settings.save();

    // Return only the updated section settings
    const updatedSectionSettings = sectionMap[section].reduce((acc, key) => {
      acc[key] = settings[key as keyof typeof settings];
      return acc;
    }, {} as Record<string, any>);

    console.log({ updatedSectionSettings, body });

    return NextResponse.json(updatedSectionSettings, { status: 200 });
  } catch (error) {
    console.error(`Error updating ${section} settings:`, error);
    return NextResponse.json(
      { error: `Failed to update ${section} settings` },
      { status: 500 }
    );
  }
}
