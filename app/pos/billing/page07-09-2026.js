"use client";
import { useState, useEffect } from "react";

export default function BillingPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState("");

  // Filtering & Search states
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Custom Fee states
  const [customFees, setCustomFees] = useState([]);
  const [feeName, setFeeName] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [showFeeModal, setShowFeeModal] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Customer selection & search states
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState({
    name: "",
    phone: "",
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Quick Add Customer Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [paymentMode, setPaymentMode] = useState("Cash");

  // Header-style Auto-hide Toast Notification State
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Custom Print Confirmation Modal State & Print Data Backup
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOrderData, setPrintOrderData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const pRes = await fetch("/api/products");
    const pData = await pRes.json();
    if (pData.success) setProducts(pData.data);

    const catRes = await fetch("/api/categories");
    const catData = await catRes.json();
    if (catData.success) setCategories(catData.data);

    const coupRes = await fetch("/api/coupons");
    const coupData = await coupRes.json();
    if (coupData.success) setCoupons(coupData.data);

    const cRes = await fetch("/api/customers");
    const cData = await cRes.json();
    if (cData.success) setCustomers(cData.data);
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      showToast("Product is out of stock!", "error");
      return;
    }
    const existing = cart.find((item) => item._id === product._id);
    if (existing) {
      if (existing.qty >= product.stock) {
        showToast("Cannot add more than available stock!", "error");
        return;
      }
      setCart(
        cart.map((item) =>
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const handleScan = (e) => {
    e.preventDefault();
    const product = products.find((p) => p.barcode === barcode.trim());
    if (product) {
      addToCart(product);
      setBarcode("");
    } else {
      showToast("Product with this barcode not found!", "error");
    }
  };

  const updateQty = (id, delta) => {
    const product = products.find((p) => p._id === id);
    setCart(
      cart
        .map((item) => {
          if (item._id === id) {
            const newQty = item.qty + delta;
            if (delta > 0 && product && newQty > product.stock) {
              showToast("Stock limit reached!", "error");
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean),
    );
  };

  const removeFromCart = (id) =>
    setCart(cart.filter((item) => item._id !== id));

  // Add Custom Fee Handler
  const handleAddCustomFee = (e) => {
    e.preventDefault();
    if (!feeName || !feeAmount)
      return showToast("Please enter fee name and amount!", "error");

    setCustomFees([
      ...customFees,
      { name: feeName, amount: Number(feeAmount) },
    ]);
    setFeeName("");
    setFeeAmount("");
    setShowFeeModal(false);
    showToast("Custom fee added successfully!", "success");
  };

  const removeCustomFee = (index) => {
    setCustomFees(customFees.filter((_, i) => i !== index));
  };

  // Quick Add Customer Submission Handler
  const handleQuickAddCustomer = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCust),
    });
    const data = await res.json();

    if (res.ok) {
      showToast("Customer added successfully!", "success");
      setCustomers([data.data, ...customers]);
      setSelectedCustomer({ name: data.data.name, phone: data.data.phone });
      setShowAddModal(false);
      setNewCust({ name: "", phone: "", email: "", address: "" });
      setCustomerSearch("");
    } else {
      showToast(data.error || "Failed to add customer", "error");
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch),
  );

  // Active category object for subcategories list
  const activeCategoryObj = categories.find(
    (cat) => cat.name === selectedCategory,
  );
  const currentSubcategories = activeCategoryObj
    ? activeCategoryObj.subcategories || []
    : [];

  // Filter products by category, subcategory, and search query
  const filteredProducts = products.filter((p) => {
    let matchesCategory =
      selectedCategory === "All" || p.category === selectedCategory;
    let matchesSubcategory =
      selectedSubcategory === "All" || p.subcategory === selectedSubcategory;
    let matchesSearch =
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(productSearchQuery.toLowerCase());
    return matchesCategory && matchesSubcategory && matchesSearch;
  });

  const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalTax = cart.reduce(
    (sum, item) => sum + ((item.price * (item.gst || 0)) / 100) * item.qty,
    0,
  );
  const totalCustomFees = customFees.reduce((sum, fee) => sum + fee.amount, 0);

  // Coupon Apply Logic
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const found = coupons.find(
      (c) => c.code === couponCode.trim().toUpperCase(),
    );
    if (!found) {
      showToast("Invalid Coupon Code!", "error");
      return;
    }

    if (found.minOrderAmount && subTotal < found.minOrderAmount) {
      showToast(
        `Minimum order amount of ₹${found.minOrderAmount} required for this coupon!`,
        "error",
      );
      return;
    }

    setAppliedCoupon(found);
    showToast(`Coupon "${found.code}" applied successfully!`, "success");
    setCouponCode("");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Calculate Discount Amount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.applyOn === "all") {
      discountAmount =
        appliedCoupon.discountType === "percentage"
          ? (subTotal * appliedCoupon.discountValue) / 100
          : appliedCoupon.discountValue;
    } else if (appliedCoupon.applyOn === "category") {
      const eligibleSubTotal = cart
        .filter((item) => item.category === appliedCoupon.targetName)
        .reduce((sum, item) => sum + item.price * item.qty, 0);

      discountAmount =
        appliedCoupon.discountType === "percentage"
          ? (eligibleSubTotal * appliedCoupon.discountValue) / 100
          : Math.min(eligibleSubTotal, appliedCoupon.discountValue);
    } else if (appliedCoupon.applyOn === "subcategory") {
      const eligibleSubTotal = cart
        .filter((item) => item.subcategory === appliedCoupon.targetName)
        .reduce((sum, item) => sum + item.price * item.qty, 0);

      discountAmount =
        appliedCoupon.discountType === "percentage"
          ? (eligibleSubTotal * appliedCoupon.discountValue) / 100
          : Math.min(eligibleSubTotal, appliedCoupon.discountValue);
    } else if (appliedCoupon.applyOn === "product") {
      const eligibleSubTotal = cart
        .filter((item) => item.name === appliedCoupon.targetName)
        .reduce((sum, item) => sum + item.price * item.qty, 0);

      discountAmount =
        appliedCoupon.discountType === "percentage"
          ? (eligibleSubTotal * appliedCoupon.discountValue) / 100
          : Math.min(eligibleSubTotal, appliedCoupon.discountValue);
    }
  }

  const grandTotal = Math.max(
    0,
    subTotal + totalTax + totalCustomFees - discountAmount,
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return showToast("Cart is empty!", "error");
    if (!selectedCustomer.name || !selectedCustomer.phone)
      return showToast("Please select a customer for billing!", "error");

    // Backup order data for printing before clearing cart
    const orderSnapshot = {
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      items: [...cart],
      subTotal,
      totalTax,
      customFees: [...customFees],
      discountAmount,
      totalAmount: grandTotal,
      paymentMode,
      date: new Date().toLocaleString(),
    };

    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: orderSnapshot.customerName,
        customerPhone: orderSnapshot.customerPhone,
        items: orderSnapshot.items,
        subTotal: orderSnapshot.subTotal,
        totalTax: orderSnapshot.totalTax,
        customFees: orderSnapshot.customFees,
        discountAmount: orderSnapshot.discountAmount,
        totalAmount: orderSnapshot.totalAmount,
        paymentMode: orderSnapshot.paymentMode,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
      }),
    });

    if (res.ok) {
      showToast("Order successfully saved to records!", "success");

      setPrintOrderData(orderSnapshot); // Save snapshot for printing

      setCart([]);
      setCustomFees([]);
      setSelectedCustomer({ name: "", phone: "" });
      setCustomerSearch("");
      setPaymentMode("Cash");
      setAppliedCoupon(null);

      const pRes = await fetch("/api/products");
      const pData = await pRes.json();
      if (pData.success) setProducts(pData.data);

      setShowPrintModal(true);
    } else {
      showToast("Checkout failed. Please try again.", "error");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 sm:p-4 min-h-screen lg:h-[91vh] bg-gray-100 dark:bg-gray-950 lg:overflow-hidden transition-colors duration-200 relative">
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

      {/* Left: Inventory Catalog Grid with Search & Category Filters */}
      <div className="w-full lg:w-7/12 flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 h-[65vh] lg:h-full overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80 flex flex-col gap-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Products Catalog
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Product Search Input */}
              <input
                type="text"
                placeholder="🔍 Search product..."
                className="border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-medium w-full sm:w-48 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
              />
              <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap">
                {filteredProducts.length} Items
              </span>
            </div>
          </div>

          {/* Main Category Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSelectedSubcategory("All");
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === "All"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setSelectedSubcategory("All");
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.name
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Subcategory Filter Tabs */}
          {currentSubcategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1 border-t border-gray-200/60 dark:border-gray-800 no-scrollbar items-center">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase whitespace-nowrap">
                Subcategory:
              </span>
              <button
                onClick={() => setSelectedSubcategory("All")}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedSubcategory === "All"
                    ? "bg-gray-800 dark:bg-gray-700 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                All
              </button>
              {currentSubcategories.map((sub, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedSubcategory === sub
                      ? "bg-gray-800 dark:bg-gray-700 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Cards Scrollable Area */}
        <div className="p-4 flex-grow overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p._id}
                onClick={() => addToCart(p)}
                className={`relative border dark:border-gray-800 rounded-2xl p-3 cursor-pointer transition-all bg-white dark:bg-gray-800 flex flex-col items-center text-center group ${
                  p.stock <= 0
                    ? "opacity-50 bg-gray-50 dark:bg-gray-900 pointer-events-none"
                    : "hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500 hover:-translate-y-0.5"
                }`}
              >
                <div
                  className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                    p.stock > 0
                      ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
                      : "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300"
                  }`}
                >
                  {p.stock > 0 ? `Stock: ${p.stock}` : "Out of Stock"}
                </div>
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-20 w-full object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="h-20 w-full bg-gray-50 dark:bg-gray-900 rounded-xl mb-2 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs font-medium">
                    No Image
                  </div>
                )}
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate w-full">
                  {p.name}
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate w-full">
                  {p.category || "General"}{" "}
                  {p.subcategory ? `/ ${p.subcategory}` : ""}
                </p>
                <p className="font-black text-blue-600 dark:text-blue-400 mt-1">
                  ₹{p.price}
                </p>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-400 dark:text-gray-500 font-medium">
                No products found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: POS Cart, Custom Fee, Customer Search & Checkout Section */}
      <div className="w-full lg:w-5/12 flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 h-[70vh] lg:h-full relative">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80 rounded-t-2xl flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Current Order
          </h2>
          <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold">
            {cart.length} Items
          </span>
        </div>

        <div className="p-3 border-b border-gray-200 dark:border-gray-800 space-y-2.5 bg-gray-50/30 dark:bg-gray-800/30 flex-shrink-0 relative z-30">
          {/* Customer Selection */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                Customer *
              </label>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                + Add New Customer
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Type customer name or phone..."
                className="border border-gray-200 dark:border-gray-700 p-2.5 w-full rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                value={
                  selectedCustomer.name
                    ? `${selectedCustomer.name} (${selectedCustomer.phone})`
                    : customerSearch
                }
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setSelectedCustomer({ name: "", phone: "" });
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
              />
              {selectedCustomer.name && (
                <button
                  onClick={() => {
                    setSelectedCustomer({ name: "", phone: "" });
                    setCustomerSearch("");
                  }}
                  className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-red-600 font-bold text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"
                >
                  Change
                </button>
              )}
            </div>

            {/* Fixed Dropdown with Proper Dark Theme & High Z-Index */}
            {isDropdownOpen && !selectedCustomer.name && (
              <div className="absolute left-3 right-3 z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <div
                      key={c._id}
                      onClick={() => {
                        setSelectedCustomer({ name: c.name, phone: c.phone });
                        setCustomerSearch("");
                        setIsDropdownOpen(false);
                      }}
                      className="p-3 hover:bg-blue-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition text-sm"
                    >
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {c.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        📞 {c.phone}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                      No customer found.
                    </p>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setShowAddModal(true);
                      }}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700"
                    >
                      + Add &quot;{customerSearch}&quot;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleScan}>
            <input
              type="text"
              placeholder="⚡ Scan Barcode & Press Enter..."
              className="border border-gray-200 dark:border-gray-700 p-2.5 w-full rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium shadow-sm"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </form>
        </div>

        {/* Cart Items Scrollable Area */}
        <div className="flex-grow overflow-y-auto p-3 space-y-2.5 min-h-[120px]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-6">
              <span className="text-3xl mb-1">🛒</span>
              <p className="text-xs font-medium">
                Cart is empty. Select products.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const itemGst = item.gst || 0;
              const itemTotal =
                (item.price + (item.price * itemGst) / 100) * item.qty;

              return (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2.5 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition gap-2"
                >
                  <div className="flex gap-2.5 items-center min-w-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        className="h-9 w-9 rounded-lg object-cover border dark:border-gray-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 bg-gray-100 dark:bg-gray-800 rounded-lg flex-shrink-0"></div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        ₹{item.price} + {itemGst}% GST
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="flex items-center border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQty(item._id, -1)}
                        className="px-2 py-0.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="px-2 font-bold text-xs border-l border-r dark:border-gray-700 text-gray-800 dark:text-gray-200">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item._id, 1)}
                        className="px-2 py-0.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right min-w-[55px]">
                      <p className="font-extrabold text-gray-800 dark:text-gray-200 text-xs">
                        ₹{itemTotal.toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item._id)}
                      className="text-red-400 hover:text-red-600 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Fixed Checkout, Custom Fee & Coupon Bottom Box */}
        <div className="bg-gray-50 dark:bg-gray-800/90 p-3.5 border-t border-gray-200 dark:border-gray-800 space-y-2.5 flex-shrink-0">
          {/* Custom Fee & Coupon Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFeeModal(true)}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
            >
              + Add Fee
            </button>

            {!appliedCoupon ? (
              <form
                onSubmit={handleApplyCoupon}
                className="flex gap-1 flex-grow"
              >
                <input
                  type="text"
                  placeholder="Coupon Code"
                  className="border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-mono font-bold uppercase outline-none w-full focus:ring-2 focus:ring-blue-500 shadow-sm"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow whitespace-nowrap"
                >
                  Apply
                </button>
              </form>
            ) : (
              <div className="flex justify-between items-center bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 px-2.5 py-1.5 rounded-xl text-xs flex-grow">
                <span className="font-bold text-green-700 dark:text-green-300 truncate">
                  🏷️ {appliedCoupon.code}
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-red-500 font-bold hover:underline ml-2"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="space-y-0.5 text-xs text-gray-600 dark:text-gray-400 pt-1 border-t dark:border-gray-700">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (GST):</span>
              <span className="font-semibold">₹{totalTax.toFixed(2)}</span>
            </div>
            {customFees.map((fee, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-blue-600 dark:text-blue-400"
              >
                <span>{fee.name}:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    ₹{fee.amount.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomFee(idx)}
                    className="text-red-400 hover:text-red-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                <span>Discount:</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t dark:border-gray-700 pt-1.5">
            <span className="font-bold text-gray-700 dark:text-gray-300 text-xs">
              Payment Mode:
            </span>
            <select
              className="border border-gray-200 dark:border-gray-700 p-1.5 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold outline-none text-xs shadow-sm"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="Cash">💵 Cash</option>
              <option value="UPI">📱 UPI</option>
              <option value="Card">💳 Card</option>
            </select>
          </div>

          <div className="flex justify-between items-center text-xl font-black text-gray-800 dark:text-gray-100">
            <span>Total:</span>
            <span className="text-green-600 dark:text-green-400">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-base font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
          >
            Checkout & Save Order
          </button>
        </div>
      </div>

      {/* ADD CUSTOM FEE MODAL */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Add Custom Fee
              </h3>
              <button
                type="button"
                onClick={() => setShowFeeModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomFee} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Fee Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Packaging / Delivery Fee"
                  className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl w-full text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  value={feeName}
                  onChange={(e) => setFeeName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl w-full text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-3 border-t dark:border-gray-800">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition"
                >
                  Add Fee
                </button>
                <button
                  type="button"
                  onClick={() => setShowFeeModal(false)}
                  className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-bold text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Quick Add Customer
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amit Kumar"
                  className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl w-full text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  value={newCust.name}
                  onChange={(e) =>
                    setNewCust({ ...newCust, name: e.target.value })
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
                  className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl w-full text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  value={newCust.phone}
                  onChange={(e) =>
                    setNewCust({ ...newCust, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. amit@gmail.com"
                  className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl w-full text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCust.email}
                  onChange={(e) =>
                    setNewCust({ ...newCust, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Address / City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lalganj Ajhara"
                  className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl w-full text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCust.address}
                  onChange={(e) =>
                    setNewCust({ ...newCust, address: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 pt-3 border-t dark:border-gray-800">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition"
                >
                  Save & Select
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-bold text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM PRINT CONFIRMATION MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleUp text-center">
            <div className="text-4xl mb-2">🖨️</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
              Print Receipt?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Order saved successfully! Would you like to print the receipt now?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setTimeout(() => {
                    window.print();
                  }, 250);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm shadow transition"
              >
                Yes, Print
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-bold text-sm transition"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Thermal Print Receipt (Mapped from printOrderData snapshot) */}
      {printOrderData && (
        <div
          id="printable-receipt"
          className="hidden print:block bg-white text-black p-4"
        >
          <h2 className="text-center font-bold text-xl mb-1">
            Sanskar Tech POS
          </h2>
          <p className="text-center text-xs mb-4">Lalganj Ajhara</p>

          <div className="text-xs mb-2 border-b border-black pb-2">
            <p>
              <strong>Customer:</strong>{" "}
              {printOrderData.customerName || "Walk-in"}
            </p>
            <p>
              <strong>Phone:</strong> {printOrderData.customerPhone || "-"}
            </p>
            <p>
              <strong>Pay Mode:</strong> {printOrderData.paymentMode}
            </p>
            <p>
              <strong>Date:</strong> {printOrderData.date}
            </p>
          </div>

          <table className="w-full text-left text-xs mb-4 border-b border-black pb-2">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th className="text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              {printOrderData.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-1">{item.name}</td>
                  <td>{item.qty}</td>
                  <td className="text-right">
                    ₹
                    {(
                      (item.price + (item.price * (item.gst || 0)) / 100) *
                      item.qty
                    ).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-xs text-right mb-4 space-y-1">
            <p>Subtotal: ₹{printOrderData.subTotal.toFixed(2)}</p>
            <p>Tax: ₹{printOrderData.totalTax.toFixed(2)}</p>
            {printOrderData.customFees.map((fee, idx) => (
              <p key={idx}>
                {fee.name}: ₹{fee.amount.toFixed(2)}
              </p>
            ))}
            {printOrderData.discountAmount > 0 && (
              <p>Discount: -₹{printOrderData.discountAmount.toFixed(2)}</p>
            )}
            <p className="font-bold text-sm mt-1">
              Total: ₹{printOrderData.totalAmount.toFixed(2)}
            </p>
          </div>
          <p className="text-center text-xs italic">Thank you for visiting!</p>
        </div>
      )}
    </div>
  );
}
