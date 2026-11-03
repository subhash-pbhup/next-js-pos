"use client";
import { useState, useEffect } from "react";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    applyOn: "all",
    targetName: "",
    minOrderAmount: "",
  });

  const [isEditing, setIsEditing] = useState(null);

  // Header-style Auto-hide Toast Notification State
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Custom Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const cRes = await fetch("/api/coupons");
    const cData = await cRes.json();
    if (cData.success) setCoupons(cData.data);

    const catRes = await fetch("/api/categories");
    const catData = await catRes.json();
    if (catData.success) setCategories(catData.data);

    const pRes = await fetch("/api/products");
    const pData = await pRes.json();
    if (pData.success) setProducts(pData.data);
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  const allSubcategories = categories.flatMap((cat) => cat.subcategories || []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = "/api/coupons";
    const method = isEditing ? "PUT" : "POST";
    const body = isEditing ? { _id: isEditing, ...formData } : formData;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast(
        isEditing
          ? "Coupon Updated Successfully!"
          : "Coupon Created Successfully!",
        "success",
      );
      setFormData({
        code: "",
        discountType: "percentage",
        discountValue: "",
        applyOn: "all",
        targetName: "",
        minOrderAmount: "",
      });
      setIsEditing(null);
      fetchData();
    } else {
      const err = await res.json();
      showToast(err.error || "Failed to save coupon", "error");
    }
  };

  const handleEdit = (coupon) => {
    setIsEditing(coupon._id);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      applyOn: coupon.applyOn,
      targetName: coupon.targetName || "",
      minOrderAmount: coupon.minOrderAmount || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (id) => {
    setDeleteModal({ show: true, id: id });
  };

  const confirmDelete = async () => {
    const id = deleteModal.id;
    setDeleteModal({ show: false, id: null });

    const res = await fetch(`/api/coupons?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Coupon deleted successfully!", "success");
      fetchData();
    } else {
      showToast("Failed to delete coupon", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-[90vh] transition-colors duration-200 relative">
      {/* Header-Style Auto-Hide Notification Toast Banner */}
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300 animate-slideDown">
          <div
            className={`flex items-center justify-between px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold ${
              toast.type === "error"
                ? "bg-red-500 text-white border-red-600 shadow-red-500/30"
                : "bg-green-600 text-white border-green-700 shadow-green-600/30"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">
                {toast.type === "error" ? "⚠️" : "✨"}
              </span>
              <p>{toast.message}</p>
            </div>
            <button
              onClick={() =>
                setToast({ show: false, message: "", type: "success" })
              }
              className="text-white/80 hover:text-white font-bold text-base"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100">
            Coupon & Offer Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage promotional discounts and coupon codes
            efficiently.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 px-5 py-2.5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <span className="text-2xl">🏷️</span>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase">
              Total Coupons
            </p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {coupons.length}
            </p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 mb-8 space-y-5 transition-colors duration-200"
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span>{isEditing ? "✏️" : "➕"}</span>{" "}
          {isEditing ? "Edit Coupon Details" : "Create New Coupon"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Coupon Code *
            </label>
            <input
              type="text"
              placeholder="e.g. FESTIVE50"
              className="border border-gray-200 dark:border-gray-700 p-3.5 rounded-xl w-full text-sm font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
              required
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Discount Type *
            </label>
            <select
              className="border border-gray-200 dark:border-gray-700 p-3.5 rounded-xl w-full text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
              value={formData.discountType}
              onChange={(e) =>
                setFormData({ ...formData, discountType: e.target.value })
              }
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Discount Value *
            </label>
            <input
              type="number"
              placeholder={
                formData.discountType === "percentage"
                  ? "e.g. 10 (%)"
                  : "e.g. 100 (₹)"
              }
              className="border border-gray-200 dark:border-gray-700 p-3.5 rounded-xl w-full text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
              required
              value={formData.discountValue}
              onChange={(e) =>
                setFormData({ ...formData, discountValue: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Apply On *
            </label>
            <select
              className="border border-gray-200 dark:border-gray-700 p-3.5 rounded-xl w-full text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
              value={formData.applyOn}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  applyOn: e.target.value,
                  targetName: "",
                })
              }
            >
              <option value="all">All Orders (General)</option>
              <option value="category">Specific Category</option>
              <option value="subcategory">Specific Subcategory</option>
              <option value="product">Specific Product</option>
            </select>
          </div>

          {formData.applyOn === "category" && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Select Category *
              </label>
              <select
                className="border border-gray-200 dark:border-gray-700 p-3.5 rounded-xl w-full text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
                required
                value={formData.targetName}
                onChange={(e) =>
                  setFormData({ ...formData, targetName: e.target.value })
                }
              >
                <option value="">-- Choose Category --</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.applyOn === "subcategory" && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Select Subcategory *
              </label>
              <select
                className="border border-gray-200 dark:border-gray-700 p-3.5 rounded-xl w-full text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
                required
                value={formData.targetName}
                onChange={(e) =>
                  setFormData({ ...formData, targetName: e.target.value })
                }
              >
                <option value="">-- Choose Subcategory --</option>
                {allSubcategories.map((sub, i) => (
                  <option key={i} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.applyOn === "product" && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Select Product *
              </label>
              <select
                className="border border-gray-200 dark:border-gray-700 p-3.5 rounded-xl w-full text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
                required
                value={formData.targetName}
                onChange={(e) =>
                  setFormData({ ...formData, targetName: e.target.value })
                }
              >
                <option value="">-- Choose Product --</option>
                {products.map((p) => (
                  <option key={p._id} value={p.name}>
                    {p.name} ({p.barcode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Min Order Amount (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 500"
              className="border border-gray-200 dark:border-gray-700 p-3.5 rounded-xl w-full text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
              value={formData.minOrderAmount}
              onChange={(e) =>
                setFormData({ ...formData, minOrderAmount: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="submit"
            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${
              isEditing
                ? "bg-orange-500 hover:bg-orange-600 shadow-orange-200 dark:shadow-none"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none"
            }`}
          >
            {isEditing ? "Update Coupon" : "Create Coupon"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(null);
                setFormData({
                  code: "",
                  discountType: "percentage",
                  discountValue: "",
                  applyOn: "all",
                  targetName: "",
                  minOrderAmount: "",
                });
              }}
              className="px-8 py-3 rounded-xl font-bold bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Coupons Table Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-200">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
            Active Coupons List
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100/70 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                <th className="p-4">Code</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Applies To</th>
                <th className="p-4">Min Order</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {coupons.map((cp) => (
                <tr
                  key={cp._id}
                  className="hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition"
                >
                  <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    🏷️ {cp.code}
                  </td>
                  <td className="p-4 font-bold text-gray-800 dark:text-gray-200">
                    {cp.discountValue}
                    {cp.discountType === "percentage" ? "%" : " ₹"} OFF
                  </td>
                  <td className="p-4">
                    <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 rounded-full font-bold capitalize">
                      {cp.applyOn} {cp.targetName ? `: ${cp.targetName}` : ""}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400 font-semibold">
                    ₹{cp.minOrderAmount || 0}
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(cp)}
                      className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(cp._id)}
                      className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-400">
                    <p className="text-4xl mb-2">🎟️</p>
                    <p className="font-semibold">No coupons found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleUp text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
              Delete Coupon?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this coupon? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmDelete}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-sm shadow transition"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteModal({ show: false, id: null })}
                className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-bold text-sm transition"
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
