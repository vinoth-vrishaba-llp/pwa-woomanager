import React, { useEffect, useMemo, useState } from "react";
import { Users, RefreshCw, Search } from "lucide-react";
import LoadingState from "./ui/LoadingState";
import ErrorState from "./ui/ErrorState";

const CustomersList = ({
  customers,
  loading,
  error,
  onRefresh,
  onLogout,
  onSelectCustomer,
  onMount,        // called when component mounts
  page = 1,       // 🔹 NEW: current page
  totalPages = 1, // 🔹 NEW: total pages
  onPageChange,   // 🔹 NEW: (nextPage) => void
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const safeCustomers = Array.isArray(customers) ? customers : [];

  // Load customers when component mounts
  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, [onMount]);

  // Search filter (client-side on current page)
  const filteredCustomers = useMemo(() => {
    let result = [...safeCustomers];

    if (searchQuery.trim() !== "") {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        const name = (c.name || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    return result;
  }, [safeCustomers, searchQuery]);

  const resultCount = filteredCustomers.length;
  const resultLabel = `${resultCount} ${
    resultCount === 1 ? "customer" : "customers"
  } found on this page`;

  const handlePrev = () => {
    if (!onPageChange) return;
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (!onPageChange) return;
    if (page < totalPages) onPageChange(page + 1);
  };

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Customers</h1>
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

      {/* Content */}
      {loading ? (
        <div className="mt-14">
          <LoadingState message="Loading customers..." />
        </div>
      ) : error ? (
        <div className="mt-14">
          <ErrorState message={error} onRetry={onRefresh} onLogout={onLogout} />
        </div>
      ) : (
        <div className="space-y-3 mt-3">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search customers by name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              />
            </div>
          </div>

          {/* Result count */}
          <p className="text-xs text-gray-500">
            {resultLabel}
            {totalPages > 1 && ` • Page ${page} of ${totalPages}`}
          </p>

          {/* Customers list */}
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No customers found.
            </div>
          ) : (
            <>
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCustomer(c)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 text-xs font-bold">
                          {c.name?.charAt(0) || "C"}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.email || "No email"} {c.phone && `• ${c.phone}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total Spent</div>
                    <div className="font-bold text-purple-700 text-sm">
                      ₹{(c.total_spent || 0).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-end gap-1">
                      <Users size={12} className="text-gray-400" />
                      {c.orders_count || 0} orders
                    </div>
                  </div>
                </div>
              ))}

              {/* 🔹 Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handlePrev}
                    disabled={page <= 1}
                    className={`px-3 py-1 text-xs rounded-lg border ${
                      page <= 1
                        ? "border-gray-200 text-gray-300 cursor-not-allowed"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={page >= totalPages}
                    className={`px-3 py-1 text-xs rounded-lg border ${
                      page >= totalPages
                        ? "border-gray-200 text-gray-300 cursor-not-allowed"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomersList;
