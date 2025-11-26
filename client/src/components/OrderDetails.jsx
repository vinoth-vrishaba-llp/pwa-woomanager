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

const OrderDetails = ({ order, onBack }) => {
  if (!order) return null;

  // Safe numeric values
  const total = Number(order.total || 0);
  const shippingTotal = Number(order.shipping_total || 0);
  const discountTotal = Number(order.discount_total || 0);

  return (
    <div className="pb-24 pt-0 px-0 animate-fade-in min-h-screen bg-gray-50 z-20 absolute inset-0">
      {/* Header */}
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

      <div className="p-4 space-y-4">
        {/* Total card */}
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
              {order.payment_method || "N/A"}
            </span>
          </div>
        </div>

        {/* 🔹 Charges card (shipping + discount) */}
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
