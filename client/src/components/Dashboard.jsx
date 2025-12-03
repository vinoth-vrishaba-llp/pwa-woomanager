// client/src/components/Dashboard.jsx
import React from "react";
import {
  Package,
  ShoppingBag,
  RefreshCw,
  Bell,
  IndianRupee,
  Users,
  Box,
  Clock,
  OctagonX,
} from "lucide-react";

import StatusBadge from "./ui/StatusBadge";
import LoadingState from "./ui/LoadingState";
import ErrorState from "./ui/ErrorState";

const Dashboard = ({
  navigate,
  data,
  loading,
  error,
  onRefresh,
  config,
  salesReport,
  notificationsCount = 0,
  onSelectOrder,
  onOpenNotifications,
  abandonedCarts = [],
  newAbandonedCount = 0,
  onOpenAbandoned,
}) => {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRefresh} />;

  const orders = Array.isArray(data.orders) ? data.orders : [];
  const hasNewAbandoned = (newAbandonedCount || 0) > 0;

  // -------- Date helpers (fix timezone weirdness) --------
  // Backend sends ISO (UTC). We want to treat it as "local-like" time
  // so we strip trailing 'Z' to avoid double timezone shifting.
  const parseOrderDate = (value) => {
    if (!value) return null;
    const str = String(value);
    const localLike = str.endsWith("Z") ? str.slice(0, -1) : str;
    const d = new Date(localLike);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const formatOrderDate = (value, withDateOnly = false) => {
    const d = parseOrderDate(value);
    if (!d) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      ...(withDateOnly
        ? {}
        : {
            hour: "2-digit",
            minute: "2-digit",
          }),
    });
  };

  // ---- Normalize salesReport: handle array or single object ----
  const reportSummary = salesReport
    ? Array.isArray(salesReport)
      ? salesReport[0] || null
      : salesReport
    : null;

  const fallbackTotalSales = orders.reduce(
    (acc, curr) => acc + (Number(curr.total) || 0),
    0
  );

  const totalSales = reportSummary
    ? Number(reportSummary.total_sales || 0)
    : fallbackTotalSales;

  const totalOrders = reportSummary
    ? Number(reportSummary.total_orders || 0)
    : orders.length;

  const netSales = reportSummary ? Number(reportSummary.net_sales || 0) : null;
  const avgSales = reportSummary
    ? Number(reportSummary.average_sales || 0)
    : null;
  const totalItems = reportSummary
    ? Number(reportSummary.total_items || 0)
    : null;
  const totalShipping = reportSummary
    ? Number(reportSummary.total_shipping || 0)
    : null;

  const recentOrders = orders.slice(0, 3);

  // ---- Last 7 days orders list ----
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);

  const last7DaysOrders = orders
    .filter((o) => {
      if (!o.date) return false;
      const d = parseOrderDate(o.date);
      if (!d) return false;
      return d >= sevenDaysAgo;
    })
    .sort((a, b) => {
      const da = parseOrderDate(a.date);
      const db = parseOrderDate(b.date);
      return (db?.getTime() || 0) - (da?.getTime() || 0);
    })
    .slice(0, 5);

  return (
    <div className="pb-24 animate-fade-in">
      <header className="bg-purple-700 text-white p-6 rounded-b-3xl shadow-lg mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-purple-200 text-xs truncate max-w-[220px]">
              {config.useMock ? "Demo Store" : config.url}
            </p>

            {hasNewAbandoned && (
              <button
                type="button"
                onClick={onOpenAbandoned}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/90 text-amber-800 text-[10px] font-semibold border border-amber-200 shadow-sm active:scale-95 transition"
              >
                <OctagonX size={12} className="shrink-0" />
                <span>
                  {newAbandonedCount} abandoned cart
                  {newAbandonedCount > 1 ? "s" : ""}
                </span>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="p-2 bg-purple-600 rounded-full hover:bg-purple-500 transition active:scale-90"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={onOpenNotifications}
              className="relative p-2 bg-purple-600 rounded-full hover:bg-purple-500 transition active:scale-90"
            >
              <Bell size={20} />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                  {notificationsCount > 9 ? "9+" : notificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sales card */}
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center gap-2 text-purple-200 mb-1 text-xs uppercase font-bold tracking-wider">
              <IndianRupee size={14} /> Sales (Last 30 days)
            </div>
            <div className="text-2xl font-bold text-white">
              ₹{Number(totalSales || 0).toFixed(2)}
            </div>
            {reportSummary ? (
              <div className="mt-2 text-[11px] text-purple-100 flex justify-between">
                <span>Net: ₹{Number(netSales || 0).toFixed(2)}</span>
                <span>Avg/day: ₹{Number(avgSales || 0).toFixed(2)}</span>
              </div>
            ) : (
              <div className="text-xs text-purple-100 mt-2">
                Based on loaded orders
              </div>
            )}
          </div>

          {/* Orders card */}
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center gap-2 text-purple-200 mb-1 text-xs uppercase font-bold tracking-wider">
              <Package size={14} /> Orders (Last 30 days)
            </div>
            <div className="text-2xl font-bold text-white">
              {Number(totalOrders || 0)}
            </div>
            {reportSummary ? (
              <div className="mt-2 text-[11px] text-purple-100 flex justify-between">
                <span>Items: {Number(totalItems || 0)}</span>
                <span>Shipping: ₹{Number(totalShipping || 0).toFixed(2)}</span>
              </div>
            ) : (
              <div className="text-xs text-purple-100 mt-2">
                {orders.length} orders loaded
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Quick actions */}
      <div className="px-4 mb-6">
        <h3 className="text-gray-800 font-bold mb-3 text-sm uppercase tracking-wide">
          Quick Actions
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => navigate("products")}
            className="flex flex-col items-center min-w-[80px] gap-2 group"
          >
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shadow-sm group-active:scale-95 transition">
              <Box size={22} />
            </div>
            <span className="text-xs font-medium text-gray-600">
              Products
            </span>
          </button>

          <button
            onClick={() => navigate("orders")}
            className="flex flex-col items-center min-w-[80px] gap-2 group"
          >
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-sm group-active:scale-95 transition">
              <ShoppingBag size={22} />
            </div>
            <span className="text-xs font-medium text-gray-600">
              View Orders
            </span>
          </button>

          <button
            onClick={() => navigate("customers")}
            className="flex flex-col items-center min-w-[80px] gap-2 group"
          >
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-sm group-active:scale-95 transition">
              <Users size={22} />
            </div>
            <span className="text-xs font-medium text-gray-600">
              Customers
            </span>
          </button>

          {/* Abandoned Carts quick action */}
          <button
            onClick={() => navigate("abandoned-carts")}
            className="flex flex-col items-center min-w-[100px] gap-2 group"
          >
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center shadow-sm group-active:scale-95 transition">
              <Package size={22} />
            </div>
            <span className="text-xs font-medium text-gray-600 text-center">
              Abandoned Carts
            </span>
          </button>
        </div>
      </div>

      {/* Last 7 days orders */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wide">
            Last 7 days orders
          </h3>
          <button
            onClick={() => navigate("orders")}
            className="text-purple-600 text-xs font-medium"
          >
            View all
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {last7DaysOrders.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No orders in the last 7 days.
            </div>
          ) : (
            last7DaysOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => onSelectOrder && onSelectOrder(order)}
                className="w-full text-left p-4 border-b last:border-0 border-gray-100 flex justify-between items-center active:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[11px]">
                    {order.customer?.charAt(0) || "O"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">
                      #{order.id} • {order.customer || "Customer"}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {order.items} items •{" "}
                      {order.date ? formatOrderDate(order.date) : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-800 text-sm">
                    ₹{Number(order.total || 0).toFixed(2)}
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wide">
            Recent Orders
          </h3>
          <button
            onClick={() => navigate("orders")}
            className="text-purple-600 text-sm font-medium"
          >
            View All
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {recentOrders.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No orders found.
            </div>
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 border-b last:border-0 border-gray-100 flex justify-between items-center active:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                    {order.customer?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">
                      #{order.id} - {order.customer}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.items} items •{" "}
                      {order.date ? formatOrderDate(order.date) : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-800">
                    ₹{Number(order.total || 0).toFixed(2)}
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
