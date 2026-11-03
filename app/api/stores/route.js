import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Store from "../../../models/Store";

export async function GET() {
  await dbConnect();
  try {
    const stores = await Store.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: stores });
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
    const store = await Store.create(body);
    return NextResponse.json({ success: true, data: store }, { status: 201 });
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

    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Store ID is required to update" },
        { status: 400 },
      );
    }

    const store = await Store.findByIdAndUpdate(_id, updateData, { new: true });
    return NextResponse.json({ success: true, data: store });
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
    await Store.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
