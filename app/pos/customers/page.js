"use client";
import { useState, useEffect } from "react";

export default function PosCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error("Failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD ACTIONS ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingCustomerId) {
        // Update (PUT) Request
        res = await fetch("/api/customers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingCustomerId, ...form }),
        });
      } else {
        // Create (POST) Request
        res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      const data = await res.json();

      if (res.ok && data.success) {
        closeModal();
        fetchCustomers();
      } else {
        alert(data.error || "Failed to process customer");
      }
    } catch (err) {
      console.error("Error saving customer", err);
    }
  };

  const openEditModal = (customer) => {
    setEditingCustomerId(customer._id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCustomers();
        // Check if we need to go back a page after deleting the last item on current page
        if (currentCustomers.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomerId(null);
    setForm({ name: "", phone: "", email: "", address: "" });
  };

  // --- FILTER & PAGINATION LOGIC ---

  const filteredCustomers = customers.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search),
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to page 1 when searching
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black">Customer Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your retail clients and details
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name, phone..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <button
            onClick={() => {
              setEditingCustomerId(null);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            + New Customer
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 text-center text-gray-500 font-bold">
            Loading Customers...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase font-black text-gray-500">
                    <th className="p-4 rounded-tl-xl">Customer Name</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Address</th>
                    <th className="p-4 text-center rounded-tr-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {currentCustomers.map((c) => (
                    <tr
                      key={c._id}
                      className="hover:bg-blue-50/50 dark:hover:bg-gray-800/40 transition text-sm"
                    >
                      <td className="p-4 font-bold text-gray-900 dark:text-gray-100">
                        {c.name}
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          📞 {c.phone}
                        </p>
                        {c.email && (
                          <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                            ✉️ {c.email}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-gray-500 font-medium text-xs truncate max-w-[200px]">
                        {c.address || "N/A"}
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-800 transition shadow-sm border border-blue-200 dark:border-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c._id)}
                          className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition shadow-sm border border-red-200 dark:border-red-900/50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentCustomers.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="p-8 text-center text-gray-500 font-bold"
                      >
                        {search
                          ? "No customers found for your search."
                          : "No customers available."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Showing{" "}
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {indexOfFirstItem + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {Math.min(indexOfLastItem, filteredCustomers.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {filteredCustomers.length}
                  </span>{" "}
                  customers
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <div className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black mb-4 text-gray-900 dark:text-gray-100">
              {editingCustomerId ? "Edit Customer" : "Add New Customer"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  NAME *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  PHONE *
                </label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  EMAIL (Optional)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  ADDRESS (Optional)
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition"
                >
                  {editingCustomerId ? "Update Customer" : "Save Customer"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
