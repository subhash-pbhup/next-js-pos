import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await dbConnect();

    const adminExists = await User.findOne({
      email: "admin@sanskartech.com",
    });

    if (adminExists) {
      return NextResponse.json({
        success: true,
        message: "Admin account pehle se maujood hai!",
      });
    }

    const newAdmin = await User.create({
      name: "Super Admin",
      email: "admin@sanskartech.com",
      password: "admin",
      role: "SuperAdmin",
      isActive: true,
      assignedStores: [],
    });

    return NextResponse.json({
      success: true,
      message: "Admin account successfully ban gaya!",
      email: newAdmin.email,
    });
  } catch (error) {
    console.error("Setup API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Admin setup failed",
      },
      { status: 500 },
    );
  }
}
