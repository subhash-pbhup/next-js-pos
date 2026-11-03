"use client";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Default Settings State
  const [settings, setSettings] = useState({
    storeName: "Sanskar Tech POS",
    phone: "",
    address: "",
    gstin: "",
    printSize: "80mm",
    defaultTax: 0,

    // Business Smart Toggles
    enableElectronics: true, // Warranty & IMEI
    enablePharmacy: false, // Batch & Expiry
    enableGarments: true, // Color & Size Variants
  });

  // Load Settings on Mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("pos_global_settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Error loading settings");
      }
    }
    setLoading(false);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3500);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Yahan aap future me Database API (e.g., fetch('/api/settings')) call kar sakte hain.
      // Abhi ke liye hum ise LocalStorage me save kar rahe hain taaki poore app me use ho sake.
      localStorage.setItem("pos_global_settings", JSON.stringify(settings));
      showToast("Settings successfully updated & saved!", "success");
    } catch (error) {
      showToast("Failed to save settings.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="font-bold text-gray-500">Loading Settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
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

      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">
          System Settings ⚙️
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure your store details, print layouts, and active business
          modules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: General Store Info */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            🏪 General Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Store Name *
              </label>
              <input
                type="text"
                name="storeName"
                required
                value={settings.storeName}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Store Address (Prints on Bill)
              </label>
              <input
                type="text"
                name="address"
                value={settings.address}
                onChange={handleChange}
                placeholder="e.g. 123 Main Market, New Delhi"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                GSTIN / Tax Number
              </label>
              <input
                type="text"
                name="gstin"
                value={settings.gstin}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Business Modules (Smart Toggles) */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            🚀 Active Business Modules
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
            Turn modules ON or OFF based on your business type to keep the UI
            clean.
          </p>

          <div className="space-y-4">
            {/* Electronics Module */}
            <label
              className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${settings.enableElectronics ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💻</span>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    Electronics & Appliances Module
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Enables Serial Number (IMEI) and Warranty Tracking features.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                name="enableElectronics"
                checked={settings.enableElectronics}
                onChange={handleChange}
                className="w-5 h-5 rounded cursor-pointer accent-blue-600"
              />
            </label>

            {/* Pharmacy Module */}
            <label
              className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${settings.enablePharmacy ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💊</span>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    Pharmacy & Grocery Module
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Enables Batch Number, Mfg Date, and Expiry Date tracking.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                name="enablePharmacy"
                checked={settings.enablePharmacy}
                onChange={handleChange}
                className="w-5 h-5 rounded cursor-pointer accent-emerald-600"
              />
            </label>

            {/* Garments Module */}
            <label
              className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${settings.enableGarments ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👕</span>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    Clothing & Apparel Module
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Enables complex Variants (Color, Size, SKU) management.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                name="enableGarments"
                checked={settings.enableGarments}
                onChange={handleChange}
                className="w-5 h-5 rounded cursor-pointer accent-purple-600"
              />
            </label>
          </div>
        </div>

        {/* SECTION 3: Printing & Tax Preferences */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            🖨️ Billing & Print Preferences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Thermal Paper Size
              </label>
              <select
                name="printSize"
                value={settings.printSize}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="80mm">80mm (Standard POS Receipt)</option>
                <option value="58mm">58mm (Small POS Receipt)</option>
                <option value="A4">A4 Size (Invoice format)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Default Global Tax / GST (%)
              </label>
              <input
                type="number"
                name="defaultTax"
                value={settings.defaultTax}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
          >
            💾 Save All Settings
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-8 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
