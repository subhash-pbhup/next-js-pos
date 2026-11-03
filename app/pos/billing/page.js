"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export default function BillingPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState("");

  const barcodeInputRef = useRef(null);
  const customerDropdownRef = useRef(null);

  const MERCHANT_UPI_ID = "8178360198@upi";
  const MERCHANT_NAME = "Sanskar Tech Academy";

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Variant States
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariantProduct, setSelectedVariantProduct] = useState(null);

  const [customFees, setCustomFees] = useState([]);
  const [feeName, setFeeName] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [showFeeModal, setShowFeeModal] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState({
    name: "",
    phone: "",
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [cashReceived, setCashReceived] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOrderData, setPrintOrderData] = useState(null);

  const [heldOrders, setHeldOrders] = useState([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  }, []);

  const getVariantLabel = (v) => {
    if (!v) return "";
    const parts = [v.color, v.size].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : v.sku || "Default Variant";
  };

  const fetchData = useCallback(async () => {
    try {
      const [pRes, catRes, coupRes, cRes] = await Promise.all([
        fetch(`/api/products?_t=${Date.now()}`),
        fetch("/api/categories"),
        fetch("/api/coupons"),
        fetch("/api/customers"),
      ]);

      const [pData, catData, coupData, cData] = await Promise.all([
        pRes.json(),
        catRes.json(),
        coupRes.json(),
        cRes.json(),
      ]);

      if (pData.success) setProducts(pData.data || []);
      if (catData.success) setCategories(catData.data || []);
      if (coupData.success) setCoupons(coupData.data || []);
      if (cData.success) setCustomers(cData.data || []);
    } catch (err) {
      console.error("Failed to fetch initial POS data", err);
      showToast("Error loading system data!", "error");
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
    barcodeInputRef.current?.focus();
  }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getEffectiveQty = (item) => {
    if (item.selectedUnit === "Gram") {
      return (parseFloat(item.qty) || 0) / 1000;
    }
    return parseFloat(item.qty) || 0;
  };

  const subTotal = cart.reduce((sum, item) => {
    const effQty = getEffectiveQty(item);
    return sum + (item.price || 0) * effQty;
  }, 0);

  const totalTax = cart.reduce((sum, item) => {
    const effQty = getEffectiveQty(item);
    return sum + (((item.price || 0) * (item.gst || 0)) / 100) * effQty;
  }, 0);

  const totalCustomFees = customFees.reduce(
    (sum, fee) => sum + (fee.amount || 0),
    0,
  );

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.applyOn === "all") {
      discountAmount =
        appliedCoupon.discountType === "percentage"
          ? (subTotal * appliedCoupon.discountValue) / 100
          : Math.min(subTotal, appliedCoupon.discountValue);
    } else if (appliedCoupon.applyOn === "category") {
      const eligibleSubTotal = cart
        .filter((item) => item.category === appliedCoupon.targetName)
        .reduce((sum, item) => sum + item.price * getEffectiveQty(item), 0);

      discountAmount =
        appliedCoupon.discountType === "percentage"
          ? (eligibleSubTotal * appliedCoupon.discountValue) / 100
          : Math.min(eligibleSubTotal, appliedCoupon.discountValue);
    } else if (appliedCoupon.applyOn === "subcategory") {
      const eligibleSubTotal = cart
        .filter((item) => item.subcategory === appliedCoupon.targetName)
        .reduce((sum, item) => sum + item.price * getEffectiveQty(item), 0);

      discountAmount =
        appliedCoupon.discountType === "percentage"
          ? (eligibleSubTotal * appliedCoupon.discountValue) / 100
          : Math.min(eligibleSubTotal, appliedCoupon.discountValue);
    } else if (appliedCoupon.applyOn === "product") {
      const eligibleSubTotal = cart
        .filter((item) => item.name === appliedCoupon.targetName)
        .reduce((sum, item) => sum + item.price * getEffectiveQty(item), 0);

      discountAmount =
        appliedCoupon.discountType === "percentage"
          ? (eligibleSubTotal * appliedCoupon.discountValue) / 100
          : Math.min(eligibleSubTotal, appliedCoupon.discountValue);
    }
  }

  const exactPayable = Math.max(
    0,
    subTotal + totalTax + totalCustomFees - discountAmount,
  );
  const grandTotal = Math.round(exactPayable);
  const roundOffAmount = grandTotal - exactPayable;

  const changeToReturn = Math.max(
    0,
    (parseFloat(cashReceived) || 0) - grandTotal,
  );

  const initiateCheckout = useCallback(() => {
    if (cart.length === 0) return showToast("Cart is empty!", "error");
    if (!selectedCustomer.name || !selectedCustomer.phone)
      return showToast("Please select a customer for billing!", "error");

    setCashReceived(grandTotal.toString());
    setShowPaymentModal(true);
  }, [cart, selectedCustomer, grandTotal, showToast]);

  const addToCart = useCallback(
    (product, variant = null) => {
      if (!variant && product.hasVariants && product.variants?.length > 0) {
        setSelectedVariantProduct(product);
        setShowVariantModal(true);
        return;
      }

      const variantKey = variant
        ? variant.sku || `${variant.color || ""}_${variant.size || ""}`
        : null;

      const variantLabel = variant ? getVariantLabel(variant) : "";

      const effectiveImage = variant?.image || product.image || "";

      // Warranty Details injection mapping
      const target = variant
        ? {
            _id: `${product._id}_${variantKey || Math.random()}`,
            productId: product._id,
            variantId: variantKey,
            name: `${product.name} (${variantLabel})`,
            price: Number(variant.price) || 0,
            costPrice: Number(variant.costPrice) || 0,
            stock: Number(variant.stock) || 0,
            unit: product.unit || "Pcs",
            gst: product.gst || 0,
            image: effectiveImage,
            barcode: variant.sku || product.barcode,
            category: product.category || "",
            subcategory: product.subcategory || "",
            hasWarranty: Boolean(product.hasWarranty),
            warrantyMonths: Number(product.warrantyMonths) || 0,
            serialNumber: "",
          }
        : {
            ...product,
            productId: product._id,
            variantId: null,
            price: Number(product.price) || 0,
            stock: Number(product.stock) || 0,
            image: effectiveImage,
            hasWarranty: Boolean(product.hasWarranty),
            warrantyMonths: Number(product.warrantyMonths) || 0,
            serialNumber: "",
          };

      if (target.stock <= 0) {
        showToast("Item is out of stock!", "error");
        return;
      }

      const isKgUnit = target.unit?.toLowerCase() === "kg";

      setCart((prev) => {
        const existing = prev.find((item) => item._id === target._id);

        if (existing) {
          const addedQty = existing.selectedUnit === "Gram" ? 100 : 1;
          const currentEff = getEffectiveQty(existing);
          const addedEff = existing.selectedUnit === "Gram" ? 0.1 : 1;

          if (currentEff + addedEff > target.stock) {
            showToast(`Stock limit reached! Max: ${target.stock}`, "error");
            return prev;
          }

          return prev.map((item) =>
            item._id === target._id
              ? { ...item, qty: item.qty + addedQty }
              : item,
          );
        }

        return [
          ...prev,
          {
            ...target,
            qty: 1,
            selectedUnit: isKgUnit ? "Kg" : target.unit || "Pcs",
          },
        ];
      });

      showToast(`Added: ${target.name}`, "success");
    },
    [showToast],
  );

  // Function to update serial number dynamically for an item
  const updateItemSN = (id, sn) => {
    setCart((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, serialNumber: sn } : item,
      ),
    );
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowFeeModal(false);
        setShowAddModal(false);
        setShowPaymentModal(false);
        setShowHeldModal(false);
        setShowPrintModal(false);
        setShowVariantModal(false);
        setIsDropdownOpen(false);
      }
      if (e.key === "F2" && cart.length > 0 && selectedCustomer.name) {
        e.preventDefault();
        initiateCheckout();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, selectedCustomer, initiateCheckout]);

  // Barcode Scanner Listener
  useEffect(() => {
    let scannedCode = "";
    let timer = null;

    const handleGlobalKeyDown = (e) => {
      const activeElement = document.activeElement;

      if (
        activeElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName) &&
        activeElement !== barcodeInputRef.current
      ) {
        return;
      }

      if (e.key === "Enter") {
        if (scannedCode.trim().length > 0) {
          const code = scannedCode.trim();

          let foundProduct = products.find((p) => p.barcode === code);
          let foundVariant = null;

          if (!foundProduct) {
            for (const p of products) {
              if (p.hasVariants && p.variants) {
                const v = p.variants.find((variant) => variant.sku === code);
                if (v) {
                  foundProduct = p;
                  foundVariant = v;
                  break;
                }
              }
            }
          }

          if (foundProduct) {
            addToCart(foundProduct, foundVariant);
          } else {
            showToast("Product/Variant with this barcode not found!", "error");
          }
          scannedCode = "";
          setBarcode("");
        }
      } else if (e.key.length === 1) {
        scannedCode += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => {
          scannedCode = "";
        }, 100);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      clearTimeout(timer);
    };
  }, [products, addToCart, showToast]);

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setCustomFees([]);
    setAppliedCoupon(null);
    showToast("Cart cleared successfully!", "success");
  };

  const openAddCustomerModal = (query = "") => {
    const trimmed = query.trim();
    const isNumeric = /^\d+$/.test(trimmed);

    setNewCust({
      name: isNumeric ? "" : trimmed,
      phone: isNumeric ? trimmed : "",
      email: "",
      address: "",
    });
    setIsDropdownOpen(false);
    setShowAddModal(true);
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) {
      showToast(
        "Cart empty hai! Hold karne ke liye items add karein.",
        "error",
      );
      return;
    }

    const newHeldOrder = {
      id: Date.now(),
      cart: [...cart],
      selectedCustomer: { ...selectedCustomer },
      customFees: [...customFees],
      appliedCoupon,
      grandTotal,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setHeldOrders((prev) => [newHeldOrder, ...prev]);
    setCart([]);
    setCustomFees([]);
    setSelectedCustomer({ name: "", phone: "" });
    setCustomerSearch("");
    setAppliedCoupon(null);
    showToast("Order hold / park ho gaya!", "success");
  };

  const handleRestoreHeldOrder = (order) => {
    if (cart.length > 0) {
      if (
        !confirm(
          "Current cart me items hain. Kya aap inhein replace karke held order load karna chahte hain?",
        )
      ) {
        return;
      }
    }

    setCart(order.cart);
    setSelectedCustomer(order.selectedCustomer);
    setCustomerSearch("");
    setCustomFees(order.customFees);
    setAppliedCoupon(order.appliedCoupon);
    setHeldOrders((prev) => prev.filter((item) => item.id !== order.id));
    setShowHeldModal(false);
    showToast("Held order restore ho gaya!", "success");
  };

  const handleDeleteHeldOrder = (id) => {
    setHeldOrders((prev) => prev.filter((item) => item.id !== id));
    showToast("Held order remove ho gaya!", "success");
  };

  const loadRazorpaySDK = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleScan = (e) => {
    e.preventDefault();
    const query = barcode.trim();
    if (!query) return;

    let foundProduct = products.find((p) => p.barcode === query);
    let foundVariant = null;

    if (!foundProduct) {
      for (const p of products) {
        if (p.hasVariants && p.variants) {
          const v = p.variants.find((variant) => variant.sku === query);
          if (v) {
            foundProduct = p;
            foundVariant = v;
            break;
          }
        }
      }
    }

    if (foundProduct) {
      addToCart(foundProduct, foundVariant);
      setBarcode("");
    } else {
      showToast("Product/Variant not found!", "error");
    }
    barcodeInputRef.current?.focus();
  };

  const handleUnitToggle = (id, newUnit) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item._id === id) {
          let newQty = item.qty;
          if (newUnit === "Gram" && item.selectedUnit === "Kg") {
            newQty = item.qty * 1000;
          } else if (newUnit === "Kg" && item.selectedUnit === "Gram") {
            newQty = item.qty / 1000;
          }
          return { ...item, selectedUnit: newUnit, qty: newQty };
        }
        return item;
      }),
    );
  };

  const updateQty = (id, delta) => {
    const item = cart.find((i) => i._id === id);
    if (!item) return;

    const newQty = Math.max(0, item.qty + delta);
    const effQty = item.selectedUnit === "Gram" ? newQty / 1000 : newQty;

    if (delta > 0 && item.stock && effQty > item.stock) {
      showToast(`Stock limit reached! Max: ${item.stock}`, "error");
      return;
    }

    setCart((prev) =>
      prev
        .map((i) => {
          if (i._id === id) {
            return newQty > 0 ? { ...i, qty: newQty } : null;
          }
          return i;
        })
        .filter(Boolean),
    );
  };

  const setDirectQty = (id, newQty) => {
    const val = parseFloat(newQty) || 0;
    const item = cart.find((i) => i._id === id);
    if (!item) return;

    const effQty = item.selectedUnit === "Gram" ? val / 1000 : val;
    if (item.stock && effQty > item.stock) {
      showToast(`Quantity exceeds stock! Max: ${item.stock}`, "error");
      return;
    }

    if (val <= 0) {
      removeFromCart(id);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((i) => (i._id === id ? { ...i, qty: val } : i)),
    );
  };

  const removeFromCart = (id) =>
    setCart((prevCart) => prevCart.filter((item) => item._id !== id));

  const handleAddCustomFee = (e) => {
    e.preventDefault();
    if (!feeName || !feeAmount)
      return showToast("Please enter fee name and amount!", "error");

    setCustomFees((prev) => [
      ...prev,
      { name: feeName, amount: Number(feeAmount) },
    ]);
    setFeeName("");
    setFeeAmount("");
    setShowFeeModal(false);
    showToast("Custom fee added successfully!", "success");
  };

  const removeCustomFee = (index) => {
    setCustomFees((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCust),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Customer added successfully!", "success");
        setCustomers((prev) => [data.data, ...prev]);
        setSelectedCustomer({ name: data.data.name, phone: data.data.phone });
        setShowAddModal(false);
        setNewCust({ name: "", phone: "", email: "", address: "" });
        setCustomerSearch("");
      } else {
        showToast(data.error || "Failed to add customer", "error");
      }
    } catch {
      showToast("Error adding customer", "error");
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone || "").includes(customerSearch),
  );

  const activeCategoryObj = categories.find(
    (cat) => cat.name === selectedCategory,
  );
  const currentSubcategories = activeCategoryObj
    ? activeCategoryObj.subcategories || []
    : [];

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "All" || p.category === selectedCategory;
    const matchesSubcategory =
      selectedSubcategory === "All" || p.subcategory === selectedSubcategory;

    const matchesMainSearch =
      (p.name || "").toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      (p.barcode || "")
        .toLowerCase()
        .includes(productSearchQuery.toLowerCase());

    const matchesVariantSearch =
      p.hasVariants &&
      p.variants?.some(
        (v) =>
          (v.color || "")
            .toLowerCase()
            .includes(productSearchQuery.toLowerCase()) ||
          (v.size || "")
            .toLowerCase()
            .includes(productSearchQuery.toLowerCase()) ||
          (v.sku || "")
            .toLowerCase()
            .includes(productSearchQuery.toLowerCase()),
      );

    return (
      matchesCategory &&
      matchesSubcategory &&
      (matchesMainSearch || matchesVariantSearch)
    );
  });

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

  const upiPayUrl = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(
    MERCHANT_NAME,
  )}&am=${grandTotal.toFixed(2)}&cu=INR`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiPayUrl,
  )}`;

  const handleExecutePayment = () => {
    if (paymentMode === "Razorpay Gateway") {
      handleRazorpayPayment();
    } else {
      processFinalOrder();
    }
  };

  const handleRazorpayPayment = async () => {
    setIsProcessingPayment(true);
    const isSDKLoaded = await loadRazorpaySDK();

    if (!isSDKLoaded) {
      setIsProcessingPayment(false);
      showToast(
        "Razorpay SDK failed to load. Check internet connection.",
        "error",
      );
      return;
    }

    try {
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: grandTotal }),
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        setIsProcessingPayment(false);
        showToast(
          orderData.error || "Unable to initialize gateway order!",
          "error",
        );
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: MERCHANT_NAME,
        description: "POS Billing Counter Payment",
        order_id: orderData.order.id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch("/api/payment/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              showToast("Payment verified successfully!", "success");
              await processFinalOrder(response.razorpay_payment_id);
            } else {
              showToast("Payment verification failed!", "error");
              setIsProcessingPayment(false);
            }
          } catch {
            setIsProcessingPayment(false);
            showToast("Payment verification error!", "error");
          }
        },
        prefill: {
          name: selectedCustomer.name,
          contact: selectedCustomer.phone,
        },
        theme: { color: "#2563eb" },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
            showToast("Payment cancelled by cashier.", "error");
          },
        },
      };

      const razorpayObject = new window.Razorpay(options);
      razorpayObject.open();
    } catch {
      setIsProcessingPayment(false);
      showToast("Gateway error occurred!", "error");
    }
  };

  const processFinalOrder = async (txnIdOverride = null) => {
    setIsProcessingPayment(true);
    const finalTransactionId =
      txnIdOverride ||
      (paymentMode === "UPI / Online QR" ? transactionId : null);

    const formattedCartItems = cart.map((item) => ({
      // REMOVED `_id: item._id` SO MONGOOSE AUTO-GENERATES VALID OBJECTIDs
      productId: item.productId || String(item._id).split("_")[0],
      variantId: item.variantId || null,
      name: item.name,
      price: item.price,
      costPrice: item.costPrice || 0,
      qty: item.qty,
      effectiveQty: getEffectiveQty(item),
      unit: item.unit || "Pcs",
      selectedUnit: item.selectedUnit || item.unit || "Pcs",
      gst: item.gst || 0,
      image: item.image || "",
      category: item.category || "",
      barcode: item.barcode || "",
      returnedQty: 0,
      serialNumber: item.serialNumber || null,
      hasWarranty: Boolean(item.hasWarranty),
      warrantyMonths: Number(item.warrantyMonths) || 0,
    }));

    const orderSnapshot = {
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      items: formattedCartItems,
      subTotal,
      totalTax,
      customFees: [...customFees],
      discountAmount,
      roundOffAmount,
      totalAmount: grandTotal,
      paymentMode,
      cashReceived:
        paymentMode === "Cash"
          ? parseFloat(cashReceived) || grandTotal
          : grandTotal,
      changeToReturn: paymentMode === "Cash" ? changeToReturn : 0,
      transactionId: finalTransactionId,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      date: new Date().toLocaleString(),
    };

    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderSnapshot),
      });

      const resData = await res.json().catch(() => ({}));

      setIsProcessingPayment(false);

      if (res.ok && resData.success !== false) {
        showToast("Order successfully saved & Stock Deducted!", "success");

        setPrintOrderData(orderSnapshot);

        setCart([]);
        setCustomFees([]);
        setSelectedCustomer({ name: "", phone: "" });
        setCustomerSearch("");
        setPaymentMode("Cash");
        setAppliedCoupon(null);
        setTransactionId("");
        setCashReceived("");
        setShowPaymentModal(false);

        fetchData();
        setShowPrintModal(true);
        barcodeInputRef.current?.focus();
      } else {
        showToast(
          resData.error ||
            resData.message ||
            "Checkout failed. Insufficient stock.",
          "error",
        );
      }
    } catch {
      setIsProcessingPayment(false);
      showToast("Network error during order submission.", "error");
    }
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Main POS Interface */}
      <div className="print:hidden flex flex-col lg:flex-row gap-3 p-3 h-[calc(100vh-60px)] max-h-[calc(100vh-60px)] overflow-hidden bg-gray-100 dark:bg-gray-950 transition-colors duration-200 relative">
        {/* Toast Notification */}
        {toast.show && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300">
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

        {/* Left Column: Products Catalog */}
        <div className="w-full lg:w-7/12 flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 h-full overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80 flex flex-col gap-2.5 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Products Catalog
              </h2>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="🔍 Search product, sku or variant..."
                  className="border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-medium w-full sm:w-48 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                />
                <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap">
                  {filteredProducts.length} Items
                </span>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSelectedSubcategory("All");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.name
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Subcategory Tabs */}
            {currentSubcategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 pt-1 border-t border-gray-200/60 dark:border-gray-800 no-scrollbar items-center">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase whitespace-nowrap">
                  Subcategory:
                </span>
                <button
                  onClick={() => setSelectedSubcategory("All")}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
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
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
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

          {/* Product Grid */}
          <div className="p-3 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const hasVar = p.hasVariants && p.variants?.length > 0;
                const minPrice = hasVar
                  ? Math.min(...p.variants.map((v) => v.price || 0))
                  : p.price;
                const totalStock = hasVar
                  ? p.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
                  : p.stock;

                const displayImage =
                  p.image ||
                  (hasVar && p.variants.find((v) => v.image)?.image) ||
                  "";

                return (
                  <div
                    key={p._id}
                    onClick={() => addToCart(p)}
                    className={`relative border dark:border-gray-800 rounded-2xl p-2.5 cursor-pointer transition-all bg-white dark:bg-gray-800 flex flex-col items-center text-center group ${
                      totalStock <= 0
                        ? "opacity-50 bg-gray-50 dark:bg-gray-900 pointer-events-none"
                        : "hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500"
                    }`}
                  >
                    {hasVar && (
                      <span className="absolute top-2 left-2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 z-10">
                        {p.variants.length} Variants
                      </span>
                    )}

                    <div
                      className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 ${
                        totalStock > 0
                          ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300"
                      }`}
                    >
                      {totalStock > 0
                        ? `Stock: ${totalStock} ${p.unit || "Pcs"}`
                        : "Out of Stock"}
                    </div>

                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={p.name}
                        className="h-20 w-full object-cover rounded-xl mb-1.5 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-20 w-full bg-gray-50 dark:bg-gray-900 rounded-xl mb-1.5 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs font-medium">
                        📦 No Image
                      </div>
                    )}
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xs truncate w-full">
                      {p.name}
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate w-full">
                      {p.category || "General"}{" "}
                      {p.subcategory ? `/ ${p.subcategory}` : ""}
                    </p>
                    <p className="font-black text-blue-600 dark:text-blue-400 text-xs mt-0.5">
                      {hasVar ? `From ₹${minPrice}` : `₹${p.price}`}{" "}
                      <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
                        / {p.unit || "Pcs"}
                      </span>
                    </p>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 dark:text-gray-500 font-medium text-xs">
                  No products found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order & Billing Panel */}
        <div className="w-full lg:w-5/12 flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 h-full overflow-hidden relative">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80 rounded-t-2xl flex justify-between items-center flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Current Order
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowHeldModal(true)}
                className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-900/50 px-2 py-1 rounded-xl transition shadow-sm active:scale-95 flex items-center gap-1"
              >
                📋 Held ({heldOrders.length})
              </button>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleHoldOrder}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-900/50 px-2 py-1 rounded-xl transition shadow-sm active:scale-95 flex items-center gap-1"
                >
                  ⏸️ Hold
                </button>
              )}

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/50 px-2 py-1 rounded-xl transition shadow-sm active:scale-95"
                >
                  🗑️ Clear
                </button>
              )}
              <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                {cart.length} Items
              </span>
            </div>
          </div>

          <div className="p-2.5 border-b border-gray-200 dark:border-gray-800 space-y-2 bg-gray-50/30 dark:bg-gray-800/30 flex-shrink-0 relative z-30">
            <div ref={customerDropdownRef} className="relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                  Customer *
                </label>
                <button
                  onClick={() => openAddCustomerModal(customerSearch)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  + Add New Customer
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search customer name or phone..."
                  className="border border-gray-200 dark:border-gray-700 p-2 w-full rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-medium text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  value={
                    selectedCustomer.name
                      ? `${selectedCustomer.name} (${selectedCustomer.phone})`
                      : customerSearch
                  }
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (selectedCustomer.name) {
                      setSelectedCustomer({ name: "", phone: "" });
                    }
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
                    className="absolute right-2.5 top-2 text-gray-400 dark:text-gray-500 hover:text-red-600 font-bold text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded"
                  >
                    Change
                  </button>
                )}
              </div>

              {isDropdownOpen && !selectedCustomer.name && (
                <div className="absolute left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => {
                          setSelectedCustomer({ name: c.name, phone: c.phone });
                          setCustomerSearch("");
                          setIsDropdownOpen(false);
                        }}
                        className="p-2.5 hover:bg-blue-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition text-xs"
                      >
                        <p className="font-bold text-gray-800 dark:text-gray-100">
                          {c.name}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          📞 {c.phone}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 text-center">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">
                        No customer found.
                      </p>
                      <button
                        onClick={() => openAddCustomerModal(customerSearch)}
                        className="bg-blue-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-blue-700"
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
                ref={barcodeInputRef}
                type="text"
                autoFocus
                placeholder="⚡ Scan Barcode (Product Barcode or Variant SKU)..."
                className="border border-gray-200 dark:border-gray-700 p-2 w-full rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium shadow-sm"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </form>
          </div>

          {/* Cart Item Listing */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-4">
                <span className="text-2xl mb-1">🛒</span>
                <p className="text-xs font-medium">Cart is empty.</p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const isKgItem = item.unit?.toLowerCase() === "kg";
                const effQty = getEffectiveQty(item);
                const itemGst = item.gst || 0;
                const itemTotal =
                  (item.price + (item.price * itemGst) / 100) * effQty;

                return (
                  <div
                    key={item._id || idx}
                    className="p-2 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition space-y-2 bg-white dark:bg-gray-800/40"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex gap-2 items-start min-w-0 w-full">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-10 w-10 rounded-lg object-cover border dark:border-gray-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs flex-shrink-0">
                            📦
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">
                            ₹{item.price}/{item.unit || "Pcs"} + {itemGst}% GST
                          </p>

                          {/* Warranty & Serial Number Injection */}
                          {item.hasWarranty && (
                            <div className="mt-1">
                              <input
                                type="text"
                                placeholder={`Serial/IMEI No. (Optional)`}
                                value={item.serialNumber || ""}
                                onChange={(e) =>
                                  updateItemSN(item._id, e.target.value)
                                }
                                className="w-full text-[10px] p-1.5 border border-blue-200 dark:border-blue-800 rounded bg-blue-50/50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 outline-none focus:ring-1 focus:ring-blue-500 placeholder-blue-300 dark:placeholder-blue-700"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item._id)}
                          className="text-red-400 hover:text-red-600 font-bold text-xs"
                        >
                          ✕
                        </button>
                        {isKgItem && (
                          <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg text-[10px] font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => handleUnitToggle(item._id, "Kg")}
                              className={`px-2 py-0.5 rounded-md transition ${
                                item.selectedUnit === "Kg"
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                              }`}
                            >
                              Kg
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnitToggle(item._id, "Gram")}
                              className={`px-2 py-0.5 rounded-md transition ${
                                item.selectedUnit === "Gram"
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                              }`}
                            >
                              Gram
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            updateQty(
                              item._id,
                              item.selectedUnit === "Gram" ? -50 : -1,
                            )
                          }
                          className="px-2 py-0.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-xs"
                        >
                          -
                        </button>

                        <input
                          type="number"
                          step={item.selectedUnit === "Gram" ? "10" : "0.1"}
                          value={item.qty}
                          onChange={(e) =>
                            setDirectQty(item._id, e.target.value)
                          }
                          className="w-16 text-center font-bold text-xs outline-none bg-transparent text-gray-800 dark:text-gray-200 px-1"
                        />

                        <span className="text-[10px] pr-1 font-bold text-gray-500 dark:text-gray-400">
                          {item.selectedUnit || item.unit || "Pcs"}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQty(
                              item._id,
                              item.selectedUnit === "Gram" ? 50 : 1,
                            )
                          }
                          className="px-2 py-0.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <p className="font-extrabold text-blue-600 dark:text-blue-400 text-xs">
                        ₹{itemTotal.toFixed(2)}
                      </p>
                    </div>

                    {isKgItem && item.selectedUnit === "Gram" && (
                      <div className="flex gap-1 pt-0.5">
                        {[100, 250, 500, 750].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setDirectQty(item._id, g)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition ${
                              item.qty === g
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 hover:bg-blue-100"
                            }`}
                          >
                            {g}g
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Calculation & Proceed Button Footer */}
          <div className="bg-gray-50 dark:bg-gray-800/90 p-3 border-t border-gray-200 dark:border-gray-800 space-y-2 flex-shrink-0">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFeeModal(true)}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
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
                    className="border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-mono font-bold uppercase outline-none w-full focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white px-2.5 py-1 rounded-xl text-xs font-bold transition shadow whitespace-nowrap"
                  >
                    Apply
                  </button>
                </form>
              ) : (
                <div className="flex justify-between items-center bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 px-2 py-1 rounded-xl text-xs flex-grow">
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
              {roundOffAmount !== 0 && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Round Off:</span>
                  <span className="font-semibold">
                    {roundOffAmount >= 0
                      ? `+₹${roundOffAmount.toFixed(2)}`
                      : `-₹${Math.abs(roundOffAmount).toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-lg font-black text-gray-800 dark:text-gray-100 pt-1 border-t dark:border-gray-700">
              <span>Payable Amount:</span>
              <span className="text-green-600 dark:text-green-400">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={initiateCheckout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              💳 Proceed to Payment (F2) ➔
            </button>
          </div>
        </div>

        {/* Variant Selection Modal */}
        {showVariantModal && selectedVariantProduct && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl p-5 max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center mb-3 border-b dark:border-gray-800 pb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {selectedVariantProduct.image && (
                    <img
                      src={selectedVariantProduct.image}
                      alt={selectedVariantProduct.name}
                      className="w-10 h-10 rounded-xl object-cover border"
                    />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      Select Variant
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {selectedVariantProduct.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVariantModal(false)}
                  className="text-gray-400 hover:text-red-500 font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                {selectedVariantProduct.variants?.map((v, i) => {
                  const label = getVariantLabel(v);
                  const variantImg =
                    v.image || selectedVariantProduct.image || "";

                  return (
                    <div
                      key={v.sku || i}
                      onClick={() => addToCart(selectedVariantProduct, v)}
                      className={`p-3 border rounded-2xl flex items-center justify-between cursor-pointer transition ${
                        v.stock > 0
                          ? "hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-gray-800/80 border-gray-200 dark:border-gray-800"
                          : "opacity-40 pointer-events-none bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {variantImg ? (
                          <img
                            src={variantImg}
                            alt={label}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                            🎨
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-black text-xs text-gray-800 dark:text-gray-100 truncate">
                            {label}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                              SKU: {v.sku || "N/A"}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                v.stock > 0
                                  ? "bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              Stock: {v.stock}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-black text-xs text-blue-600 dark:text-blue-400">
                          ₹{v.price}
                        </p>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-lg">
                          + Add
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Held / Parked Orders Modal */}
        {showHeldModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl p-5 max-w-md w-full shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-3 border-b dark:border-gray-800 pb-3 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <span>📋 Held / Parked Orders</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Total {heldOrders.length} orders on hold
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHeldModal(false)}
                  className="text-gray-400 hover:text-red-500 font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {heldOrders.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                    <span className="text-3xl">⏸️</span>
                    <p className="text-xs font-medium mt-2">
                      No orders currently on hold.
                    </p>
                  </div>
                ) : (
                  heldOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3.5 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800 transition shadow-sm flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-xs text-gray-800 dark:text-gray-100">
                            {order.selectedCustomer?.name || "Walk-in Customer"}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">
                            📞 {order.selectedCustomer?.phone || "N/A"} • ⏰{" "}
                            {order.time}
                          </p>
                        </div>
                        <span className="font-black text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-900 px-2 py-0.5 rounded-lg">
                          ₹{order.grandTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate bg-white dark:bg-gray-900 p-2 rounded-xl border dark:border-gray-800">
                        <strong>Items ({order.cart.length}):</strong>{" "}
                        {order.cart
                          .map(
                            (i) =>
                              `${i.name} (${i.qty} ${
                                i.selectedUnit || i.unit || "Pcs"
                              })`,
                          )
                          .join(", ")}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRestoreHeldOrder(order)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-xl text-xs shadow-sm transition"
                        >
                          🔄 Restore to Cart
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHeldOrder(order.id)}
                          className="px-3 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 font-bold py-1.5 rounded-xl text-xs transition border border-red-200 dark:border-red-900/50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Screen Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="p-4 sm:p-5 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex justify-between items-center flex-shrink-0">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <span>💳 Payment Counter</span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Customer:{" "}
                    <strong className="text-gray-700 dark:text-gray-200">
                      {selectedCustomer.name}
                    </strong>{" "}
                    ({selectedCustomer.phone})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 font-bold text-xl px-2 py-1 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto">
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border dark:border-gray-800 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Order Summary ({cart.length} Items)
                      </h3>
                      <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md">
                        Verified
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs divide-y divide-gray-100 dark:divide-gray-800">
                      {cart.map((item, i) => {
                        const effQty = getEffectiveQty(item);
                        const itemTotal =
                          (item.price + (item.price * (item.gst || 0)) / 100) *
                          effQty;

                        return (
                          <div
                            key={i}
                            className="pt-1.5 flex justify-between text-gray-700 dark:text-gray-300"
                          >
                            <span className="truncate w-36 font-medium">
                              {item.name} × {item.qty}{" "}
                              {item.selectedUnit || item.unit || "Pcs"}
                            </span>
                            <span className="font-bold">
                              ₹{itemTotal.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t dark:border-gray-700 pt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span>₹{subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>GST Tax</span>
                      <span>₹{totalTax.toFixed(2)}</span>
                    </div>
                    {customFees.length > 0 && (
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                        <span>Extra Fees</span>
                        <span>₹{totalCustomFees.toFixed(2)}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                        <span>Discount Coupon</span>
                        <span>-₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {roundOffAmount !== 0 && (
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                        <span>Round Off</span>
                        <span>
                          {roundOffAmount >= 0
                            ? `+₹${roundOffAmount.toFixed(2)}`
                            : `-₹${Math.abs(roundOffAmount).toFixed(2)}`}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-lg font-black text-gray-900 dark:text-white pt-2 border-t dark:border-gray-700">
                      <span>Final Amount:</span>
                      <span className="text-green-600 dark:text-green-400">
                        ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "Cash", label: "💵 Cash" },
                        { id: "UPI / Online QR", label: "📱 UPI QR" },
                        { id: "Razorpay Gateway", label: "💳 Razorpay" },
                        { id: "Card", label: "💳 Card" },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPaymentMode(mode.id)}
                          className={`p-3 rounded-xl border font-bold text-xs transition ${
                            paymentMode === mode.id
                              ? "border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:border-blue-500 dark:text-blue-400 shadow-sm"
                              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMode === "Cash" && (
                    <div className="space-y-3 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900/60">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                            Cash Received (₹)
                          </label>
                          <div className="flex gap-1">
                            {[grandTotal, 100, 200, 500, 2000].map(
                              (amt, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setCashReceived(amt.toString())
                                  }
                                  className="text-[9px] bg-white dark:bg-gray-800 border dark:border-gray-700 px-1.5 py-0.5 rounded font-bold hover:bg-blue-100"
                                >
                                  {idx === 0 ? "Exact" : `₹${amt}`}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-base font-black focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-blue-200/50 dark:border-blue-900">
                        <span className="text-gray-600 dark:text-gray-400">
                          Change to Return:
                        </span>
                        <span className="text-red-500 dark:text-red-400 text-lg font-black">
                          ₹{changeToReturn.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {paymentMode === "UPI / Online QR" && (
                    <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border dark:border-gray-700 text-center space-y-2">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Scan QR Code to Pay ₹{grandTotal.toFixed(2)}
                      </p>
                      <div className="flex justify-center p-2 bg-white rounded-xl shadow-inner border border-gray-200 w-fit mx-auto">
                        <img
                          src={qrCodeImageUrl}
                          alt="UPI Payment QR Code"
                          className="w-36 h-36 rounded-lg object-contain"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Transaction / UTR ID (Optional)"
                        className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl w-full text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleExecutePayment}
                    disabled={isProcessingPayment}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3.5 rounded-2xl text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 mt-2"
                  >
                    {isProcessingPayment ? (
                      "⌛ Processing Payment..."
                    ) : (
                      <>✅ Complete & Print Bill (₹{grandTotal.toFixed(2)})</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Custom Fee Modal */}
        {showFeeModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
              <div className="flex justify-between items-center mb-3 border-b dark:border-gray-800 pb-2">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  Add Custom Fee
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFeeModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-bold text-base"
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
                    className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl w-full text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl w-full text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t dark:border-gray-800">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-xs shadow-md transition"
                  >
                    Add Fee
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFeeModal(false)}
                    className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-xl font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Add Customer Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-5 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-3 border-b dark:border-gray-800 pb-2">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  Quick Add Customer
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-bold text-base"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleQuickAddCustomer} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amit Kumar"
                    className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl w-full text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    value={newCust.name}
                    onChange={(e) =>
                      setNewCust({ ...newCust, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl w-full text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    value={newCust.phone}
                    onChange={(e) =>
                      setNewCust({ ...newCust, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. amit@gmail.com"
                    className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl w-full text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCust.email}
                    onChange={(e) =>
                      setNewCust({ ...newCust, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">
                    Address / City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lalganj Ajhara"
                    className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl w-full text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCust.address}
                    onChange={(e) =>
                      setNewCust({ ...newCust, address: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t dark:border-gray-800">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-xs shadow-md transition"
                  >
                    Save & Select
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-xl font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Print Confirmation Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-center">
              <div className="text-3xl mb-1">🖨️</div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">
                Print Receipt?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Order saved successfully! Would you like to print the receipt
                now?
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    setShowPrintModal(false);
                    setTimeout(() => {
                      window.print();
                    }, 250);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-xs shadow transition"
                >
                  Yes, Print
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-xl font-bold text-xs transition"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable Thermal Receipt Container */}
      {printOrderData && (
        <div
          id="printable-receipt"
          className="hidden print:block bg-white text-black p-2 text-[11px] font-mono max-w-[80mm] mx-auto"
        >
          <h2 className="text-center font-bold text-base mb-0.5">
            Sanskar Tech POS
          </h2>
          <p className="text-center text-[10px] mb-2">Lalganj Ajhara</p>

          <div className="text-[10px] mb-2 border-b border-black pb-1.5 space-y-0.5">
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
            {printOrderData.paymentMode === "Cash" && (
              <>
                <p>
                  <strong>Received:</strong> ₹
                  {printOrderData.cashReceived?.toFixed(2)}
                </p>
                <p>
                  <strong>Change Returned:</strong> ₹
                  {printOrderData.changeToReturn?.toFixed(2)}
                </p>
              </>
            )}
            {printOrderData.transactionId && (
              <p>
                <strong>Txn ID:</strong> {printOrderData.transactionId}
              </p>
            )}
            <p>
              <strong>Date:</strong> {printOrderData.date}
            </p>
          </div>

          <table className="w-full text-left text-[10px] mb-2 border-b border-black pb-1">
            <thead>
              <tr className="border-b border-black align-bottom">
                <th className="py-1">Item</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Amt</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {printOrderData.items.map((item, i) => {
                const itemTotal =
                  (item.price + (item.price * (item.gst || 0)) / 100) *
                  item.effectiveQty;

                return (
                  <tr key={i} className="align-top">
                    <td className="py-1 pr-2 whitespace-normal break-words">
                      <div className="font-semibold text-[10px]">
                        {item.name}
                      </div>
                      {item.serialNumber && (
                        <div className="text-[9px] text-gray-600 mt-0.5">
                          SN: {item.serialNumber}
                        </div>
                      )}
                      {item.hasWarranty && item.warrantyMonths > 0 && (
                        <div className="text-[9px] text-gray-600">
                          Warranty: {item.warrantyMonths} Months
                        </div>
                      )}
                    </td>
                    <td className="py-1 text-center whitespace-nowrap align-top">
                      {item.qty} {item.selectedUnit || item.unit || "Pcs"}
                    </td>
                    <td className="text-right py-1 whitespace-nowrap align-top">
                      ₹{itemTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="text-[10px] text-right mb-2 space-y-0.5">
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
            {printOrderData.roundOffAmount !== 0 && (
              <p>
                Round Off:{" "}
                {printOrderData.roundOffAmount >= 0
                  ? `+₹${printOrderData.roundOffAmount.toFixed(2)}`
                  : `-₹${Math.abs(printOrderData.roundOffAmount).toFixed(2)}`}
              </p>
            )}
            <p className="font-bold text-xs mt-1 border-t border-black pt-1">
              Total: ₹{printOrderData.totalAmount.toFixed(2)}
            </p>
          </div>
          <p className="text-center text-[10px] italic">
            Thank you for visiting!
          </p>
        </div>
      )}
    </>
  );
}
