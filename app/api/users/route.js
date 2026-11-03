import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import User from "../../../models/User";
import Store from "../../../models/Store"; // zaroori hai populate karne ke liye

export async function GET() {
  await dbConnect();
  try {
    const users = await User.find({})
      .populate("assignedStores", "name")
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json();
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already in use!" },
        { status: 400 },
      );
    }
    const user = await User.create(body);
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function PUT(req) {
  await dbConnect();
  try {
    const body = await req.json();
    const { _id, ...updateData } = body;

    // Agar frontend se password field empty aati hai (yani user password change nahi karna chahta)
    // To password property nikal dein taaki purana password wahi rahe
    if (updateData.password === "" || !updateData.password) {
      delete updateData.password;
    }

    const existingEmail = await User.findOne({
      email: updateData.email,
      _id: { $ne: _id },
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "Email is already taken by another user." },
        { status: 400 },
      );
    }

    const user = await User.findByIdAndUpdate(_id, updateData, { new: true });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function DELETE(req) {
  await dbConnect();
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    // Safety check: SuperAdmin ko galti se delete na kar de
    const user = await User.findById(id);
    if (user && user.role === "SuperAdmin") {
      return NextResponse.json(
        { success: false, error: "SuperAdmin cannot be deleted!" },
        { status: 403 },
      );
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
