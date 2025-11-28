import React from "react";
import {
  ArrowLeft,
  CreditCard,
  Users,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import StatusBadge from "./ui/StatusBadge";

/**
 * For the Payment Status card:
 * - Uses ONLY Razorpay response (no Woo status logic).
 * - Expect Razorpay response via `razorpayPayment` prop
 *   OR attached on the order as `order.razorpay_payment`.
 */
const OrderDetails = ({ order, onBack, razorpayPayment }) => {
  if (!order) return null;

  // Safe numeric values
  const total = Number(order.total || 0);
  const shippingTotal = Number(order.shipping_total || 0);
  const discountTotal = Number(order.discount_total || 0);

  // ----- Razorpay-only payment info for the Payment Status card -----
  const rpPayment = razorpayPayment || order.razorpay_payment || null;

  let paymentStatusLabel = "Not fetched";
  let paymentMethodLabel = "Not specified";
  let paymentStatusColor = "text-gray-600";

  if (rpPayment) {
    const rpStatus = (rpPayment.status || "").toLowerCase();
    const rpMethod = (rpPayment.method || "").toUpperCase();

    if (rpStatus === "captured") paymentStatusLabel = "Captured";
    else if (rpStatus === "authorized") paymentStatusLabel = "Authorized";
    else if (rpStatus === "created") paymentStatusLabel = "Created";
    else if (rpStatus === "refunded") paymentStatusLabel = "Refunded";
    else if (rpStatus === "failed") paymentStatusLabel = "Failed";
    else paymentStatusLabel = rpStatus || "Unknown";

    paymentMethodLabel = rpMethod || "Not specified";

    if (paymentStatusLabel === "Captured" || paymentStatusLabel === "Authorized") {
      paymentStatusColor = "text-green-600";
    } else if (paymentStatusLabel === "Created") {
      paymentStatusColor = "text-orange-600";
    } else if (["Failed", "Refunded"].includes(paymentStatusLabel)) {
      paymentStatusColor = "text-red-600";
    }
  }

  return (
    <div className="animate-fade-in min-h-screen bg-gray-50 flex flex-col pb-0">
      {/* Header (sticky) */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={22} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">Order #{order.id}</h1>
          <p className="text-xs text-gray-500">
            {order.date} • {order.customer}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* Total card (Woo) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Total Amount</span>
            <span className="text-xl font-bold text-purple-700">
              ₹{total.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-1">
              <CreditCard size={14} /> Payment
            </span>
            <span className="font-medium text-gray-700">
              {order.payment_method_title ||
                order.payment_method ||
                "Not specified"}
            </span>
          </div>
        </div>

        {/* Payment Status (Razorpay only) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Payment Status (Razorpay)
          </h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-500">Status</span>
              <span className={`font-semibold ${paymentStatusColor}`}>
                {paymentStatusLabel}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-gray-500">Method</span>
              <span className="font-semibold text-gray-900 text-right">
                {paymentMethodLabel}
              </span>
            </div>
          </div>

          {!rpPayment && (
            <p className="text-[11px] text-orange-500 mt-3">
              Razorpay payment details not loaded yet.
            </p>
          )}
        </div>

        {/* Charges card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Charges
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-500">Shipping</span>
              <span className="font-semibold text-gray-900">
                ₹{shippingTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-gray-500">Discount</span>
              <span className="font-semibold text-gray-900">
                {discountTotal > 0
                  ? `-₹${discountTotal.toFixed(2)}`
                  : `₹${Math.abs(discountTotal).toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Items card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-bold text-xs text-gray-500 uppercase tracking-wider">
            Items ({order.line_items?.length || 0})
          </div>
          <div className="divide-y divide-gray-100">
            {order.line_items?.length > 0 ? (
              order.line_items.map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-gray-700 text-sm">
                    ₹{parseFloat(item.total || 0).toFixed(2)}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">
                No items details available
              </div>
            )}
          </div>
        </div>

        {/* Customer card */}
        {order.billing && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2 mb-2">
              Customer
            </h3>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Users size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {order.billing.first_name} {order.billing.last_name}
                </p>
                <p className="text-xs text-gray-500">Customer</p>
              </div>
            </div>

            {(order.billing.email || order.billing.phone) && (
              <div className="flex gap-2 mt-2">
                {order.billing.phone && (
                  <a
                    href={`tel:${order.billing.phone}`}
                    className="flex-1 py-2 border border-gray-200 rounded-lg flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Phone size={14} className="mr-1" /> Call
                  </a>
                )}
                {order.billing.email && (
                  <a
                    href={`mailto:${order.billing.email}`}
                    className="flex-1 py-2 border border-gray-200 rounded-lg flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Mail size={14} className="mr-1" /> Email
                  </a>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} />
              </div>
              <div className="text-sm text-gray-600">
                <p>{order.billing.address_1}</p>
                <p>
                  {order.billing.city}, {order.billing.state}{" "}
                  {order.billing.postcode}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
