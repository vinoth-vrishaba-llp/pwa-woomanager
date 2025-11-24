import React from "react";
import {
  Package,
  ShoppingBag,
  RefreshCw,
  Bell,
  IndianRupee,
  ArrowUpRight,
  Plus,
  Users,
} from "lucide-react";
import StatusBadge from "./ui/StatusBadge";
import LoadingState from "./ui/LoadingState";
import ErrorState from "./ui/ErrorState";

const Dashboard = ({ navigate, data, loading, error, onRefresh, config }) => {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRefresh} />;

  const recentOrders = data.orders ? data.orders.slice(0, 3) : [];
  const totalSales = data.orders
    ? data.orders.reduce((acc, curr) => acc + (curr.total || 0), 0)
    : 0;

  return (
    <div className="pb-24 animate-fade-in">
      <header className="bg-purple-700 text-white p-6 rounded-b-3xl shadow-lg mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-purple-200 text-xs truncate max-w-[200px]">
              {config.useMock ? "Demo Store" : config.url}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="p-2 bg-purple-600 rounded-full hover:bg-purple-500 transition active:scale-90"
            >
              <RefreshCw size={20} />
            </button>
            <button className="p-2 bg-purple-600 rounded-full hover:bg-purple-500 transition active:scale-90">
              <Bell size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center gap-2 text-purple-200 mb-1 text-xs uppercase font-bold tracking-wider">
              <IndianRupee size={14} /> Sales
            </div>
            <div className="text-2xl font-bold text-white">
              ₹{totalSales.toFixed(2)}
            </div>
            <div className="text-xs text-green-300 flex items-center mt-1">
              <ArrowUpRight size={12} className="mr-1" /> +12.5%
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center gap-2 text-purple-200 mb-1 text-xs uppercase font-bold tracking-wider">
              <Package size={14} /> Orders
            </div>
            <div className="text-2xl font-bold text-white">
              {data.orders?.length || 0}
            </div>
            <div className="text-xs text-green-300 flex items-center mt-1">
              <ArrowUpRight size={12} className="mr-1" /> +4 pending
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 mb-8">
        <h3 className="text-gray-800 font-bold mb-3 text-sm uppercase tracking-wide">
          Quick Actions
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => navigate("products")}
            className="flex flex-col items-center min-w-[80px] gap-2 group"
          >
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shadow-sm group-active:scale-95 transition">
              <Plus size={24} />
            </div>
            <span className="text-xs font-medium text-gray-600">
              Add Product
            </span>
          </button>
          <button
            onClick={() => navigate("orders")}
            className="flex flex-col items-center min-w-[80px] gap-2 group"
          >
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-sm group-active:scale-95 transition">
              <ShoppingBag size={24} />
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
              <Users size={24} />
            </div>
            <span className="text-xs font-medium text-gray-600">Customers</span>
          </button>
        </div>
      </div>

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
                      {order.items} items • {order.date}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-800">
                    ₹{order.total.toFixed(2)}
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
