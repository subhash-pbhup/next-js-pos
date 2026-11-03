"use client";
import { useState, useEffect } from "react";

export default function PosOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [isReturning, setIsReturning] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [returnModal, setReturnModal] = useState({
    show: false,
    order: null,
    returnQtys: {},
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/bills?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3500,
    );
  };

  const openReturnModal = (order) => {
    const initialQtys = {};
    order.items.forEach((item, index) => {
      const uniqueKey = `${item._id}_${index}`;
      initialQtys[uniqueKey] = 0;
    });
    setReturnModal({ show: true, order, returnQtys: initialQtys });
  };

  const updateReturnQty = (uniqueKey, val, maxAllowed) => {
    setReturnModal((prev) => {
      const newQty = Math.max(0, Math.min(maxAllowed, Number(val) || 0));
      return {
        ...prev,
        returnQtys: { ...prev.returnQtys, [uniqueKey]: newQty },
      };
    });
  };

  const calculateTotalRefund = () => {
    if (!returnModal.order) return 0;
    let refund = 0;
    returnModal.order.items.forEach((item, index) => {
      const uniqueKey = `${item._id}_${index}`;
      const qtyToReturn = returnModal.returnQtys[uniqueKey] || 0;
      if (qtyToReturn > 0) {
        const effectiveQty =
          item.selectedUnit === "Gram" ? qtyToReturn / 1000 : qtyToReturn;
        const priceWithTax = item.price + (item.price * (item.gst || 0)) / 100;
        refund += priceWithTax * effectiveQty;
      }
    });
    return refund;
  };

  const handleProcessReturn = async () => {
    const { order, returnQtys } = returnModal;

    const returnItemsPayload = order.items
      .map((item, index) => {
        const uniqueKey = `${item._id}_${index}`;
        return {
          subDocId: item._id,
          productId: item.productId || item._id,
          variantId: item.variantId || null,
          index: index,
          qtyToReturn: returnQtys[uniqueKey] || 0,
        };
      })
      .filter((payload) => payload.qtyToReturn > 0);

    if (returnItemsPayload.length === 0) {
      return showToast("Please select at least 1 item to return.", "error");
    }

    setIsReturning(true);
    try {
      const res = await fetch("/api/bills/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order._id,
          returnItems: returnItemsPayload,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(
          `Return processed! Refund: ₹${data.refundAmount.toFixed(2)}`,
          "success",
        );
        setReturnModal({ show: false, order: null, returnQtys: {} });
        fetchOrders();
      } else {
        showToast(data.error || "Failed to return items.", "error");
      }
    } catch (err) {
      showToast("Network error during return.", "error");
    } finally {
      setIsReturning(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
      (order.customerPhone || "").includes(search) ||
      (order._id || "").toLowerCase().includes(search.toLowerCase());

    const matchesPayment =
      paymentFilter === "All" || order.paymentMode === paymentFilter;

    const isRet = Boolean(order.isReturned);
    const isPartRet = Boolean(order.isPartiallyReturned);
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Completed" && !isRet && !isPartRet) ||
      (statusFilter === "Returned" && (isRet || isPartRet));

    let matchesDate = true;
    if (dateFilter !== "All Time") {
      const orderDate = new Date(order.createdAt || order.date);
      const today = new Date();
      if (dateFilter === "Today") {
        matchesDate = orderDate.toDateString() === today.toDateString();
      } else if (dateFilter === "This Week") {
        const firstDay = new Date(
          today.setDate(today.getDate() - today.getDay()),
        );
        matchesDate = orderDate >= firstDay;
      } else if (dateFilter === "This Month") {
        matchesDate =
          orderDate.getMonth() === new Date().getMonth() &&
          orderDate.getFullYear() === new Date().getFullYear();
      }
    }

    return matchesSearch && matchesPayment && matchesStatus && matchesDate;
  });

  const totalRevenue = filteredOrders.reduce(
    (sum, o) => sum + ((o.totalAmount || 0) - (o.refundedAmount || 0)),
    0,
  );

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  const formatOrderDate = (order) => {
    if (order.createdAt) return new Date(order.createdAt).toLocaleString();
    if (order.date) return new Date(order.date).toLocaleString();
    return "N/A";
  };

  // Fixed the Customer Name Print function
  const handlePrint = () => {
    if (!selectedOrder) return;

    // Original document title save karo
    const originalTitle = document.title;

    // Fallback Walk-in if customer name is missing, sanitize it for safe file names
    const custName = selectedOrder.customerName
      ? selectedOrder.customerName.replace(/[^a-zA-Z0-9]/g, "_")
      : "Walk-in";
    const orderId = selectedOrder._id.slice(-6);
    document.title = `Invoice_${custName}_${orderId}`;

    // Timeout fix for reliable printing
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  return (
    <>
      <style>{`
        /* PRINT CSS: Yahan exact logic se body hide hogi aur sirf print block display hoga */
        @media print {
          /* Page Size Fixed */
          @page {
            size: 80mm auto;
            margin: 0;
          }
          /* Sabkuch Hide */
          body * {
            visibility: hidden;
          }
          /* Print block visible karo aur absolute layout set karo */
          #printable-order-receipt, #printable-order-receipt * {
            visibility: visible !important;
          }
          #printable-order-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 5mm !important;
            margin: 0 !important;
            color: black !important;
            font-family: monospace !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="w-full mx-auto p-4 sm:p-6 lg:p-6 bg-gray-50 dark:bg-[#0b1120] text-gray-800 dark:text-gray-300 min-h-[90vh] print:hidden transition-colors duration-200">
        {toast.show && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300">
            <div
              className={`flex items-center justify-between px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === "error" ? "bg-red-500 text-white border-red-600" : "bg-green-600 text-white border-green-700"}`}
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

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
              POS Terminal Orders
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View, track, and process partial/full returns.
            </p>
          </div>
          <div className="bg-white dark:bg-[#111827] px-6 py-3 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4 transition-colors">
            <span className="text-3xl">💰</span>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">
                Net Revenue
              </p>
              <p className="text-xl font-black text-green-600 dark:text-green-400">
                ₹{totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6 flex flex-col xl:flex-row gap-4 items-center justify-between transition-colors">
          <div className="w-full xl:w-80 relative">
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search Order ID, Name, Phone..."
              className="border border-gray-300 dark:border-gray-700 p-2.5 pl-9 rounded-xl w-full text-sm bg-gray-50 dark:bg-[#1f2937] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <select
              className="border border-gray-300 dark:border-gray-700 p-2.5 rounded-xl bg-gray-50 dark:bg-[#1f2937] text-gray-900 dark:text-white text-xs font-semibold outline-none transition-colors"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Returned">Returned / Partial</option>
            </select>
            <select
              className="border border-gray-300 dark:border-gray-700 p-2.5 rounded-xl bg-gray-50 dark:bg-[#1f2937] text-gray-900 dark:text-white text-xs font-semibold outline-none transition-colors"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
            <select
              className="border border-gray-300 dark:border-gray-700 p-2.5 rounded-xl bg-gray-50 dark:bg-[#1f2937] text-gray-900 dark:text-white text-xs font-semibold outline-none transition-colors"
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI / Online QR">UPI / QR</option>
              <option value="Razorpay Gateway">Razorpay</option>
              <option value="Card">Card</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 dark:bg-transparent border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-600 dark:text-gray-500 tracking-wider">
                  <th className="p-4">Order Details</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Net Amount</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {currentOrders.map((o) => {
                  const netAmount =
                    (o.totalAmount || 0) - (o.refundedAmount || 0);
                  return (
                    <tr
                      key={o._id}
                      className="hover:bg-gray-50 dark:hover:bg-[#1f2937]/50 transition text-sm"
                    >
                      <td className="p-4">
                        <p className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          #{o._id.slice(-6)}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                          {formatOrderDate(o)}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-gray-900 dark:text-gray-200">
                          {o.customerName || "Walk-in"}
                        </p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          📞 {o.customerPhone || "N/A"}
                        </p>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-[#1f2937] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {o.paymentMode}
                        </span>
                      </td>
                      <td className="p-4">
                        {o.isReturned ? (
                          <span className="bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                            FULL RETURN
                          </span>
                        ) : o.isPartiallyReturned ? (
                          <span className="bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-900 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                            PARTIAL RETURN
                          </span>
                        ) : (
                          <span className="bg-green-50 dark:bg-green-950/80 text-green-600 dark:text-green-500 border border-green-200 dark:border-green-900 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                            COMPLETED
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-black text-gray-900 dark:text-white">
                          ₹{netAmount.toFixed(2)}
                        </p>
                        {o.refundedAmount > 0 && (
                          <p className="text-[10px] font-bold text-red-600 dark:text-red-500 mt-1.5 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded inline-block">
                            Refunded: ₹{o.refundedAmount.toFixed(2)}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          View Bill
                        </button>
                        {!o.isReturned && (
                          <button
                            onClick={() => openReturnModal(o)}
                            disabled={isReturning}
                            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500 hover:bg-red-600 hover:text-white disabled:opacity-50 px-4 py-1.5 rounded-lg text-xs font-bold transition"
                          >
                            Return Items
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {currentOrders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-gray-500">
                      <p className="text-4xl mb-2">🧾</p>
                      <p className="font-semibold text-sm">No orders found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#111827]">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Page{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {totalPages}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-[#1f2937] text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 transition"
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-[#1f2937] text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Partial Return Modal */}
        {returnModal.show && returnModal.order && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    📦 Return Items
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Order #{returnModal.order._id.slice(-6)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setReturnModal({ show: false, order: null, returnQtys: {} })
                  }
                  className="text-gray-400 hover:text-red-500 font-bold text-xl px-2"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[50vh]">
                {returnModal.order.items.map((item, i) => {
                  const uniqueKey = `${item._id}_${i}`;
                  const previouslyReturned = Number(item.returnedQty) || 0;
                  const availableToReturn = item.qty - previouslyReturned;
                  const currentReturnSelection =
                    returnModal.returnQtys[uniqueKey] || 0;
                  const isMultiQty =
                    item.qty > 1 ||
                    item.selectedUnit === "Gram" ||
                    item.selectedUnit === "Kg";

                  return (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-2xl flex justify-between items-center"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1">
                          Purchased:{" "}
                          <strong className="text-gray-800 dark:text-gray-200">
                            {item.qty} {item.selectedUnit || item.unit}
                          </strong>
                          {previouslyReturned > 0 && (
                            <span className="ml-2 text-red-600 dark:text-red-500 font-bold">
                              Returned: {previouslyReturned}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[9px] uppercase font-bold text-gray-500">
                          Qty to Return
                        </span>
                        {availableToReturn > 0 ? (
                          isMultiQty ? (
                            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-[#111827]">
                              <button
                                onClick={() =>
                                  updateReturnQty(
                                    uniqueKey,
                                    currentReturnSelection -
                                      (item.selectedUnit === "Gram" ? 50 : 1),
                                    availableToReturn,
                                  )
                                }
                                className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 font-black text-sm text-gray-800 dark:text-white"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                readOnly
                                value={currentReturnSelection}
                                className="w-12 text-center text-xs font-bold outline-none bg-transparent text-gray-900 dark:text-white"
                              />
                              <button
                                onClick={() =>
                                  updateReturnQty(
                                    uniqueKey,
                                    currentReturnSelection +
                                      (item.selectedUnit === "Gram" ? 50 : 1),
                                    availableToReturn,
                                  )
                                }
                                className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 font-black text-sm text-gray-800 dark:text-white"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                updateReturnQty(
                                  uniqueKey,
                                  currentReturnSelection === 1 ? 0 : 1,
                                  1,
                                )
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${currentReturnSelection === 1 ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                            >
                              {currentReturnSelection === 1
                                ? "Selected ✓"
                                : "Select"}
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-md border border-red-200 dark:border-red-900/50">
                            Fully Returned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-center mb-4 bg-green-50 dark:bg-[#1f2937] border border-green-200 dark:border-gray-700 p-3 rounded-xl">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    Refund Amount:
                  </span>
                  <span className="text-xl font-black text-green-600 dark:text-green-400">
                    ₹{calculateTotalRefund().toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleProcessReturn}
                    disabled={isReturning || calculateTotalRefund() === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-50"
                  >
                    {isReturning ? "Processing..." : "Confirm Refund"}
                  </button>
                  <button
                    onClick={() =>
                      setReturnModal({
                        show: false,
                        order: null,
                        returnQtys: {},
                      })
                    }
                    className="px-5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold py-3 rounded-xl text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Bill Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Receipt Details
                  </h3>
                  <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    ID: #{selectedOrder._id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-red-500 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              {(selectedOrder.isReturned ||
                selectedOrder.isPartiallyReturned) && (
                <div
                  className={`${selectedOrder.isReturned ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"} dark:bg-gray-800 border p-4 rounded-xl text-center mb-5`}
                >
                  <span className="text-3xl block mb-2">📦↩️</span>
                  <h4
                    className={`${selectedOrder.isReturned ? "text-red-600" : "text-amber-600"} font-black text-sm uppercase`}
                  >
                    {selectedOrder.isReturned
                      ? "Order Fully Returned"
                      : "Partially Returned"}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-bold">
                    Total Refunded:{" "}
                    <span className="text-red-600">
                      ₹{selectedOrder.refundedAmount?.toFixed(2) || "0.00"}
                    </span>
                  </p>
                </div>
              )}

              <div className="text-sm space-y-1 mb-4 bg-gray-50 dark:bg-[#1f2937] p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Customer:
                  </strong>{" "}
                  {selectedOrder.customerName}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Phone:
                  </strong>{" "}
                  {selectedOrder.customerPhone || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Pay Mode:
                  </strong>{" "}
                  {selectedOrder.paymentMode}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Date:
                  </strong>{" "}
                  {formatOrderDate(selectedOrder)}
                </p>
              </div>

              <table className="w-full text-left text-sm mb-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                    <th className="pb-2 font-semibold">Item</th>
                    <th className="pb-2 text-center font-semibold">
                      Purchased
                    </th>
                    <th className="pb-2 text-center font-semibold">Returned</th>
                    <th className="pb-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {selectedOrder.items.map((item, i) => {
                    const unitPrice =
                      item.price + (item.price * (item.gst || 0)) / 100;
                    const purchasedEffQty = item.effectiveQty || item.qty;
                    const returnedEffQty = item.returnedQty
                      ? item.selectedUnit === "Gram"
                        ? item.returnedQty / 1000
                        : item.returnedQty
                      : 0;
                    const netEffQty = Math.max(
                      0,
                      purchasedEffQty - returnedEffQty,
                    );

                    const originalTotal = (unitPrice * purchasedEffQty).toFixed(
                      2,
                    );
                    const returnedTotal = (unitPrice * returnedEffQty).toFixed(
                      2,
                    );
                    const netTotal = (unitPrice * netEffQty).toFixed(2);

                    return (
                      <tr key={i} className="align-top">
                        <td className="py-2.5 pr-2">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {item.name}
                          </p>
                          {item.serialNumber && (
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              SN: {item.serialNumber}
                            </p>
                          )}
                          {item.hasWarranty && item.warrantyMonths > 0 && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                              🛡️ {item.warrantyMonths} Months Warranty
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 text-center text-gray-600 dark:text-gray-400 align-top">
                          {item.qty} {item.selectedUnit || item.unit}
                        </td>
                        <td className="py-2.5 text-center font-bold text-red-600 dark:text-red-500 align-top">
                          {item.returnedQty > 0 ? item.returnedQty : "-"}
                        </td>
                        <td className="py-2.5 text-right font-medium text-gray-800 dark:text-gray-200 align-top">
                          {item.returnedQty > 0 ? (
                            <div className="flex flex-col items-end leading-tight">
                              <span className="font-bold text-gray-900 dark:text-white">
                                ₹{netTotal}
                              </span>
                              <span className="text-[10px] font-bold text-red-600 mt-0.5">
                                -₹{returnedTotal} (Ret)
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-gray-900 dark:text-white">
                              ₹{originalTotal}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="text-xs space-y-1.5 text-right mb-6 text-gray-600 dark:text-gray-400">
                <p>Subtotal: ₹{selectedOrder.subTotal?.toFixed(2)}</p>
                <p>Tax (GST): ₹{selectedOrder.totalTax?.toFixed(2)}</p>
                {selectedOrder.customFees?.map((fee, idx) => (
                  <p key={idx}>
                    {fee.name}: ₹{fee.amount?.toFixed(2)}
                  </p>
                ))}
                {selectedOrder.discountAmount > 0 && (
                  <p className="text-green-600 font-bold">
                    Discount: -₹{selectedOrder.discountAmount.toFixed(2)}
                  </p>
                )}
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                  Original Bill: ₹{selectedOrder.totalAmount?.toFixed(2)}
                </p>
                {selectedOrder.refundedAmount > 0 && (
                  <p className="text-sm font-black text-red-600 mt-1 bg-red-50 dark:bg-red-900/20 inline-block px-2 py-1 rounded">
                    - Refunded: ₹{selectedOrder.refundedAmount.toFixed(2)}
                  </p>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <p className="text-base font-black text-gray-800 dark:text-gray-100">
                    Net Total:{" "}
                    <span className="text-green-600">
                      ₹
                      {(
                        (selectedOrder.totalAmount || 0) -
                        (selectedOrder.refundedAmount || 0)
                      ).toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={handlePrint}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2"
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 
        ========================================
        HIDDEN THERMAL PRINT RECEIPT
        (Styled with explicit inline CSS to bypass Tailwind conflicts)
        ========================================
      */}
      {selectedOrder && (
        <div id="printable-order-receipt" className="hidden">
          <h2
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "14px",
              margin: "0 0 2px 0",
            }}
          >
            Sanskar Tech POS
          </h2>
          <p
            style={{
              textAlign: "center",
              fontSize: "10px",
              margin: "0 0 10px 0",
            }}
          >
            Lalganj Ajhara
          </p>

          {selectedOrder.isReturned && (
            <h3
              style={{
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "12px",
                borderTop: "1px dashed black",
                borderBottom: "1px dashed black",
                padding: "4px 0",
                margin: "4px 0",
              }}
            >
              *** CANCELLED / RETURNED BILL ***
            </h3>
          )}

          <div
            style={{
              borderBottom: "1px dashed black",
              paddingBottom: "5px",
              marginBottom: "5px",
              fontSize: "11px",
              lineHeight: "1.4",
            }}
          >
            <p style={{ margin: "2px 0" }}>
              <strong>Order ID:</strong> #{selectedOrder._id.slice(-6)}
            </p>
            <p style={{ margin: "2px 0" }}>
              <strong>Customer:</strong> {selectedOrder.customerName}
            </p>
            {selectedOrder.customerPhone && (
              <p style={{ margin: "2px 0" }}>
                <strong>Phone:</strong> {selectedOrder.customerPhone}
              </p>
            )}
            <p style={{ margin: "2px 0" }}>
              <strong>Pay Mode:</strong> {selectedOrder.paymentMode}
            </p>
            <p style={{ margin: "2px 0" }}>
              <strong>Date:</strong> {formatOrderDate(selectedOrder)}
            </p>
          </div>

          <table
            style={{
              width: "100%",
              fontSize: "11px",
              borderBottom: "1px dashed black",
              marginBottom: "5px",
              paddingBottom: "2px",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{ borderBottom: "1px dashed black", textAlign: "left" }}
              >
                <th style={{ padding: "4px 0" }}>Item</th>
                <th style={{ padding: "4px 0", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "4px 0", textAlign: "right" }}>Amt</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items.map((item, i) => {
                const unitPrice =
                  item.price + (item.price * (item.gst || 0)) / 100;
                const purchasedEffQty = item.effectiveQty || item.qty;
                const returnedEffQty = item.returnedQty
                  ? item.selectedUnit === "Gram"
                    ? item.returnedQty / 1000
                    : item.returnedQty
                  : 0;
                const netEffQty = Math.max(0, purchasedEffQty - returnedEffQty);

                const originalTotal = (unitPrice * purchasedEffQty).toFixed(2);
                const returnedTotal = (unitPrice * returnedEffQty).toFixed(2);
                const netTotal = (unitPrice * netEffQty).toFixed(2);

                return (
                  <tr key={i} style={{ verticalAlign: "top" }}>
                    <td style={{ padding: "4px 4px 4px 0" }}>
                      <div style={{ fontWeight: "bold" }}>{item.name}</div>
                      {item.serialNumber && (
                        <div style={{ fontSize: "9px", marginTop: "2px" }}>
                          SN: {item.serialNumber}
                        </div>
                      )}
                      {item.hasWarranty && item.warrantyMonths > 0 && (
                        <div style={{ fontSize: "9px", marginTop: "2px" }}>
                          Warranty: {item.warrantyMonths}M
                        </div>
                      )}
                      {item.returnedQty > 0 && (
                        <div
                          style={{
                            fontSize: "9px",
                            fontWeight: "bold",
                            marginTop: "2px",
                            color: "red",
                          }}
                        >
                          Ret: {item.returnedQty}{" "}
                          {item.selectedUnit || item.unit}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "center" }}>
                      {item.qty} {item.selectedUnit || item.unit || "Pcs"}
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>
                      {item.returnedQty > 0 ? (
                        <>
                          <div>₹{netTotal}</div>
                          <div style={{ fontSize: "9px", color: "red" }}>
                            -₹{returnedTotal}
                          </div>
                        </>
                      ) : (
                        `₹${originalTotal}`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div
            style={{
              fontSize: "11px",
              textAlign: "right",
              lineHeight: "1.4",
              paddingBottom: "5px",
              marginBottom: "5px",
            }}
          >
            <p style={{ margin: "2px 0" }}>
              Subtotal: ₹{selectedOrder.subTotal?.toFixed(2)}
            </p>
            <p style={{ margin: "2px 0" }}>
              Tax: ₹{selectedOrder.totalTax?.toFixed(2)}
            </p>
            {selectedOrder.customFees?.map((fee, idx) => (
              <p style={{ margin: "2px 0" }} key={idx}>
                {fee.name}: ₹{fee.amount.toFixed(2)}
              </p>
            ))}
            {selectedOrder.discountAmount > 0 && (
              <p style={{ margin: "2px 0" }}>
                Discount: -₹{selectedOrder.discountAmount.toFixed(2)}
              </p>
            )}
            {selectedOrder.roundOffAmount !== 0 && (
              <p style={{ margin: "2px 0" }}>
                Round Off:{" "}
                {selectedOrder.roundOffAmount > 0
                  ? `+₹${selectedOrder.roundOffAmount.toFixed(2)}`
                  : `-₹${Math.abs(selectedOrder.roundOffAmount).toFixed(2)}`}
              </p>
            )}

            <p style={{ fontWeight: "bold", margin: "4px 0" }}>
              Total Bill: ₹{selectedOrder.totalAmount?.toFixed(2)}
            </p>

            {selectedOrder.refundedAmount > 0 && (
              <p
                style={{
                  fontWeight: "bold",
                  borderTop: "1px dashed black",
                  borderBottom: "1px dashed black",
                  padding: "2px 0",
                  margin: "4px 0",
                }}
              >
                Refunded: -₹{selectedOrder.refundedAmount.toFixed(2)}
              </p>
            )}

            <p
              style={{
                fontWeight: "bold",
                fontSize: "12px",
                borderTop: "1px dashed black",
                paddingTop: "4px",
                marginTop: "4px",
              }}
            >
              Net Amount: ₹
              {(
                (selectedOrder.totalAmount || 0) -
                (selectedOrder.refundedAmount || 0)
              ).toFixed(2)}
            </p>
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: "10px",
              fontStyle: "italic",
              margin: "10px 0 0 0",
            }}
          >
            Thank you for visiting!
          </p>
        </div>
      )}
    </>
  );
}
