import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Coupon from "../../../models/Coupon";

export async function GET() {
  await dbConnect();
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: coupons });
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
    const coupon = await Coupon.create(body);
    return NextResponse.json({ success: true, data: coupon }, { status: 201 });
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
    const coupon = await Coupon.findByIdAndUpdate(_id, updateData, {
      new: true,
    });
    return NextResponse.json({ success: true, data: coupon });
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
    await Coupon.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
