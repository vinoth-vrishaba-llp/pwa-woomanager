import React, { useState, useMemo } from "react";
import { Package, RefreshCw, Search, CalendarRange, X, ChevronLeft, ChevronRight } from "lucide-react";
import StatusBadge from "./ui/StatusBadge";
import LoadingState from "./ui/LoadingState";
import ErrorState from "./ui/ErrorState";

const OrdersList = ({
  orders,
  loading,
  error,
  onRefresh,
  onLogout,
  onSelectOrder,
  onPageChange,
  currentPage = 1,
  totalPages = 1,
  totalOrders = 0,
}) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [quickRange, setQuickRange] = useState("none");

  const safeOrders = Array.isArray(orders) ? orders : [];

  // ---- Counts for pills (based on current page data) ----
  const { allCount, processingCount, completedCount, cancelledCount } =
    useMemo(() => {
      let processing = 0;
      let completed = 0;
      let cancelled = 0;

      safeOrders.forEach((o) => {
        if (o.status === "processing") processing++;
        if (o.status === "completed") completed++;
        if (o.status === "cancelled") cancelled++;
      });

      return {
        allCount: safeOrders.length,
        processingCount: processing,
        completedCount: completed,
        cancelledCount: cancelled,
      };
    }, [safeOrders]);

  // ---- Date helpers ----
  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const applyQuickRange = (range) => {
    if (quickRange === range) {
      setQuickRange("none");
      setFromDate("");
      setToDate("");
      handleFilterChange(1, statusFilter, "", "", "");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let from = null;
    let to = new Date(today);

    if (range === "today") {
      from = new Date(today);
    } else if (range === "7d") {
      from = new Date(today);
      from.setDate(from.getDate() - 6);
    } else if (range === "30d") {
      from = new Date(today);
      from.setDate(from.getDate() - 29);
    }

    const fromStr = from ? formatDateInput(from) : "";
    const toStr = formatDateInput(to);

    setQuickRange(range);
    setFromDate(fromStr);
    setToDate(toStr);
    handleFilterChange(1, statusFilter, searchQuery, fromStr, toStr);
  };

  const handleFromDateChange = (value) => {
    setQuickRange("none");
    setFromDate(value);
    handleFilterChange(1, statusFilter, searchQuery, value, toDate);
  };

  const handleToDateChange = (value) => {
    setQuickRange("none");
    setToDate(value);
    handleFilterChange(1, statusFilter, searchQuery, fromDate, value);
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
    setQuickRange("none");
    handleFilterChange(1, statusFilter, searchQuery, "", "");
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    handleFilterChange(1, status, searchQuery, fromDate, toDate);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    // Debounce search in production - for now immediate
    handleFilterChange(1, statusFilter, query, fromDate, toDate);
  };

  const handleFilterChange = (page, status, search, from, to) => {
    if (onPageChange) {
      onPageChange(page, {
        status: status !== "all" ? status : undefined,
        search: search || undefined,
        date_after: from || undefined,
        date_before: to || undefined,
      });
    }
  };

  const hasActiveDateFilter = Boolean(fromDate || toDate);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handleFilterChange(currentPage - 1, statusFilter, searchQuery, fromDate, toDate);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handleFilterChange(currentPage + 1, statusFilter, searchQuery, fromDate, toDate);
    }
  };

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Orders</h1>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-gray-100 rounded-full active:scale-95 transition"
          >
            <RefreshCw
              size={20}
              className={`text-gray-600 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Search + Date Range */}
      <div className="mt-14 space-y-3">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search orders by ID or customer..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* Quick ranges */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => applyQuickRange("today")}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap ${
              quickRange === "today"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange("7d")}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap ${
              quickRange === "7d"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange("30d")}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap ${
              quickRange === "30d"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Last 30 days
          </button>
        </div>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-200 bg-white">
            <CalendarRange size={14} className="text-gray-500" />
            <span className="font-medium text-gray-700">Custom range</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1 text-gray-600">
              <span className="text-[11px] uppercase tracking-wide">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => handleFromDateChange(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center gap-1 text-gray-600">
              <span className="text-[11px] uppercase tracking-wide">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => handleToDateChange(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </label>

            {hasActiveDateFilter && (
              <button
                type="button"
                onClick={clearDates}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => handleStatusFilterChange("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              statusFilter === "all"
                ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200"
                : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleStatusFilterChange("processing")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              statusFilter === "processing"
                ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200"
                : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            Processing
          </button>
          <button
            onClick={() => handleStatusFilterChange("completed")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              statusFilter === "completed"
                ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200"
                : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => handleStatusFilterChange("cancelled")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              statusFilter === "cancelled"
                ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200"
                : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} onLogout={onLogout} />
      ) : (
        <div className="space-y-3 mt-3">
          {/* Result count and pagination info */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <p>
              Showing {safeOrders.length > 0 ? ((currentPage - 1) * 20) + 1 : 0} - {Math.min(currentPage * 20, totalOrders)} of {totalOrders} orders
            </p>
            <p>Page {currentPage} of {totalPages}</p>
          </div>

          {safeOrders.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              No orders found.
            </div>
          )}

          {safeOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                      order.status === "processing"
                        ? "bg-blue-500"
                        : order.status === "completed"
                        ? "bg-green-500"
                        : order.status === "cancelled"
                        ? "bg-red-400"
                        : "bg-gray-400"
                    }`}
                  >
                    <Package size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">
                      Order #{order.id}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {order.date} via App
                    </p>
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                    {order.customer?.charAt(0)}
                  </div>
                  {order.customer}
                </div>
                <div className="font-bold text-gray-900">
                  ₹{order.total.toFixed(2)}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4 pb-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || loading}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentPage === 1 || loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700 active:scale-95"
                }`}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="text-sm font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentPage === totalPages || loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700 active:scale-95"
                }`}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrdersList;