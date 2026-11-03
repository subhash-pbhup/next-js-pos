"use client";
import { useState, useEffect } from "react";

export default function ReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState("This Month");
  const [filterType, setFilterType] = useState("Overview");

  // Summary Metrics State
  const [metrics, setMetrics] = useState({
    totalOrdersCount: 0,
    netOrderAmount: 0,
    totalRefundAmount: 0,
    averageOrderValue: 0,
    totalDiscount: 0,
    totalTaxAmount: 0,
    totalProductSaleAmount: 0, // Without tax/discount
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      calculateMetrics();
    }
  }, [orders, dateRange]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bills?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch reports data", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    // 1. Filter Orders based on selected Date Range
    let filtered = [...orders];
    const today = new Date();

    if (dateRange === "Today") {
      filtered = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d.toDateString() === today.toDateString();
      });
    } else if (dateRange === "This Week") {
      const firstDay = new Date(
        today.setDate(today.getDate() - today.getDay()),
      );
      filtered = orders.filter((o) => new Date(o.createdAt) >= firstDay);
    } else if (dateRange === "This Month") {
      filtered = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return (
          d.getMonth() === new Date().getMonth() &&
          d.getFullYear() === new Date().getFullYear()
        );
      });
    }

    // 2. Calculate values
    let totalCount = filtered.length;
    let netAmount = 0;
    let totalRefund = 0;
    let totalDisc = 0;
    let totalTax = 0;
    let productSale = 0;

    filtered.forEach((o) => {
      const orderTotal = o.totalAmount || 0;
      const refund = o.refundedAmount || 0;

      netAmount += orderTotal - refund;
      totalRefund += refund;
      totalDisc += o.discountAmount || 0;
      totalTax += o.totalTax || 0;
      productSale += o.subTotal || 0;
    });

    const avgOrder = totalCount > 0 ? netAmount / totalCount : 0;

    setMetrics({
      totalOrdersCount: totalCount,
      netOrderAmount: netAmount,
      totalRefundAmount: totalRefund,
      averageOrderValue: avgOrder,
      totalDiscount: totalDisc,
      totalTaxAmount: totalTax,
      totalProductSaleAmount: productSale,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="font-bold text-gray-500">Loading Reports Data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-950 min-h-[90vh] text-gray-900 dark:text-gray-100 transition-colors">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your store's performance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex flex-col px-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1">
              Filter By
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm font-bold bg-transparent outline-none cursor-pointer"
            >
              <option value="Overview">Overview</option>
              <option value="Sales">Sales Mode</option>
            </select>
          </div>

          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2"></div>

          <div className="flex flex-col px-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm font-bold bg-transparent outline-none cursor-pointer text-blue-600 dark:text-blue-400"
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          <button
            onClick={fetchOrders}
            className="ml-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-800 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Net Order */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <span className="text-green-500 text-xl">💰</span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider relative z-10">
            Net Order Revenue
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white relative z-10">
            ₹{metrics.netOrderAmount.toFixed(2)}
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <span className="text-blue-500 text-xl">🧾</span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider relative z-10">
            Total Orders
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white relative z-10">
            {metrics.totalOrdersCount}
          </p>
        </div>

        {/* Average Order */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
            <span className="text-purple-500 text-xl">📈</span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider relative z-10">
            Average Order
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white relative z-10">
            ₹{metrics.averageOrderValue.toFixed(2)}
          </p>
        </div>

        {/* Total Refund */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <span className="text-red-500 text-xl">↩️</span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider relative z-10">
            Total Refunded
          </p>
          <p className="text-3xl font-black text-red-600 dark:text-red-400 relative z-10">
            ₹{metrics.totalRefundAmount.toFixed(2)}
          </p>
        </div>

        {/* Secondary Metrics */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <p className="text-[10px] font-bold text-gray-500 uppercase">
            POS Discount Given
          </p>
          <p className="text-lg font-bold mt-1 text-gray-800 dark:text-gray-200">
            ₹{metrics.totalDiscount.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <p className="text-[10px] font-bold text-gray-500 uppercase">
            Total Tax Collected
          </p>
          <p className="text-lg font-bold mt-1 text-gray-800 dark:text-gray-200">
            ₹{metrics.totalTaxAmount.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <p className="text-[10px] font-bold text-gray-500 uppercase">
            Gross Product Sale
          </p>
          <p className="text-lg font-bold mt-1 text-gray-800 dark:text-gray-200">
            ₹{metrics.totalProductSaleAmount.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 opacity-50">
          <p className="text-[10px] font-bold text-gray-500 uppercase">
            Shipping Tax
          </p>
          <p className="text-lg font-bold mt-1 text-gray-800 dark:text-gray-200">
            ₹0.00
          </p>
        </div>
      </div>

      {/* Chart Section Placeholder */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex justify-between items-center mb-6 border-b dark:border-gray-800 pb-4">
          <h2 className="text-lg font-black">Sales Trend</h2>
          <select className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold p-2 rounded-lg outline-none cursor-pointer">
            <option>Area Chart</option>
            <option>Bar Chart</option>
          </select>
        </div>

        {/* CSS Based Mock Chart - Will show visual representation of data based on filters */}
        <div className="h-64 flex items-end justify-between gap-2 pt-4 relative">
          {/* Horizontal lines */}
          <div className="absolute inset-0 flex flex-col justify-between z-0 pointer-events-none opacity-20">
            <div className="w-full border-t border-gray-400 border-dashed"></div>
            <div className="w-full border-t border-gray-400 border-dashed"></div>
            <div className="w-full border-t border-gray-400 border-dashed"></div>
            <div className="w-full border-t border-gray-400 border-dashed"></div>
          </div>

          {/* Mock Bars */}
          {[40, 70, 45, 90, 65, 80, 100].map((height, i) => (
            <div
              key={i}
              className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-lg relative z-10 group hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-all cursor-pointer flex items-end"
              style={{ height: `${height}%` }}
            >
              <div
                className="w-full bg-blue-500 rounded-t-md"
                style={{ height: `${height * 0.8}%` }}
              ></div>
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap">
                Day {i + 1}: ₹
                {((metrics.netOrderAmount * (height / 100)) / 7).toFixed(0)}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>
    </div>
  );
}
