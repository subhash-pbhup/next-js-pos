import { NextResponse } from "next/server";
// @/ ki jagah relative path use kiya gaya hai taaki module not found error fix ho sake
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../models/User";
import Store from "../../../../models/Store";

export async function POST(req) {
  await dbConnect();

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email aur Password zaroori hai!" },
        { status: 400 },
      );
    }

    // 1. User Find Karein aur Assigned Stores ko populate karein
    const user = await User.findOne({ email, isActive: true }).populate(
      "assignedStores",
      "name _id",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Is email se koi active account nahi mila!" },
        { status: 404 },
      );
    }

    // 2. Password Match Check
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, error: "Galat password!" },
        { status: 401 },
      );
    }

    // 3. User Details Formatting (Password hata kar)
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // SuperAdmin, Admin, Cashier
      assignedStores: user.assignedStores || [],
    };

    // 4. Return Success Response
    return NextResponse.json({
      success: true,
      message: "Login Successful!",
      data: safeUser,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
