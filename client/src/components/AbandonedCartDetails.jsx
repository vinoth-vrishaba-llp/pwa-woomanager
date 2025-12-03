// client/src/components/AbandonedCartDetails.jsx
import React from "react";
import { ArrowLeft, ShoppingCart, Mail, User, Globe2 } from "lucide-react";
import LoadingState from "./ui/LoadingState";
import ErrorState from "./ui/ErrorState";

const AbandonedCartDetails = ({ cart, loading, error, onBack, onRefresh }) => {
  if (loading) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={onRefresh}
      />
    );

  if (!cart) {
    return (
      <div className="pb-24 pt-16 px-4 min-h-screen bg-gray-50">
        <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">
            Abandoned Cart
          </h1>
        </div>
        <div className="mt-16 text-center text-gray-400 text-sm">
          No cart selected.
        </div>
      </div>
    );
  }

  const {
    id,
    userName,
    email,
    cartTotal,
    orderStatus,
    country,
    dateTime,
    unsubscribed,
    items,
  } = cart;

  const name = userName?.trim() || "Guest";
  const status = orderStatus || "Unknown";
  const total = Number(cartTotal || 0);

  const statusColor =
    status === "Abandoned"
      ? "bg-orange-100 text-orange-700"
      : status === "Successful"
      ? "bg-green-100 text-green-700"
      : status === "Lost"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-600";

  const itemsArray = Array.isArray(items) ? items : [];

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

        <h1 className="text-lg font-bold text-gray-800">
          Cart #{id}
        </h1>

        <button
          onClick={onRefresh}
          className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700 active:scale-95"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* Summary card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <ShoppingCart size={18} className="text-yellow-700" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Abandoned Cart #{id}
                </p>
                <p className="text-xs text-gray-500">{dateTime}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}
              >
                {status}
              </span>
            </div>

            <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
              <span>Total cart value</span>
              <span className="text-base font-bold text-gray-900">
                ₹{total.toFixed(2)}
              </span>
            </div>

            {unsubscribed ? (
              <p className="mt-2 text-[11px] text-red-500">
                This contact has unsubscribed from follow-ups.
              </p>
            ) : null}
          </div>
        </div>

        {/* Customer info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 mb-1">
            Customer
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-800">
            <User size={14} className="text-gray-500" />
            <span>{name}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-800">
            <Mail size={14} className="text-gray-500" />
            <span>{email || "No email"}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-800">
            <Globe2 size={14} className="text-gray-500" />
            <span>{country || "Country not specified"}</span>
          </div>
        </div>

        {/* Items list (if available) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            Cart items
          </p>

          {itemsArray.length === 0 && (
            <p className="text-xs text-gray-400">
              Item-level data not available from the API.
            </p>
          )}

          {itemsArray.length > 0 && (
            <div className="space-y-2">
              {itemsArray.map((item, idx) => {
                const title =
                  item.product_name ||
                  item.name ||
                  item.productTitle ||
                  "Cart item";

                const qty = item.quantity || item.qty || 1;
                const lineTotal = Number(
                  item.line_total || item.total || 0
                );

                return (
                  <div
                    key={item.id || idx}
                    className="flex justify-between items-center text-xs border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="flex-1 pr-2">
                      <p className="font-medium text-gray-800">{title}</p>
                      <p className="text-[11px] text-gray-500">
                        Qty: {qty}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ₹{lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AbandonedCartDetails;
