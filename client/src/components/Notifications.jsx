// client/src/components/Notifications.jsx
import React from 'react';
import { ArrowLeft, Bell, ShoppingBag, RefreshCw } from 'lucide-react';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';
import StatusBadge from './ui/StatusBadge';

const Notifications = ({
  notifications,
  loading,
  error,
  onRefresh,
  onLogout,
  onSelectOrder,
}) => {
  const safeNotifications = Array.isArray(notifications)
    ? notifications
    : [];

  if (loading) return <LoadingState />;
  if (error)
    return (
      <ErrorState message={error} onRetry={onRefresh} onLogout={onLogout} />
    );

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-purple-600" />
          <h1 className="text-xl font-bold text-gray-800">Notifications</h1>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 bg-gray-100 rounded-full active:scale-95 transition"
        >
          <RefreshCw size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="mt-4 space-y-3">
        {safeNotifications.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No recent order notifications.
          </div>
        )}

        {safeNotifications.map((order) => {
          const createdAt = order.date
            ? new Date(order.date).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';

          return (
            <button
              key={order.id}
              onClick={() => onSelectOrder && onSelectOrder(order)}
              className="w-full text-left bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={18} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      New order #{order.id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.customer || 'Customer'} • {createdAt}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>{order.items || 0} items</span>
                  <span className="font-bold text-gray-800">
                    ₹{(order.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
