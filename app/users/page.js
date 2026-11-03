"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsersAndStoresPage() {
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Store States
  const [storeForm, setStoreForm] = useState({
    name: "",
    address: "",
    phone: "",
    gstNumber: "",
  });
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState(null);

  // User States
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Cashier",
    assignedStores: [],
  });
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  useEffect(() => {
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
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storesRes, usersRes] = await Promise.all([
        fetch("/api/stores"),
        fetch("/api/users"),
      ]);
      const storesData = await storesRes.json();
      const usersData = await usersRes.json();

      if (storesData.success) setStores(storesData.data);
      if (usersData.success) setUsers(usersData.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ----- STORE ACTIONS -----
  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingStoreId) {
        res = await fetch("/api/stores", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingStoreId, ...storeForm }),
        });
      } else {
        res = await fetch("/api/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(storeForm),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        closeStoreModal();
        fetchData();
      } else {
        alert(data.error || "Failed to process store.");
      }
    } catch (err) {
      console.error("Store Submit Error:", err);
    }
  };

  const openEditStoreModal = (store) => {
    setEditingStoreId(store._id);
    setStoreForm({
      name: store.name || "",
      address: store.address || "",
      phone: store.phone || "",
      gstNumber: store.gstNumber || "",
    });
    setShowStoreModal(true);
  };

  const closeStoreModal = () => {
    setShowStoreModal(false);
    setEditingStoreId(null);
    setStoreForm({ name: "", address: "", phone: "", gstNumber: "" });
  };

  const handleDeleteStore = async (id) => {
    if (
      !confirm(
        "Are you sure you want to delete this store? Users assigned to this store might be affected.",
      )
    )
      return;
    try {
      const res = await fetch(`/api/stores?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Error deleting store:", error);
    }
  };

  // ----- USER ACTIONS -----
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingUserId) {
        res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingUserId, ...userForm }),
        });
      } else {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        closeUserModal();
        fetchData();
      } else {
        alert(data.error || "Failed to process user.");
      }
    } catch (err) {
      console.error("User Submit Error:", err);
    }
  };

  const openEditUserModal = (user) => {
    setEditingUserId(user._id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      assignedStores: user.assignedStores.map((s) => s._id || s),
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
      } else {
        alert(data.error || "Failed to delete user.");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUserId(null);
    setUserForm({
      name: "",
      email: "",
      password: "",
      role: "Cashier",
      assignedStores: [],
    });
  };

  const toggleStoreAssignment = (storeId) => {
    setUserForm((prev) => {
      const isAssigned = prev.assignedStores.includes(storeId);
      if (isAssigned) {
        return {
          ...prev,
          assignedStores: prev.assignedStores.filter((id) => id !== storeId),
        };
      } else {
        return { ...prev, assignedStores: [...prev.assignedStores, storeId] };
      }
    });
  };

  if (loading)
    return (
      <div className="p-8 text-center font-bold text-gray-500">
        Loading Data...
      </div>
    );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* --- STORE MANAGEMENT SECTION --- */}
      <section className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">
                Manage Stores
              </h2>
              <p className="text-xs text-gray-500">
                Create and manage your POS branches
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingStoreId(null);
              setShowStoreModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            + Add Store
          </button>
        </div>

        {stores.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">
            No stores created yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div
                key={store._id}
                className="p-4 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex justify-between flex-col"
              >
                <div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
                    {store.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    📞 {store.phone || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    📍 {store.address || "No Address"}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                  <button
                    onClick={() => openEditStoreModal(store)}
                    className="text-blue-500 hover:text-blue-600 font-bold text-xs"
                  >
                    Edit Store
                  </button>
                  <button
                    onClick={() => handleDeleteStore(store._id)}
                    className="text-red-500 hover:text-red-600 font-bold text-xs"
                  >
                    Delete Store
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- USER MANAGEMENT SECTION --- */}
      <section className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">
                Manage Users
              </h2>
              <p className="text-xs text-gray-500">
                Assign stores to cashiers and admins
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingUserId(null);
              setShowUserModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            + Add User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 rounded-tl-xl">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Assigned Stores</th>
                <th className="p-4 text-center rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((user) => (
                <tr
                  key={user._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <td className="p-4 font-bold text-gray-800 dark:text-white">
                    {user.name}
                  </td>
                  <td className="p-4 text-gray-500">{user.email}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${user.role === "SuperAdmin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-500 font-medium truncate max-w-[150px]">
                    {user.assignedStores?.length > 0
                      ? user.assignedStores.map((s) => s.name).join(", ")
                      : "No Store Assigned"}
                  </td>

                  <td className="p-4 text-center space-x-2">
                    <button
                      onClick={() => openEditUserModal(user)}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-800 transition shadow-sm border border-blue-200 dark:border-blue-800"
                    >
                      Edit & Assign
                    </button>
                    {user.role !== "SuperAdmin" && (
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-800 transition shadow-sm border border-red-200 dark:border-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-4 text-gray-500 text-sm text-center"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- ADD/EDIT STORE MODAL --- */}
      {showStoreModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-black mb-4 text-gray-900 dark:text-white">
              {editingStoreId ? "Edit Store" : "Add New Store"}
            </h3>
            <form onSubmit={handleStoreSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  STORE NAME *
                </label>
                <input
                  type="text"
                  required
                  value={storeForm.name}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, name: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  ADDRESS
                </label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, address: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  PHONE
                </label>
                <input
                  type="text"
                  value={storeForm.phone}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, phone: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition"
                >
                  {editingStoreId ? "Update Store" : "Save Store"}
                </button>
                <button
                  type="button"
                  onClick={closeStoreModal}
                  className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT USER MODAL --- */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-black mb-4 text-gray-900 dark:text-white">
              {editingUserId ? "Edit User & Assign Stores" : "Add New User"}
            </h3>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  EMAIL *
                </label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  PASSWORD {editingUserId && "(Leave blank to keep same)"}
                </label>
                <input
                  type="password"
                  required={!editingUserId}
                  placeholder={editingUserId ? "••••••••" : ""}
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  ROLE *
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-100"
                >
                  <option value="Cashier">Cashier (POS Terminal Only)</option>
                  <option value="Admin">Admin (Full Access)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                <label className="block text-xs font-bold text-gray-500 mb-2">
                  ASSIGN STORES
                </label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {stores.map((store) => (
                    <label
                      key={store._id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={userForm.assignedStores.includes(store._id)}
                        onChange={() => toggleStoreAssignment(store._id)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {store.name}
                      </span>
                    </label>
                  ))}
                  {stores.length === 0 && (
                    <span className="text-xs text-red-500">
                      Please create a store first!
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition"
                >
                  {editingUserId ? "Update User" : "Save User"}
                </button>
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 rounded-xl text-sm transition"
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
