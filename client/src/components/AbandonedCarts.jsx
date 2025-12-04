import React from "react";
import { ArrowLeft, ShoppingCart, RefreshCcw } from "lucide-react";
import LoadingState from "./ui/LoadingState";
import ErrorState from "./ui/ErrorState";

// 🔹 Format date/time in Asia/Kolkata
const formatDateTimeIST = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(d);
};

const AbandonedCarts = ({
  carts,
  loading,
  error,
  onRefresh,
  onBack,
  onSelectCart,
  page = 1,         // 🔹 NEW
  totalPages = 1,   // 🔹 NEW
  onPageChange,     // 🔹 NEW
}) => {
  if (loading) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={onRefresh}
      />
    );

  // Backend might send either array or { items: [...] }
  const safeCarts = Array.isArray(carts)
    ? carts
    : Array.isArray(carts?.items)
    ? carts.items
    : [];

  const handlePrev = () => {
    if (!onPageChange) return;
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (!onPageChange) return;
    if (page < totalPages) onPageChange(page + 1);
  };

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>

        <h1 className="text-lg font-bold text-gray-800">Abandoned Carts</h1>

        <button
          onClick={onRefresh}
          className="p-2 bg-gray-100 rounded-full active:scale-95 transition"
        >
          <RefreshCcw size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="mt-4 space-y-3">
        {safeCarts.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No abandoned carts found.
          </div>
        )}

        {safeCarts.map((cart) => {
          const cartId = cart.id;
          const name = cart.userName?.trim() || "Guest";
          const email = cart.email || "No email";
          const status = cart.orderStatus || "Abandoned";
          const total = Number(cart.cartTotal || 0);

          // Prefer server-normalized date_iso (IST), fallback to dateTime
          const rawDate = cart.date_iso || cart.dateTime || "";
          const dateLabel = formatDateTimeIST(rawDate);

          const statusColor =
            status === "Abandoned"
              ? "bg-orange-100 text-orange-700"
              : status === "Successful"
              ? "bg-green-100 text-green-700"
              : status === "Lost"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-600";

          return (
            <button
              key={cartId}
              onClick={() => onSelectCart && onSelectCart(cart)}
              className="w-full text-left bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={18} className="text-yellow-600" />
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Abandoned Cart #{cartId}
                    </p>
                    <p className="text-xs text-gray-500">
                      {name} • {email}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
                  <span>{dateLabel}</span>
                  <span className="font-bold text-gray-900">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {/* 🔹 Pagination */}
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
      </div>
    </div>
  );
};

export default AbandonedCarts;
