// client/src/components/CustomerDetails.jsx
import React from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  IndianRupee,
  Package,
} from 'lucide-react';

const CustomerDetails = ({ customer, onBack }) => {
  if (!customer) return null;

  const billing = customer.billing || {};
  const shipping = customer.shipping || {};
  const orders = customer.orders || [];

  const formattedDate =
    customer.date_created &&
    new Date(customer.date_created).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-700',
      processing: 'bg-blue-100 text-blue-700',
      'on-hold': 'bg-yellow-100 text-yellow-700',
      pending: 'bg-orange-100 text-orange-700',
      cancelled: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700',
      failed: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="animate-fade-in min-h-screen bg-gray-50 flex flex-col pb-0">
      {/* Header (sticky) */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft size={22} className="text-gray-600" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {customer.avatar_url ? (
              <img
                src={customer.avatar_url}
                alt={customer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-600 text-xs font-bold">
                {customer.name?.charAt(0) || 'C'}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-800">{customer.name}</h1>
            <p className="text-xs text-gray-500">
              {customer.email || 'No email'} {customer.phone && `• ${customer.phone}`}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* Summary Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <ShoppingBag size={14} />
              Orders
            </div>
            <div className="text-xl font-bold text-gray-800">
              {customer.orders_count || 0}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
              <IndianRupee size={14} />
              Total Spent
            </div>
            <div className="text-xl font-bold text-purple-700">
              ₹{(customer.total_spent || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Meta (joined date) */}
        {formattedDate && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Customer since</div>
            <div className="text-sm font-semibold text-gray-800">{formattedDate}</div>
          </div>
        )}

        {/* Contact actions */}
        {(customer.email || customer.phone) && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50"
              >
                <Phone size={14} />
                Call
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50"
              >
                <Mail size={14} />
                Email
              </a>
            )}
          </div>
        )}

        {/* Orders List */}
        {orders.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                <Package size={16} />
                Order History ({orders.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {orders.map((order) => {
                const orderDate = new Date(order.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div key={order.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          Order #{order.id}
                        </div>
                        <div className="text-xs text-gray-500">{orderDate}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-800">
                          ₹{Number(order.total).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">{order.items} item(s)</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Billing Address */}
        {billing && (billing.address_1 || billing.city || billing.state) && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm text-gray-800 mb-2 border-b border-gray-100 pb-1">
              Billing Address
            </h3>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <MapPin size={14} />
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                {billing.address_1 && <p>{billing.address_1}</p>}
                {(billing.city || billing.state || billing.postcode) && (
                  <p>
                    {billing.city}, {billing.state} {billing.postcode}
                  </p>
                )}
                {billing.country && <p>{billing.country}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Shipping Address */}
        {shipping && (shipping.address_1 || shipping.city || shipping.state) && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm text-gray-800 mb-2 border-b border-gray-100 pb-1">
              Shipping Address
            </h3>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                <MapPin size={14} />
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                {shipping.address_1 && <p>{shipping.address_1}</p>}
                {(shipping.city || shipping.state || shipping.postcode) && (
                  <p>
                    {shipping.city}, {shipping.state} {shipping.postcode}
                  </p>
                )}
                {shipping.country && <p>{shipping.country}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetails;