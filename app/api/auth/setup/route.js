import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../models/User";

export async function GET() {
  await dbConnect();

  try {
    // Check karein agar admin pehle se hai
    const adminExists = await User.findOne({ email: "admin@sanskartech.com" });
    if (adminExists) {
      return NextResponse.json({
        message: "Admin account pehle se maujood hai!",
        email: "admin@sanskartech.com",
        password: "admin",
      });
    }

    // Naya SuperAdmin banayein
    const newAdmin = await User.create({
      name: "Super Admin",
      email: "admin@sanskartech.com",
      password: "admin", // Simple password for first login
      role: "SuperAdmin",
      isActive: true,
      assignedStores: [], // SuperAdmin can access everything or manage stores globally
    });

    return NextResponse.json({
      success: true,
      message: "Admin account successfully ban gaya!",
      email: newAdmin.email,
      password: newAdmin.password,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
