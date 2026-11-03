"use client";
import { useState, useEffect } from "react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [subcategories, setSubcategories] = useState("");
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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    if (data.success) setCategories(data.data);
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const subList = subcategories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const url = "/api/categories";
    const method = isEditing ? "PUT" : "POST";
    const body = isEditing
      ? { _id: isEditing, name, subcategories: subList }
      : { name, subcategories: subList };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast(
        isEditing
          ? "Category Updated Successfully!"
          : "Category Added Successfully!",
        "success",
      );
      setName("");
      setSubcategories("");
      setIsEditing(null);
      fetchCategories();
    } else {
      const err = await res.json();
      showToast(err.error || "Something went wrong", "error");
    }
  };

  const handleEdit = (cat) => {
    setIsEditing(cat._id);
    setName(cat.name);
    setSubcategories(cat.subcategories.join(", "));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (id) => {
    setDeleteModal({ show: true, id: id });
  };

  const confirmDelete = async () => {
    const id = deleteModal.id;
    setDeleteModal({ show: false, id: null });

    const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Category deleted successfully!", "success");
      fetchCategories();
    } else {
      showToast("Failed to delete category", "error");
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

      <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-6">
        Category & Subcategory Management
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 mb-8 space-y-4 transition-colors duration-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Category Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Electronics, Grocery"
              className="border border-gray-200 dark:border-gray-700 p-3 rounded-xl w-full text-sm bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Subcategories (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Mobile, Laptop, Tablet"
              className="border border-gray-200 dark:border-gray-700 p-3 rounded-xl w-full text-sm bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              value={subcategories}
              onChange={(e) => setSubcategories(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow transition"
          >
            {isEditing ? "Update Category" : "Add Category"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(null);
                setName("");
                setSubcategories("");
              }}
              className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-xl font-bold text-sm transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100/70 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
              <th className="p-4">Category Name</th>
              <th className="p-4">Subcategories</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {categories.map((cat) => (
              <tr
                key={cat._id}
                className="hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition"
              >
                <td className="p-4 font-bold text-gray-800 dark:text-gray-200">
                  {cat.name}
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {cat.subcategories.map((sub, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full font-semibold"
                      >
                        {sub}
                      </span>
                    ))}
                    {cat.subcategories.length === 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        No subcategories
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-center space-x-2">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(cat._id)}
                    className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleUp text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
              Delete Category?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this category? This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-sm shadow transition"
              >
                Yes, Delete
              </button>
              <button
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
