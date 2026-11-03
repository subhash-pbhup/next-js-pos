"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        // User aur Assigned Stores localStorage me save kar lenge
        localStorage.setItem("posUser", JSON.stringify(data.data));

        // Agar user ka role Cashier hai toh default billing page par bhejein
        if (data.data.role === "Cashier") {
          window.location.href = "/billing";
        } else {
          window.location.href = "/"; // Dashboard for Admin
        }
      } else {
        setError(data.error || "Login fail ho gaya.");
      }
    } catch (err) {
      setError("Network issue! Server se connect nahi ho paaya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-wider">
            ST POS
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-2">
            Welcome back! Please login to your account.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 p-3 rounded-xl text-sm font-bold text-center mb-4 border border-red-200 dark:border-red-900">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="admin@sanskartech.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3.5 rounded-xl text-sm shadow-xl shadow-blue-200/50 transition-all active:scale-95"
          >
            {loading ? "Logging in..." : "Login Securely ➔"}
          </button>
        </form>

        <p className="text-center text-xs font-semibold text-gray-400 mt-6">
          Authorized personnel only.
        </p>
      </div>
    </div>
  );
}
