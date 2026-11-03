import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Customer from "../../../models/Customer";

export async function GET() {
  await dbConnect();
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json();

    // Check if phone already exists
    const existingPhone = await Customer.findOne({ phone: body.phone });
    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: "This phone number is already registered!" },
        { status: 400 },
      );
    }

    // Check if email already exists (agar email diya gaya hai tabhi)
    if (body.email) {
      const existingEmail = await Customer.findOne({ email: body.email });
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: "This email address is already registered!",
          },
          { status: 400 },
        );
      }
    }

    const customer = await Customer.create(body);
    return NextResponse.json(
      { success: true, data: customer },
      { status: 201 },
    );
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
    const { _id, phone, email, ...updateData } = await req.json();

    // Check duplicate phone for other users
    const duplicatePhone = await Customer.findOne({ phone, _id: { $ne: _id } });
    if (duplicatePhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number already belongs to another customer!",
        },
        { status: 400 },
      );
    }

    // Check duplicate email for other users (agar email diya ho)
    if (email) {
      const duplicateEmail = await Customer.findOne({
        email,
        _id: { $ne: _id },
      });
      if (duplicateEmail) {
        return NextResponse.json(
          {
            success: false,
            error: "Email address already belongs to another customer!",
          },
          { status: 400 },
        );
      }
    }

    const customer = await Customer.findByIdAndUpdate(
      _id,
      { phone, email, ...updateData },
      { new: true },
    );
    return NextResponse.json({ success: true, data: customer });
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
    await Customer.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
