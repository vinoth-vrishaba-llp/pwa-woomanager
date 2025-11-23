import React, { useState, useMemo } from 'react';
import { Package, RefreshCw, Search } from 'lucide-react';
import StatusBadge from './ui/StatusBadge';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';

const OrdersList = ({ orders, loading, error, onRefresh, onLogout, onSelectOrder }) => {
  const [filter, setFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [filter, orders]);

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in min-h-screen">
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Orders</h1>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-gray-100 rounded-full active:scale-95 transition"
          >
            <RefreshCw
              size={20}
              className={`text-gray-600 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
          <button className="p-2 bg-gray-100 rounded-full active:scale-95 transition">
            <Search size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mt-2 no-scrollbar">
        {['all', 'processing', 'completed', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} onLogout={onLogout} />
      ) : (
        <div className="space-y-3 mt-2">
          {filteredOrders.length === 0 && (
            <div className="text-center py-10 text-gray-400">No orders found.</div>
          )}
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                      order.status === 'processing'
                        ? 'bg-blue-500'
                        : order.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    }`}
                  >
                    <Package size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Order #{order.id}</h4>
                    <p className="text-xs text-gray-500">{order.date} via App</p>
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
                <div className="font-bold text-gray-900">₹{order.total.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersList;
