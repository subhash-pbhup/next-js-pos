"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeForm, setStoreForm] = useState({
    name: "",
    address: "",
    phone: "",
    gstNumber: "",
  });

  useEffect(() => {
    // Check Admin Access
    const savedUserStr = localStorage.getItem("posUser");
    if (!savedUserStr) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(savedUserStr);
    if (parsedUser.role !== "SuperAdmin" && parsedUser.role !== "Admin") {
      router.push("/");
      return;
    }

    fetchStores();
  }, [router]);

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/stores");
      const data = await res.json();
      if (data.success) {
        setStores(data.data);
      }
    } catch (err) {
      console.error("Error fetching stores:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingStoreId) {
        // Edit Existing Store (PUT Request)
        res = await fetch("/api/stores", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingStoreId, ...storeForm }),
        });
      } else {
        // Create New Store (POST Request)
        res = await fetch("/api/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(storeForm),
        });
      }

      const data = await res.json();

      if (res.ok && data.success) {
        closeModal();
        fetchStores(); // Table refresh
      } else {
        alert(data.error || "Failed to process store");
      }
    } catch (err) {
      console.error("Store Submit Error:", err);
      alert("Network error occurred.");
    }
  };

  const openEditModal = (store) => {
    setEditingStoreId(store._id);
    setStoreForm({
      name: store.name || "",
      address: store.address || "",
      phone: store.phone || "",
      gstNumber: store.gstNumber || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStoreId(null);
    setStoreForm({ name: "", address: "", phone: "", gstNumber: "" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this store?")) return;
    try {
      const res = await fetch(`/api/stores?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchStores();
      }
    } catch (error) {
      console.error("Error deleting store:", error);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500 font-bold">
        Loading Stores...
      </div>
    );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <section className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white">
              Manage Stores
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and manage your POS branch locations.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingStoreId(null);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            + Add New Store
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 uppercase font-bold text-xs tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-4 rounded-tl-xl">STORE NAME</th>
                <th className="p-4">PHONE</th>
                <th className="p-4">ADDRESS</th>
                <th className="p-4">GST NUMBER</th>
                <th className="p-4 text-center rounded-tr-xl">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {stores.map((store) => (
                <tr
                  key={store._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <td className="p-4 font-bold text-gray-800 dark:text-white">
                    {store.name}
                  </td>
                  <td className="p-4 text-gray-500">{store.phone || "N/A"}</td>
                  <td className="p-4 text-gray-500">
                    {store.address || "N/A"}
                  </td>
                  <td className="p-4 text-gray-500">
                    {store.gstNumber || "N/A"}
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button
                      onClick={() => openEditModal(store)}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-800 transition shadow-sm border border-blue-200 dark:border-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(store._id)}
                      className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition border border-red-200 dark:border-red-900/50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No stores found. Click "+ Add New Store" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ADD / EDIT STORE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-black mb-4 text-gray-900 dark:text-white">
              {editingStoreId ? "Edit Store" : "Add New Store"}
            </h3>
            <form onSubmit={handleStoreSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                  Store Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Branch"
                  value={storeForm.name}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, name: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                  Phone
                </label>
                <input
                  type="text"
                  placeholder="Contact Number"
                  value={storeForm.phone}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, phone: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Full Store Address"
                  value={storeForm.address}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, address: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                  GST Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  value={storeForm.gstNumber}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, gstNumber: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all"
                >
                  {editingStoreId ? "Update Store" : "Save Store"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold py-3 rounded-xl text-sm transition-all"
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
