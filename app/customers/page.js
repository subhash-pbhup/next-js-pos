"use client";
import { useState, useEffect } from "react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Ek page par kitne customers dikhenge

  const [formData, setFormData] = useState({
    _id: "",
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  // Header-style Auto-hide Toast Notification State
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Custom Delete Modal State (replaces native confirm())
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const res = await fetch("/api/customers");
    const data = await res.json();
    if (data.success) setCustomers(data.data);
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = "/api/customers";
    const method = isEditing ? "PUT" : "POST";

    const payload = { ...formData };
    if (!isEditing || !payload._id) {
      delete payload._id;
    }

    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      showToast(
        isEditing
          ? "Customer Updated Successfully!"
          : "Customer Added Successfully!",
        "success",
      );
      setFormData({ _id: "", name: "", phone: "", email: "", address: "" });
      setIsEditing(false);
      fetchCustomers();
    } else {
      showToast(data.error || "Something went wrong", "error");
    }
  };

  const handleEdit = (customer) => {
    setFormData(customer);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (id) => {
    setDeleteModal({ show: true, id: id });
  };

  const confirmDelete = async () => {
    const id = deleteModal.id;
    setDeleteModal({ show: false, id: null });

    const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Customer deleted successfully!", "success");
      fetchCustomers();
    } else {
      showToast("Failed to delete customer", "error");
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm),
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

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
            Customer Directory
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage all your store clients and contact info efficiently.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 px-5 py-2.5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase">
              Total Customers
            </p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {customers.length}
            </p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 mb-8 relative transition-colors duration-200">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
          <span>{isEditing ? "✏️" : "➕"}</span>{" "}
          {isEditing ? "Edit Customer Details" : "Add New Customer"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              className="border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              className="border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. rahul@gmail.com"
              className="border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Address / City
            </label>
            <input
              type="text"
              placeholder="e.g. Civil Lines, Delhi"
              className="border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full bg-gray-50/50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>

          <div className="lg:col-span-4 flex gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="submit"
              className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${
                isEditing
                  ? "bg-orange-500 hover:bg-orange-600 shadow-orange-200 dark:shadow-none"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none"
              }`}
            >
              {isEditing ? "Update Customer" : "Save Customer"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    _id: "",
                    name: "",
                    phone: "",
                    email: "",
                    address: "",
                  });
                }}
                className="px-8 py-3 rounded-xl font-bold bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Customer List Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-200">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
            Customer List
          </h3>
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="🔍 Search by name or phone..."
              className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl w-full text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to page 1 on search
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100/70 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                <th className="p-4">Customer Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email</th>
                <th className="p-4">Address</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {currentCustomers.map((c) => (
                <tr
                  key={c._id}
                  className="hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition"
                >
                  <td className="p-4 font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    {c.name}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400 font-medium">
                    📞 {c.phone}
                  </td>
                  <td className="p-4 text-gray-500 dark:text-gray-400">
                    {c.email || "—"}
                  </td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 truncate max-w-[220px]">
                    {c.address || "—"}
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button
                      onClick={() => handleEdit(c)}
                      className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white px-3 py-1.5 rounded-lg text-sm font-bold transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(c._id)}
                      className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white px-3 py-1.5 rounded-lg text-sm font-bold transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {currentCustomers.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-400">
                    <p className="text-4xl mb-2">📭</p>
                    <p className="font-semibold">No customers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Showing page{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {totalPages}
              </span>{" "}
              ({filteredCustomers.length} customers)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleUp text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
              Delete Customer?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this customer? This action cannot
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
