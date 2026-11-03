"use client";
import { useState, useEffect } from "react";

export default function OrdersPage() {
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
    order.items.forEach((item) => {
      const itemId = item.productId || item._id;
      const previouslyReturned = Number(item.returnedQty) || 0;
      const available = item.qty - previouslyReturned;
      initialQtys[itemId] = available;
    });
    setReturnModal({ show: true, order, returnQtys: initialQtys });
  };

  const updateReturnQty = (itemId, val, maxAllowed) => {
    setReturnModal((prev) => {
      const newQty = Math.max(0, Math.min(maxAllowed, Number(val) || 0));
      return { ...prev, returnQtys: { ...prev.returnQtys, [itemId]: newQty } };
    });
  };

  const calculateTotalRefund = () => {
    if (!returnModal.order) return 0;
    let refund = 0;
    returnModal.order.items.forEach((item) => {
      const itemId = item.productId || item._id;
      const qtyToReturn = returnModal.returnQtys[itemId] || 0;
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

    const returnItemsPayload = Object.keys(returnQtys)
      .filter((itemId) => returnQtys[itemId] > 0)
      .map((itemId) => ({
        itemId,
        qtyToReturn: returnQtys[itemId],
      }));

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
      const orderDate = new Date(order.createdAt);
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

  const totalRevenue = filteredOrders.reduce((sum, o) => {
    return sum + ((o.totalAmount || 0) - (o.refundedAmount || 0));
  }, 0);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-[90vh] transition-colors duration-200">
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
          <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100">
            Order History
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View, track, and process partial/full returns.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 px-6 py-3 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <span className="text-3xl">💰</span>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase">
              Net Revenue
            </p>
            <p className="text-xl font-black text-green-600 dark:text-green-400">
              ₹{totalRevenue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="🔍 Search Order ID, Name, Phone..."
            className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl w-full text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-semibold outline-none"
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
            className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-semibold outline-none"
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
            className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-semibold outline-none"
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

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100/70 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                <th className="p-4">Order Details</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4">Net Amount</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {currentOrders.map((o) => {
                const netAmount =
                  (o.totalAmount || 0) - (o.refundedAmount || 0);

                return (
                  <tr
                    key={o._id}
                    className="hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition text-sm"
                  >
                    <td className="p-4">
                      <p className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        #{o._id.slice(-6)}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(o.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-800 dark:text-gray-200">
                        {o.customerName || "Walk-in"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        📞 {o.customerPhone || "N/A"}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {o.paymentMode}
                      </span>
                    </td>
                    <td className="p-4">
                      {o.isReturned ? (
                        <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 px-2.5 py-1 rounded-full text-[9px] font-black">
                          FULL RETURN
                        </span>
                      ) : o.isPartiallyReturned ? (
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 px-2.5 py-1 rounded-full text-[9px] font-black">
                          PARTIAL RETURN
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 px-2.5 py-1 rounded-full text-[9px] font-black">
                          COMPLETED
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-black text-gray-800 dark:text-gray-100">
                        ₹{netAmount.toFixed(2)}
                      </p>
                      {o.refundedAmount > 0 && (
                        <p className="text-[10px] font-bold text-red-500 mt-0.5 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded inline-block">
                          Refunded: ₹{o.refundedAmount.toFixed(2)}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        View Bill
                      </button>
                      {!o.isReturned && (
                        <button
                          onClick={() => openReturnModal(o)}
                          disabled={isReturning}
                          className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-bold transition"
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
                  <td
                    colSpan="6"
                    className="p-12 text-center text-gray-400 dark:text-gray-500"
                  >
                    <p className="text-4xl mb-2">🧾</p>
                    <p className="font-semibold text-sm">No orders found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Page{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {totalPages}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 transition"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Return Modal */}
      {returnModal.show && returnModal.order && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">
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
                const itemId = item.productId || item._id;
                const previouslyReturned = Number(item.returnedQty) || 0;
                const availableToReturn = item.qty - previouslyReturned;
                const currentReturnSelection =
                  returnModal.returnQtys[itemId] || 0;
                const isMultiQty =
                  item.qty > 1 ||
                  item.selectedUnit === "Gram" ||
                  item.selectedUnit === "Kg";

                return (
                  <div
                    key={i}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl flex justify-between items-center"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">
                        {item.name}
                      </p>
                      <div className="text-[10px] font-medium text-gray-500 mt-1">
                        Purchased:{" "}
                        <strong>
                          {item.qty} {item.selectedUnit || item.unit}
                        </strong>
                        {previouslyReturned > 0 && (
                          <span className="ml-2 text-red-500 font-bold">
                            Returned: {previouslyReturned}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[9px] uppercase font-bold text-gray-400">
                        Qty to Return
                      </span>
                      {availableToReturn > 0 ? (
                        isMultiQty ? (
                          <div className="flex items-center border rounded-lg overflow-hidden bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                            <button
                              onClick={() =>
                                updateReturnQty(
                                  itemId,
                                  currentReturnSelection -
                                    (item.selectedUnit === "Gram" ? 50 : 1),
                                  availableToReturn,
                                )
                              }
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 font-black text-sm"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              readOnly
                              value={currentReturnSelection}
                              className="w-12 text-center text-xs font-bold outline-none bg-transparent"
                            />
                            <button
                              onClick={() =>
                                updateReturnQty(
                                  itemId,
                                  currentReturnSelection +
                                    (item.selectedUnit === "Gram" ? 50 : 1),
                                  availableToReturn,
                                )
                              }
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 font-black text-sm"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              updateReturnQty(
                                itemId,
                                currentReturnSelection === 1 ? 0 : 1,
                                1,
                              )
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${currentReturnSelection === 1 ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
                          >
                            {currentReturnSelection === 1
                              ? "Selected ✓"
                              : "Select"}
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950 px-2 py-1 rounded-md">
                          Fully Returned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t dark:border-gray-800">
              <div className="flex justify-between items-center mb-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3 rounded-xl">
                <span className="text-sm font-bold text-green-800 dark:text-green-400">
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
                    setReturnModal({ show: false, order: null, returnQtys: {} })
                  }
                  className="px-5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 font-bold py-3 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced View Bill Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Receipt Details
                </h3>
                <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
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

            <div className="text-sm space-y-1 mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700">
              <p>
                <strong>Customer:</strong> {selectedOrder.customerName}
              </p>
              <p>
                <strong>Phone:</strong> {selectedOrder.customerPhone || "N/A"}
              </p>
              <p>
                <strong>Pay Mode:</strong> {selectedOrder.paymentMode}{" "}
                {selectedOrder.transactionId
                  ? `(${selectedOrder.transactionId})`
                  : ""}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {selectedOrder.date ||
                  new Date(selectedOrder.createdAt).toLocaleString()}
              </p>
            </div>

            <table className="w-full text-left text-sm mb-4 border-b dark:border-gray-800 pb-4">
              <thead>
                <tr className="border-b dark:border-gray-800 text-xs text-gray-500">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-center">Purchased</th>
                  <th className="pb-2 text-center">Returned</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {selectedOrder.items.map((item, i) => {
                  const itemPrice = (
                    (item.price + (item.price * (item.gst || 0)) / 100) *
                    (item.effectiveQty || item.qty)
                  ).toFixed(2);
                  return (
                    <tr key={i}>
                      <td className="py-2.5 font-medium pr-2 text-gray-800 dark:text-gray-200">
                        {item.name}
                      </td>
                      <td className="py-2.5 text-center text-gray-600 dark:text-gray-400">
                        {item.qty} {item.selectedUnit || item.unit}
                      </td>
                      <td className="py-2.5 text-center font-bold text-red-500">
                        {item.returnedQty > 0 ? item.returnedQty : "-"}
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-800 dark:text-gray-200">
                        <span
                          className={
                            item.returnedQty === item.qty
                              ? "line-through text-gray-400"
                              : ""
                          }
                        >
                          ₹{itemPrice}
                        </span>
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

              {selectedOrder.roundOffAmount !== 0 && (
                <p>
                  Round Off:{" "}
                  {selectedOrder.roundOffAmount > 0
                    ? `+₹${selectedOrder.roundOffAmount.toFixed(2)}`
                    : `-₹${Math.abs(selectedOrder.roundOffAmount).toFixed(2)}`}
                </p>
              )}

              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-2 border-t dark:border-gray-700 pt-2">
                Original Bill: ₹{selectedOrder.totalAmount?.toFixed(2)}
              </p>

              {selectedOrder.paymentMode === "Cash" &&
                selectedOrder.cashReceived > 0 && (
                  <>
                    <p>
                      Cash Received: ₹{selectedOrder.cashReceived.toFixed(2)}
                    </p>
                    <p>
                      Change Returned: ₹
                      {selectedOrder.changeToReturn?.toFixed(2)}
                    </p>
                  </>
                )}

              {selectedOrder.refundedAmount > 0 && (
                <p className="text-sm font-black text-red-500 mt-1 bg-red-50 dark:bg-red-900/20 inline-block px-2 py-1 rounded">
                  - Refunded: ₹{selectedOrder.refundedAmount.toFixed(2)}
                </p>
              )}

              <div className="border-t dark:border-gray-700 pt-2 mt-2">
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
              onClick={() => window.print()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition"
            >
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Hidden Thermal Print Receipt */}
      {selectedOrder && (
        <div
          id="printable-order-receipt"
          className="hidden print:block bg-white text-black p-2 font-mono text-[10px] w-[80mm] mx-auto"
        >
          <h2 className="text-center font-bold text-base mb-0.5">
            Sanskar Tech POS
          </h2>
          <p className="text-center text-[9px] mb-2">Lalganj Ajhara</p>

          {selectedOrder.isReturned && (
            <h3 className="text-center font-black my-1 border-y border-black py-1">
              *** CANCELLED / RETURNED BILL ***
            </h3>
          )}

          <div className="mb-2 border-b border-black pb-1.5 space-y-0.5">
            <p>
              <strong>Order ID:</strong> #{selectedOrder._id.slice(-6)}
            </p>
            <p>
              <strong>Customer:</strong> {selectedOrder.customerName}
            </p>
            {selectedOrder.customerPhone && (
              <p>
                <strong>Phone:</strong> {selectedOrder.customerPhone}
              </p>
            )}
            <p>
              <strong>Pay Mode:</strong> {selectedOrder.paymentMode}
            </p>
            {selectedOrder.transactionId && (
              <p>
                <strong>Txn ID:</strong> {selectedOrder.transactionId}
              </p>
            )}
            <p>
              <strong>Date:</strong>{" "}
              {selectedOrder.date ||
                new Date(selectedOrder.createdAt).toLocaleString()}
            </p>
          </div>

          <table className="w-full text-left text-[10px] mb-2 border-b border-black pb-1">
            <thead>
              <tr className="border-b border-black">
                <th className="py-0.5">Item</th>
                <th>Qty</th>
                <th className="text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items.map((item, i) => {
                const itemTotal =
                  (item.price + (item.price * (item.gst || 0)) / 100) *
                  (item.effectiveQty || item.qty);
                return (
                  <tr key={i}>
                    <td className="py-0.5">
                      {item.name}{" "}
                      {item.returnedQty > 0 ? `(Ret: ${item.returnedQty})` : ""}
                    </td>
                    <td>
                      {item.qty} {item.selectedUnit || item.unit || "Pcs"}
                    </td>
                    <td className="text-right">₹{itemTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="text-[10px] text-right mb-4 space-y-0.5">
            <p>Subtotal: ₹{selectedOrder.subTotal?.toFixed(2)}</p>
            <p>Tax: ₹{selectedOrder.totalTax?.toFixed(2)}</p>

            {selectedOrder.customFees?.map((fee, idx) => (
              <p key={idx}>
                {fee.name}: ₹{fee.amount.toFixed(2)}
              </p>
            ))}

            {selectedOrder.discountAmount > 0 && (
              <p>Discount: -₹{selectedOrder.discountAmount.toFixed(2)}</p>
            )}

            {selectedOrder.roundOffAmount !== 0 && (
              <p>
                Round Off:{" "}
                {selectedOrder.roundOffAmount > 0
                  ? `+₹${selectedOrder.roundOffAmount.toFixed(2)}`
                  : `-₹${Math.abs(selectedOrder.roundOffAmount).toFixed(2)}`}
              </p>
            )}

            <p className="font-bold mt-1">
              Total Bill: ₹{selectedOrder.totalAmount?.toFixed(2)}
            </p>

            {selectedOrder.paymentMode === "Cash" &&
              selectedOrder.cashReceived > 0 && (
                <>
                  <p>Received: ₹{selectedOrder.cashReceived.toFixed(2)}</p>
                  <p>Change: ₹{selectedOrder.changeToReturn?.toFixed(2)}</p>
                </>
              )}

            {selectedOrder.refundedAmount > 0 && (
              <p className="font-bold border-y border-black py-0.5 my-0.5">
                Refunded: -₹{selectedOrder.refundedAmount.toFixed(2)}
              </p>
            )}

            <p className="font-black text-xs mt-1 border-t border-black pt-1">
              Net Amount: ₹
              {(
                (selectedOrder.totalAmount || 0) -
                (selectedOrder.refundedAmount || 0)
              ).toFixed(2)}
            </p>
          </div>
          <p className="text-center text-[10px] italic">
            Thank you for visiting!
          </p>
        </div>
      )}
    </div>
  );
}
