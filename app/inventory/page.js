"use client";
import { useState, useEffect, useRef } from "react";
import BarcodePrintModal from "../../components/BarcodePrintModal";
import BulkBarcodePrintModal from "../../components/BulkBarcodePrintModal";

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  const fileInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterSubcategory, setFilterSubcategory] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // const unitsList = [
  //   "Pcs",
  //   "Kg",
  //   "Gram",
  //   "Ltr",
  //   "Ml",
  //   "Box",
  //   "Pack",
  //   "Meter",
  //   "Strip",
  //   "Tablet",
  // ];

  const unitsList = [
    "Pcs",
    "Kg",
    "Gram",
    "Ltr",
    "Ml",
    "Box",
    "Pack",
    "Meter",
    "Strip",
    "Tablet",
    "Bottle",
    "Vial",
    "Ampoule",
    "Tube",
    "Sachet",
    "Jar",
    "Roll",
    "Pair",
  ];

  const generateRandomBarcode = () =>
    "PRD-" + Math.floor(100000 + Math.random() * 900000);

  const [formData, setFormData] = useState({
    _id: "",
    barcode: generateRandomBarcode(),
    name: "",
    category: "",
    subcategory: "",
    price: "",
    costPrice: "",
    gst: "",
    stock: "",
    unit: "Pcs",
    image: null,
    hasVariants: false,
    variants: [],
    hasWarranty: false,
    warrantyMonths: "",
    batchNumber: "",
    expiryDate: "",
  });

  // Global Settings for Smart Modules
  const [appSettings, setAppSettings] = useState({
    enableElectronics: true,
    enablePharmacy: false,
    enableGarments: true,
  });

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

  const [viewProduct, setViewProduct] = useState(null);
  const [selectedBarcodeProductId, setSelectedBarcodeProductId] =
    useState(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  useEffect(() => {
    // Load Settings
    const savedSettings = localStorage.getItem("pos_global_settings");
    if (savedSettings) {
      try {
        setAppSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Error parsing settings");
      }
    }

    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const activeStoreId = localStorage.getItem("activeStoreId") || "";
      const res = await fetch(`/api/products?storeId=${activeStoreId}`);
      const data = await res.json();
      if (data.success) setProducts(data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  // Helper Function: Check if a category should be hidden based on settings
  const isCategoryHidden = (categoryName) => {
    const name = (categoryName || "").toLowerCase();
    if (
      !appSettings.enablePharmacy &&
      (name.includes("pharmacy") ||
        name.includes("medical") ||
        name.includes("medicine") ||
        name.includes("supplement") ||
        name.includes("grocery") ||
        name.includes("food") ||
        name.includes("fmcg"))
    )
      return true;
    if (
      !appSettings.enableElectronics &&
      (name.includes("electronic") ||
        name.includes("appliance") ||
        name.includes("mobile") ||
        name.includes("computer") ||
        name.includes("laptop") ||
        name.includes("gadget"))
    )
      return true;
    if (
      !appSettings.enableGarments &&
      (name.includes("cloth") ||
        name.includes("garment") ||
        name.includes("apparel") ||
        name.includes("fashion") ||
        name.includes("wear") ||
        name.includes("footwear") ||
        name.includes("shoe"))
    )
      return true;
    return false;
  };

  // Naya Logic: Sirf active categories hi rakho
  const filteredCategoriesList = categories.filter(
    (c) => !isCategoryHidden(c.name),
  );

  // Modal ke liye sirf valid products nikalo
  const validProducts = products.filter((p) => !isCategoryHidden(p.category));

  const selectedFormCatObj = filteredCategoriesList.find(
    (c) => c.name === formData.category,
  );
  const availableFormSubcategories = selectedFormCatObj
    ? selectedFormCatObj.subcategories || []
    : [];

  const activeFilterCatObj = filteredCategoriesList.find(
    (c) => c.name === filterCategory,
  );
  const currentFilterSubcategories = activeFilterCatObj
    ? activeFilterCatObj.subcategories || []
    : [];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleAddVariant = () => {
    const newVariant = {
      sku: `${formData.barcode || "SKU"}-V${formData.variants.length + 1}`,
      color: "",
      size: "",
      price: formData.price || "",
      costPrice: formData.costPrice || "0",
      stock: "",
      imageFile: null,
      preview: "",
    };
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));
  };

  const handleRemoveVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleVariantChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant,
      );
      return { ...prev, variants: updated };
    });
  };

  const handleVariantImageChange = (index, file) => {
    if (!file) return;
    setFormData((prev) => {
      const updated = prev.variants.map((variant, i) => {
        if (i === index)
          return {
            ...variant,
            imageFile: file,
            preview: URL.createObjectURL(file),
          };
        return variant;
      });
      return { ...prev, variants: updated };
    });
  };

  const resetForm = () => {
    setFormData({
      _id: "",
      barcode: generateRandomBarcode(),
      name: "",
      category: "",
      subcategory: "",
      price: "",
      costPrice: "",
      gst: "",
      stock: "",
      unit: "Pcs",
      image: null,
      hasVariants: false,
      variants: [],
      hasWarranty: false,
      warrantyMonths: "",
      batchNumber: "",
      expiryDate: "",
    });
    setPreviewImage("");
    setIsEditing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.hasVariants && formData.variants.length === 0) {
      showToast("Please add at least one variant!", "error");
      return;
    }

    const url = "/api/products";
    const method = isEditing ? "PUT" : "POST";

    const data = new FormData();
    if (isEditing) data.append("_id", formData._id);

    const activeStoreId = localStorage.getItem("activeStoreId");
    if (activeStoreId) data.append("storeId", activeStoreId);

    data.append("barcode", formData.barcode);
    data.append("name", formData.name);
    data.append("category", formData.category);
    data.append("subcategory", formData.subcategory || "");

    const calculatedStock = formData.hasVariants
      ? formData.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)
      : formData.stock;

    const effectivePrice =
      formData.hasVariants && formData.variants.length > 0
        ? formData.variants[0].price
        : formData.price;
    const effectiveCost =
      formData.hasVariants && formData.variants.length > 0
        ? formData.variants[0].costPrice
        : formData.costPrice;

    data.append("price", effectivePrice || "0");
    data.append("costPrice", effectiveCost || "0");
    data.append("gst", formData.gst || "0");
    data.append("stock", calculatedStock || "0");
    data.append("unit", formData.unit || "Pcs");

    data.append("hasVariants", formData.hasVariants ? "true" : "false");
    data.append("hasWarranty", formData.hasWarranty ? "true" : "false");
    data.append(
      "warrantyMonths",
      formData.hasWarranty ? formData.warrantyMonths || "0" : "0",
    );
    data.append("batchNumber", formData.batchNumber || "");
    data.append("expiryDate", formData.expiryDate || "");

    if (formData.image instanceof File) data.append("image", formData.image);

    if (formData.hasVariants) {
      const sanitizedVariants = formData.variants.map((v) => ({
        sku: v.sku,
        color: v.color,
        size: v.size,
        price: v.price,
        costPrice: v.costPrice,
        stock: v.stock,
        image: v.preview && !v.imageFile ? v.preview : "",
      }));
      data.append("variants", JSON.stringify(sanitizedVariants));
      formData.variants.forEach((v, index) => {
        if (v.imageFile instanceof File)
          data.append(`variant_image_${index}`, v.imageFile);
      });
    }

    try {
      const res = await fetch(url, { method, body: data });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast(
          isEditing
            ? "Product Updated Successfully!"
            : "Product Added Successfully!",
          "success",
        );
        resetForm();
        fetchProducts();
      } else {
        showToast(
          "Error: " + (resData.error || "Something went wrong"),
          "error",
        );
      }
    } catch {
      showToast("Failed to save product", "error");
    }
  };

  const handleEdit = (product) => {
    const hasVar = Boolean(product.hasVariants);
    let varList = [];
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      varList = product.variants.map((v) => ({
        sku: v.sku || "",
        color: v.color || "",
        size: v.size || "",
        price: v.price ?? "",
        costPrice: v.costPrice ?? "0",
        stock: v.stock ?? "",
        imageFile: null,
        preview: v.image || "",
      }));
    }

    let formattedDate = "";
    if (product.expiryDate) {
      const d = new Date(product.expiryDate);
      if (!isNaN(d)) formattedDate = d.toISOString().split("T")[0];
    }

    setFormData({
      _id: product._id,
      barcode: product.barcode || "",
      name: product.name || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      price: product.price ?? "",
      costPrice: product.costPrice ?? "",
      gst: product.gst ?? "",
      stock: product.stock ?? "",
      unit: product.unit || "Pcs",
      image: product.image || null,
      hasVariants: hasVar,
      variants: varList,
      hasWarranty: Boolean(product.hasWarranty),
      warrantyMonths: product.warrantyMonths || "",
      batchNumber: product.batchNumber || "",
      expiryDate: formattedDate,
    });

    setPreviewImage(product.image || "");
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    const id = deleteModal.id;
    setDeleteModal({ show: false, id: null });
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Product Deleted!", "success");
        fetchProducts();
      } else {
        showToast("Failed to delete product", "error");
      }
    } catch {
      showToast("Error deleting product", "error");
    }
  };

  // Main Page ke liye Search aur Category Filtering
  const filteredProducts = validProducts.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "All" || p.category === filterCategory;
    const matchesSubcategory =
      filterSubcategory === "All" || p.subcategory === filterSubcategory;

    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div
            className={`flex items-center justify-between p-3.5 rounded-2xl shadow-xl text-xs font-bold text-white ${toast.type === "error" ? "bg-red-500" : "bg-emerald-600"}`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() =>
                setToast({ show: false, message: "", type: "success" })
              }
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            📦 Inventory Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Add, update, search, and manage store products & variants
            efficiently.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedBarcodeProductId(null);
              setShowBarcodeModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            🏷️ Bulk Print Barcodes
          </button>
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 px-4 py-2 rounded-2xl">
            <span className="text-xl">📦</span>
            <div>
              <p className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                Visible Items
              </p>
              <p className="text-sm font-black text-blue-950 dark:text-blue-200">
                {filteredProducts.length} Products
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">
                Barcode *
              </label>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, barcode: generateRandomBarcode() })
                }
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Auto Generate
              </button>
            </div>
            <input
              type="text"
              required
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.barcode}
              onChange={(e) =>
                setFormData({ ...formData, barcode: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wireless Mouse / Paracetamol"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Category *
            </label>
            <select
              required
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value,
                  subcategory: "",
                })
              }
            >
              <option value="">Select Category</option>
              {filteredCategoriesList.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Subcategory
            </label>
            <select
              disabled={
                !formData.category || availableFormSubcategories.length === 0
              }
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={formData.subcategory}
              onChange={(e) =>
                setFormData({ ...formData, subcategory: e.target.value })
              }
            >
              <option value="">Select Subcategory</option>
              {availableFormSubcategories.map((s, i) => (
                <option key={i} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Unit of Measurement *
            </label>
            <select
              required
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value })
              }
            >
              {unitsList.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              GST Tax Rate (%)
            </label>
            <input
              type="number"
              placeholder="e.g. 18"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.gst}
              onChange={(e) =>
                setFormData({ ...formData, gst: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Main Cover Image
            </label>
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded-xl">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
              {previewImage && (
                <img
                  src={previewImage}
                  alt="Main Preview"
                  className="w-9 h-9 rounded-lg object-cover border"
                />
              )}
            </div>
          </div>
        </div>

        {appSettings.enablePharmacy && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
            <div>
              <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">
                Batch Number (Pharmacy)
              </label>
              <input
                type="text"
                placeholder="e.g. B-7489X"
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.batchNumber || ""}
                onChange={(e) =>
                  setFormData({ ...formData, batchNumber: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.expiryDate || ""}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {appSettings.enableElectronics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.hasWarranty}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hasWarranty: e.target.checked,
                    warrantyMonths: e.target.checked ? prev.warrantyMonths : "",
                  }))
                }
                className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-gray-400 cursor-pointer"
              />
              <div>
                <p className="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-100">
                  Electronic Product / Has Warranty
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Enable this to ask for Serial No. / IMEI during checkout.
                </p>
              </div>
            </label>

            {formData.hasWarranty && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                  Warranty Duration (Months)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.warrantyMonths || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, warrantyMonths: e.target.value })
                  }
                />
              </div>
            )}
          </div>
        )}

        {!formData.hasVariants && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                required={!formData.hasVariants}
                placeholder="0.00"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Current Stock ({formData.unit}) *
              </label>
              <input
                type="number"
                required={!formData.hasVariants}
                placeholder="0"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {appSettings.enableGarments && (
          <>
            <div className="p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.hasVariants}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      hasVariants: checked,
                      variants:
                        checked && prev.variants.length === 0
                          ? [
                              {
                                sku: `${prev.barcode || "SKU"}-V1`,
                                color: "",
                                size: "",
                                price: prev.price || "",
                                costPrice: prev.costPrice || "0",
                                stock: prev.stock || "",
                                imageFile: null,
                                preview: "",
                              },
                            ]
                          : prev.variants,
                    }));
                  }}
                  className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 dark:bg-gray-900 border-gray-400 cursor-pointer"
                />
                <div>
                  <p className="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-100">
                    This item has multiple color/size variants & unique images
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Activate this to attach dedicated images, distinct stock
                    counts and separate barcodes per variant.
                  </p>
                </div>
              </label>
            </div>

            {formData.hasVariants && (
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    🎨 Variants List ({formData.variants.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-sm"
                  >
                    + Add Another Variant
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.variants.map((v, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl relative space-y-3 shadow-sm hover:border-blue-400 transition"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950 px-2 py-0.5 rounded-md">
                          Variant #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="text-gray-400 hover:text-red-500 font-bold text-xs"
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div className="flex gap-3 items-center">
                        <div className="relative w-16 h-16 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex-shrink-0 flex items-center justify-center overflow-hidden bg-white dark:bg-gray-900 group">
                          {v.preview ? (
                            <img
                              src={v.preview}
                              alt="Variant"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg text-gray-300">🖼️</span>
                          )}
                          <label className="absolute inset-0 bg-black/50 text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition">
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleVariantImageChange(idx, e.target.files[0])
                              }
                            />
                          </label>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">
                              SKU / Barcode *
                            </label>
                            <input
                              type="text"
                              required
                              value={v.sku}
                              onChange={(e) =>
                                handleVariantChange(idx, "sku", e.target.value)
                              }
                              className="w-full p-2 text-xs font-mono font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">
                              Stock ({formData.unit}) *
                            </label>
                            <input
                              type="number"
                              required
                              placeholder="Stock"
                              value={v.stock}
                              onChange={(e) =>
                                handleVariantChange(
                                  idx,
                                  "stock",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Color
                          </label>
                          <input
                            type="text"
                            placeholder="Red / Blue"
                            value={v.color}
                            onChange={(e) =>
                              handleVariantChange(idx, "color", e.target.value)
                            }
                            className="w-full p-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Size
                          </label>
                          <input
                            type="text"
                            placeholder="M / XL / 1Kg"
                            value={v.size}
                            onChange={(e) =>
                              handleVariantChange(idx, "size", e.target.value)
                            }
                            className="w-full p-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Selling (₹) *
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="Price"
                            value={v.price}
                            onChange={(e) =>
                              handleVariantChange(idx, "price", e.target.value)
                            }
                            className="w-full p-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Cost (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="Cost"
                            value={v.costPrice}
                            onChange={(e) =>
                              handleVariantChange(
                                idx,
                                "costPrice",
                                e.target.value,
                              )
                            }
                            className="w-full p-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="submit"
            className={`px-8 py-3 rounded-xl font-bold text-xs text-white shadow-lg transition active:scale-95 ${isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {isEditing ? "💾 Save Changes" : "✨ Create Product"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <input
            type="text"
            placeholder="🔍 Search products or barcode..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-80 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                setFilterCategory("All");
                setFilterSubcategory("All");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${filterCategory === "All" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}
            >
              All Categories
            </button>
            {filteredCategoriesList.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => {
                  setFilterCategory(c.name);
                  setFilterSubcategory("All");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${filterCategory === c.name ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {filterCategory !== "All" && currentFilterSubcategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-2.5 border-t border-gray-100 dark:border-gray-800 pb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">
              Subcategory:
            </span>
            <button
              type="button"
              onClick={() => {
                setFilterSubcategory("All");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${filterSubcategory === "All" ? "bg-gray-800 dark:bg-gray-700 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"}`}
            >
              All
            </button>
            {currentFilterSubcategories.map((sub, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setFilterSubcategory(sub);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${filterSubcategory === sub ? "bg-gray-800 dark:bg-gray-700 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"}`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                <th className="p-4">Item</th>
                <th className="p-4">Barcode / SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Selling Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {currentProducts.map((p) => {
                const totalStock =
                  p.hasVariants && Array.isArray(p.variants)
                    ? p.variants.reduce(
                        (sum, v) => sum + (Number(v.stock) || 0),
                        0,
                      )
                    : p.stock;
                const prices =
                  p.hasVariants &&
                  Array.isArray(p.variants) &&
                  p.variants.length > 0
                    ? p.variants.map((v) => Number(v.price) || 0)
                    : [p.price];
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);

                return (
                  <tr
                    key={p._id}
                    className="hover:bg-blue-50/20 dark:hover:bg-gray-800/30 transition"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center font-bold text-gray-400">
                            📦
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100">
                            {p.name}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.hasVariants && (
                              <span className="text-[9px] font-extrabold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                                {p.variants?.length || 0} Variants
                              </span>
                            )}
                            {p.hasWarranty && (
                              <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                🛡️ {p.warrantyMonths}M Warranty
                              </span>
                            )}
                            {p.batchNumber && (
                              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                💊 Batch: {p.batchNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {p.barcode}
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {p.category || "General"}
                      </span>
                      {p.subcategory && (
                        <p className="text-[10px] text-gray-400">
                          ↳ {p.subcategory}
                        </p>
                      )}
                    </td>
                    <td className="p-4 font-black text-gray-900 dark:text-gray-100">
                      {minPrice === maxPrice
                        ? `₹${minPrice}`
                        : `₹${minPrice} - ₹${maxPrice}`}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black ${totalStock > 0 ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"}`}
                      >
                        {totalStock} {p.unit || "Pcs"}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBarcodeProductId(p._id);
                          setShowBarcodeModal(true);
                        }}
                        className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg font-bold hover:bg-purple-600 hover:text-white transition shadow-sm"
                        title="Print Barcode Labels"
                      >
                        Barcode
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewProduct(p)}
                        className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold hover:bg-emerald-600 hover:text-white transition shadow-sm"
                        title="View Full Details"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(p)}
                        className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition shadow-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteModal({ show: true, id: p._id })
                        }
                        className="px-2.5 py-1 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-600 hover:text-white transition shadow-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {currentProducts.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-gray-500 font-bold"
                  >
                    {searchQuery
                      ? "No products match your search."
                      : "No products available in this store."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewProduct && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                {viewProduct.image ? (
                  <img
                    src={viewProduct.image}
                    alt={viewProduct.name}
                    className="w-12 h-12 rounded-xl object-cover border dark:border-gray-700 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-xl font-bold">
                    📦
                  </div>
                )}
                <div>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100">
                    {viewProduct.name}
                  </h2>
                  <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {viewProduct.barcode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewProduct(null)}
                className="text-gray-400 hover:text-red-500 font-bold text-xl px-2 py-1 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border dark:border-gray-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    Category
                  </span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                    {viewProduct.category || "General"}
                  </p>
                  {viewProduct.subcategory && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">
                      ↳ {viewProduct.subcategory}
                    </span>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border dark:border-gray-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    Selling Price
                  </span>
                  <p className="font-black text-sm text-green-600 dark:text-green-400 mt-0.5">
                    ₹{viewProduct.price} / {viewProduct.unit || "Pcs"}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border dark:border-gray-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    Cost Price & Tax
                  </span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                    ₹{viewProduct.costPrice || 0} • {viewProduct.gst || 0}% GST
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border dark:border-gray-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    Total Stock
                  </span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                    {viewProduct.hasVariants &&
                    Array.isArray(viewProduct.variants)
                      ? viewProduct.variants.reduce(
                          (acc, v) => acc + (Number(v.stock) || 0),
                          0,
                        )
                      : viewProduct.stock}{" "}
                    {viewProduct.unit || "Pcs"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {viewProduct.hasWarranty && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl border border-blue-200 dark:border-blue-800 flex-1">
                    <span className="text-[10px] font-bold uppercase text-blue-500">
                      Warranty details
                    </span>
                    <p className="font-bold text-blue-800 dark:text-blue-300 mt-0.5">
                      Duration: {viewProduct.warrantyMonths} Months
                    </p>
                  </div>
                )}
                {viewProduct.batchNumber && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-500">
                      Pharmacy Details
                    </span>
                    <p className="font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Batch: {viewProduct.batchNumber}{" "}
                      {viewProduct.expiryDate &&
                        `| Expiry: ${new Date(viewProduct.expiryDate).toLocaleDateString()}`}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Product Variants (
                    {viewProduct.hasVariants
                      ? viewProduct.variants?.length || 0
                      : "Single Item"}
                    )
                  </h3>
                  {viewProduct.hasVariants && (
                    <span className="text-[10px] font-extrabold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                      Multi-Variant Product
                    </span>
                  )}
                </div>

                {viewProduct.hasVariants &&
                Array.isArray(viewProduct.variants) &&
                viewProduct.variants.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {viewProduct.variants.map((v, idx) => (
                      <div
                        key={v.sku || idx}
                        className="p-3 bg-gray-50/80 dark:bg-gray-800/60 rounded-2xl border dark:border-gray-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          {v.image ? (
                            <img
                              src={v.image}
                              alt={v.sku}
                              className="w-12 h-12 rounded-xl object-cover border dark:border-gray-700 shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 border dark:border-gray-700">
                              🎨
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 dark:text-gray-100">
                                {[v.color, v.size]
                                  .filter(Boolean)
                                  .join(" - ") || "Variant " + (idx + 1)}
                              </p>
                              <span className="font-mono text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                                {v.sku}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                              {v.color && (
                                <span>
                                  Color:{" "}
                                  <strong className="text-gray-700 dark:text-gray-300">
                                    {v.color}
                                  </strong>
                                </span>
                              )}
                              {v.size && (
                                <span>
                                  Size:{" "}
                                  <strong className="text-gray-700 dark:text-gray-300">
                                    {v.size}
                                  </strong>
                                </span>
                              )}
                              <span>Cost: ₹{v.costPrice || 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-xs text-blue-600 dark:text-blue-400">
                            ₹{v.price}
                          </p>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${v.stock > 0 ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300" : "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300"}`}
                          >
                            Stock: {v.stock}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border dark:border-gray-800 text-center text-gray-500">
                    This is a standard single product without additional
                    variants.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  const target = viewProduct;
                  setViewProduct(null);
                  handleEdit(target);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition"
              >
                ✏️ Edit Product
              </button>
              <button
                type="button"
                onClick={() => setViewProduct(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YAHI PAR MODAL KO CORRECT/FILTERED PROPS BHEJE GAYE HAIN */}
      {showBarcodeModal && (
        <BulkBarcodePrintModal
          key={
            selectedBarcodeProductId
              ? String(selectedBarcodeProductId)
              : "bulk-mode"
          }
          products={validProducts}
          categories={filteredCategoriesList}
          selectedProductId={selectedBarcodeProductId}
          onClose={() => {
            setShowBarcodeModal(false);
            setSelectedBarcodeProductId(null);
          }}
        />
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">
                Delete Product?
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                This product will be archived from billing records.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs transition"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteModal({ show: false, id: null })}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold py-2 rounded-xl text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
