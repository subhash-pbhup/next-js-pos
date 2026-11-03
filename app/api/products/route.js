import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Product from "../../../models/Product";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const uploadDir = path.join(process.cwd(), "public/uploads/products");

// File Save Helper
async function saveUploadedFile(file) {
  if (!file || typeof file !== "object" || file.size === 0) return "";
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${file.name.replaceAll(" ", "_")}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/products/${filename}`;
}

export async function GET(req) {
  await dbConnect();
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");

    let query = {
      $or: [{ deleted: false }, { deleted: { $exists: false } }],
    };

    if (storeId && storeId !== "undefined" && storeId !== "null") {
      query.storeId = storeId;
    }

    const products = await Product.find(query).sort({
      createdAt: -1,
    });
    return NextResponse.json({ success: true, data: products });
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
    const data = await req.formData();
    const barcode = data.get("barcode");
    const name = data.get("name");
    const category = data.get("category");
    const subcategory = data.get("subcategory") || "";
    const price = Number(data.get("price")) || 0;
    const costPrice = Number(data.get("costPrice")) || 0;
    const unit = data.get("unit") ? String(data.get("unit")) : "Pcs";
    const gst = Number(data.get("gst")) || 0;
    const stock = Number(data.get("stock")) || 0;

    const hasVariants = data.get("hasVariants") === "true";
    const hasWarranty = data.get("hasWarranty") === "true";
    const warrantyMonths = Number(data.get("warrantyMonths")) || 0;

    // Fixed: Captured missing fields
    const storeId = data.get("storeId");
    const batchNumber = data.get("batchNumber") || "";
    const expiryDate = data.get("expiryDate") || "";

    let rawVariants = [];
    try {
      rawVariants = JSON.parse(data.get("variants") || "[]");
    } catch {
      rawVariants = [];
    }

    const existing = await Product.findOne({ barcode, deleted: false });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Barcode already exists!" },
        { status: 400 },
      );
    }

    const mainImageUrl = await saveUploadedFile(data.get("image"));

    // Process Variant Images
    const variants = [];
    for (let i = 0; i < rawVariants.length; i++) {
      const v = rawVariants[i];
      const variantFile = data.get(`variant_image_${i}`);
      let vImgUrl = v.image || "";
      if (
        variantFile &&
        typeof variantFile === "object" &&
        variantFile.size > 0
      ) {
        vImgUrl = await saveUploadedFile(variantFile);
      }
      variants.push({
        sku: String(v.sku || ""),
        color: String(v.color || ""),
        size: String(v.size || ""),
        price: Number(v.price) || 0,
        costPrice: Number(v.costPrice) || 0,
        stock: Number(v.stock) || 0,
        image: vImgUrl,
      });
    }

    const productData = {
      barcode,
      name,
      category,
      subcategory,
      price,
      costPrice,
      unit,
      gst,
      stock,
      image: mainImageUrl,
      hasVariants,
      variants: hasVariants ? variants : [],
      hasWarranty,
      warrantyMonths,
      batchNumber,
      expiryDate,
      storeId: storeId && storeId !== "null" ? storeId : undefined,
    };

    const product = await Product.create(productData);

    return NextResponse.json({ success: true, data: product }, { status: 201 });
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
    const data = await req.formData();
    const _id = data.get("_id");
    const barcode = data.get("barcode");
    const name = data.get("name");
    const category = data.get("category");
    const subcategory = data.get("subcategory") || "";
    const price = Number(data.get("price")) || 0;
    const costPrice = Number(data.get("costPrice")) || 0;
    const unit = data.get("unit") ? String(data.get("unit")) : "Pcs";
    const gst = Number(data.get("gst")) || 0;
    const stock = Number(data.get("stock")) || 0;

    const hasVariants = data.get("hasVariants") === "true";
    const hasWarranty = data.get("hasWarranty") === "true";
    const warrantyMonths = Number(data.get("warrantyMonths")) || 0;

    // Fixed: Captured missing fields
    const storeId = data.get("storeId");
    const batchNumber = data.get("batchNumber") || "";
    const expiryDate = data.get("expiryDate") || "";

    let rawVariants = [];
    try {
      rawVariants = JSON.parse(data.get("variants") || "[]");
    } catch {
      rawVariants = [];
    }

    const duplicate = await Product.findOne({
      barcode,
      _id: { $ne: _id },
      deleted: false,
    });
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: "Barcode belongs to another product!" },
        { status: 400 },
      );
    }

    const updateData = {
      barcode,
      name,
      category,
      subcategory,
      price,
      costPrice,
      unit,
      gst,
      stock,
      hasVariants,
      hasWarranty,
      warrantyMonths,
      batchNumber,
      expiryDate,
    };

    if (storeId && storeId !== "null") {
      updateData.storeId = storeId;
    }

    const mainFile = data.get("image");
    if (mainFile && typeof mainFile === "object" && mainFile.size > 0) {
      updateData.image = await saveUploadedFile(mainFile);
    }

    if (hasVariants) {
      const variants = [];
      for (let i = 0; i < rawVariants.length; i++) {
        const v = rawVariants[i];
        const vFile = data.get(`variant_image_${i}`);
        let vImgUrl = v.image || "";
        if (vFile && typeof vFile === "object" && vFile.size > 0) {
          vImgUrl = await saveUploadedFile(vFile);
        }
        variants.push({
          sku: String(v.sku || ""),
          color: String(v.color || ""),
          size: String(v.size || ""),
          price: Number(v.price) || 0,
          costPrice: Number(v.costPrice) || 0,
          stock: Number(v.stock) || 0,
          image: vImgUrl,
        });
      }
      updateData.variants = variants;
    } else {
      updateData.variants = [];
    }

    const product = await Product.findByIdAndUpdate(_id, updateData, {
      new: true,
      runValidators: true,
    });
    return NextResponse.json({ success: true, data: product });
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
    await Product.findByIdAndUpdate(id, { deleted: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
