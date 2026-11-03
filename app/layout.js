"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./globals.css";

export default function RootLayout({ children }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile toggle state

  // Real authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [activeStoreId, setActiveStoreId] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";
  const isPosPage = pathname.startsWith("/pos");

  // Authentication Logic & Role-Based Routing
  useEffect(() => {
    if (isLoginPage) {
      setIsAuthLoading(false);
      return;
    }

    const savedUserStr = localStorage.getItem("posUser");
    if (!savedUserStr) {
      router.push("/login"); // User login nahi hai toh redirect karein
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUserStr);

      // --- CASHIER RESTRICTION LOGIC ---
      // Agar role Cashier hai aur wo non-POS page par hai, toh usko POS terminal par bhej do
      if (parsedUser.role === "Cashier" && !pathname.startsWith("/pos")) {
        router.replace("/pos/billing");
        return; // Redirect ke baad aage process mat karo
      }

      setCurrentUser(parsedUser);

      // Handle Stores logic
      if (parsedUser?.assignedStores?.length > 0) {
        const savedStore = localStorage.getItem("activeStoreId");
        const isAssigned = parsedUser.assignedStores.find(
          (s) => s._id === savedStore,
        );

        if (savedStore && isAssigned) {
          setActiveStoreId(savedStore);
        } else {
          setActiveStoreId(parsedUser.assignedStores[0]._id);
          localStorage.setItem(
            "activeStoreId",
            parsedUser.assignedStores[0]._id,
          );
        }
      }
    } catch (e) {
      console.error("Auth Parse Error", e);
      localStorage.removeItem("posUser");
      router.push("/login");
    } finally {
      setIsAuthLoading(false);
    }
  }, [pathname, router, isLoginPage]);

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem("posUser");
    localStorage.removeItem("activeStoreId");
    router.push("/login");
  };

  const handleStoreChange = (e) => {
    const newStoreId = e.target.value;
    setActiveStoreId(newStoreId);
    localStorage.setItem("activeStoreId", newStoreId);
    window.location.reload();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .catch((err) => console.error(err));
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark";
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add("dark");
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDarkMode(true);
    }
  };

  // Agar login page hai toh bina layout / sidebar ke render karein
  if (isLoginPage) {
    return (
      <html lang="en" className={darkMode ? "dark" : ""}>
        <body>{children}</body>
      </html>
    );
  }

  // Auth Loading State
  if (isAuthLoading || !currentUser) {
    return (
      <html lang="en" className={darkMode ? "dark" : ""}>
        <body className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="font-bold text-blue-600">
            Checking Authentication & Permissions...
          </div>
        </body>
      </html>
    );
  }

  // Admin Sidebar Links
  const adminLinks = [
    { name: "Dashboard", href: "/", icon: "🏠" },
    { name: "POS Terminal", href: "/pos/billing", icon: "🧾" },
    { name: "Reports", href: "/reports", icon: "📊" },
    { name: "Inventory", href: "/inventory", icon: "📦" },
    { name: "Orders", href: "/orders", icon: "📋" },
    { name: "Customers", href: "/customers", icon: "👥" },
    { name: "Categories", href: "/categories", icon: "🗂️" },
    { name: "Coupons", href: "/coupons", icon: "🎟️" },
    // Settings ka link add kiya hai yaha:
    { name: "Settings", href: "/settings", icon: "⚙️" },
    ...(currentUser.role === "SuperAdmin" || currentUser.role === "Admin"
      ? [
          { name: "Stores", href: "/stores", icon: "🏢" },
          { name: "Users", href: "/users", icon: "🛡️" },
        ]
      : []),
  ];

  // POS Mini Sidebar Links - Cashier ko Admin panel me wapas jane ka option nahi dikhega
  const posLinks = [
    { name: "Terminal", href: "/pos/billing", icon: "🧾" },
    { name: "Customers", href: "/pos/customers", icon: "👥" },
    { name: "Cashier", href: "#", icon: "👤" },
    { name: "Orders", href: "/pos/orders", icon: "📋" },
    ...(currentUser.role === "SuperAdmin" || currentUser.role === "Admin"
      ? [{ name: "Admin", href: "/", icon: "⚙️" }]
      : []),
  ];

  return (
    <html lang="en" className={darkMode ? "dark" : ""}>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200 flex h-screen overflow-hidden">
        {/* MOBILE MENU OVERLAY */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* WIDE ADMIN SIDEBAR (Responsive) */}
        {!isPosPage && (
          <aside
            className={`absolute md:relative w-64 h-full bg-blue-700 dark:bg-gray-900 text-white flex flex-col shadow-xl z-40 flex-shrink-0 transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          >
            <div className="p-5 border-b border-blue-600 dark:border-gray-800 flex justify-between items-center">
              <h1 className="font-black text-xl tracking-wider text-center">
                Sanskar Tech
              </h1>
              <button
                className="md:hidden text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
              {adminLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive ? "bg-white text-blue-700 dark:bg-gray-800 dark:text-white shadow-md" : "hover:bg-blue-600 dark:hover:bg-gray-800 text-blue-100 dark:text-gray-300 hover:text-white"}`}
                  >
                    <span className="text-lg">{link.icon}</span>
                    {link.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-blue-600 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs text-blue-200">v1.0.0</span>
              <button
                onClick={handleLogout}
                className="text-xs bg-blue-800 px-3 py-1.5 rounded-lg hover:bg-red-500 transition font-bold"
              >
                Logout
              </button>
            </div>
          </aside>
        )}

        {/* NARROW POS SIDEBAR (Responsive) */}
        {isPosPage && (
          <aside
            className={`absolute md:relative w-[85px] h-full bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 flex flex-col border-r dark:border-gray-800 z-40 flex-shrink-0 transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          >
            <div className="h-[60px] flex items-center justify-between px-2 border-b dark:border-gray-800 shrink-0">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mx-auto md:mx-0">
                ST
              </span>
              <button
                className="md:hidden text-gray-500 absolute right-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 flex flex-col items-center gap-4 no-scrollbar">
              {posLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex flex-col items-center justify-center w-[70px] h-[65px] rounded-xl transition-all gap-1 ${isActive ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 border border-orange-200" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"}`}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className="text-[10px] font-bold text-center leading-tight px-1">
                      {link.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="py-4 border-t dark:border-gray-800 flex flex-col items-center gap-3 shrink-0">
              <button
                onClick={handleLogout}
                className="flex flex-col items-center text-gray-500 hover:text-red-500 transition-colors"
              >
                <span className="text-lg">🚪</span>
                <span className="text-[9px] font-bold mt-1">Logout</span>
              </button>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">
          <header className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 px-4 py-2 sm:py-3 flex justify-between items-center z-10 flex-shrink-0 h-[60px]">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Hamburger Menu for Mobile */}
              <button
                className="md:hidden p-2 bg-gray-100 dark:bg-gray-800 rounded-md"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                ☰
              </button>

              {!isPosPage ? (
                <span className="hidden sm:inline font-bold text-gray-600 dark:text-gray-300 text-sm">
                  Workspace /{" "}
                  {pathname === "/"
                    ? "Dashboard"
                    : pathname.replace("/", "").charAt(0).toUpperCase() +
                      pathname.slice(2)}
                </span>
              ) : (
                <div className="relative hidden lg:block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search POS..."
                    className="pl-9 pr-4 py-1.5 w-64 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 max-w-[120px] sm:max-w-none overflow-hidden">
                <span className="hidden sm:inline text-xs font-bold text-blue-700 dark:text-blue-400">
                  🏢 Store:
                </span>
                {currentUser?.assignedStores?.length > 1 ? (
                  <select
                    value={activeStoreId}
                    onChange={handleStoreChange}
                    className="bg-transparent text-xs font-bold text-blue-800 dark:text-blue-300 outline-none cursor-pointer truncate"
                  >
                    {currentUser.assignedStores.map((store) => (
                      <option key={store._id} value={store._id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 truncate">
                    {currentUser?.assignedStores?.[0]?.name ||
                      "No Store Assigned"}
                  </span>
                )}
              </div>

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1 hidden sm:block"></div>

              <div className="hidden sm:flex items-center gap-2 mr-2">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 leading-tight">
                    {currentUser.name.split(" ")[0]}
                  </span>
                  <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 leading-tight">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <button
                onClick={toggleFullscreen}
                className="hidden sm:block bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                title="Fullscreen"
              >
                {isFullscreen ? "🗗" : "⛶"}
              </button>
              <button
                onClick={toggleDarkMode}
                className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                title="Toggle Theme"
              >
                {darkMode ? "☀️" : "🌙"}
              </button>
            </div>
          </header>

          <main
            className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 ${isPosPage ? "p-0" : "p-4 md:p-6"}`}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
