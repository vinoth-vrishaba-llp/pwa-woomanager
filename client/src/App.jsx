// client/src/App.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Home, Package, ShoppingBag, BarChart2, Settings } from "lucide-react";

import LoginView from "./components/LoginView";
import Dashboard from "./components/Dashboard";
import OrdersList from "./components/OrdersList";
import OrderDetails from "./components/OrderDetails";
import ProductsList from "./components/ProductsList";
import Analytics from "./components/Analytics";
import SettingsView from "./components/SettingsView";
import CustomersList from "./components/CustomersList";
import CustomerDetails from "./components/CustomerDetails";
import Notifications from "./components/Notifications";
import SsoComplete from "./components/SsoComplete";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // unified session:
  // { type:'sso', store_id, store_url, app_user_id }
  // or { type:'manual', config: { url, key, secret, useProxy, useMock } }
  const [session, setSession] = useState(null);

  const [data, setData] = useState({
    orders: [],
    products: [],
    customers: [],
  });

  const [salesReport, setSalesReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // ---- route: /sso-complete handled separately ----
  const path = window.location.pathname;
  if (path.startsWith("/sso-complete")) {
    return <SsoComplete />;
  }

  // -------- Load session from localStorage --------
  useEffect(() => {
    const ssoRaw = localStorage.getItem("woo_manager_store");
    if (ssoRaw) {
      try {
        const parsed = JSON.parse(ssoRaw);
        if (parsed && parsed.store_id && parsed.store_url) {
          setSession({ type: "sso", ...parsed });
          return;
        }
      } catch {
        // ignore
      }
    }

    // fallback: legacy manual config
    const legacyConfigRaw = localStorage.getItem("woo_manager_config");
    if (legacyConfigRaw) {
      try {
        const cfg = JSON.parse(legacyConfigRaw);
        setSession({ type: "manual", config: cfg });
      } catch {
        // ignore
      }
    }
  }, []);

  // -------- Auth / session handlers --------
  const handleLogin = (config) => {
    // manual mode (NOT recommended for production, but kept for now)
    setSession({ type: "manual", config });
    localStorage.setItem("woo_manager_config", JSON.stringify(config));
  };

  const handleDemo = () => {
    const demoConfig = {
      useMock: true,
      url: "https://demo.store",
      key: "demo",
      secret: "demo",
      useProxy: false,
    };
    setSession({ type: "manual", config: demoConfig });
    localStorage.setItem("woo_manager_config", JSON.stringify(demoConfig));
  };

  const handleLogout = () => {
    setSession(null);
    setData({ orders: [], products: [], customers: [] });
    setSalesReport(null);
    setError(null);
    setActiveTab("dashboard");
    setSelectedOrder(null);
    setSelectedCustomer(null);
    localStorage.removeItem("woo_manager_store");
    localStorage.removeItem("woo_manager_config");
  };

  // -------- Fetch everything via /api/bootstrap --------
  const fetchAllData = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      let bodyObj;
      if (session.type === "sso") {
        bodyObj = { store_id: session.store_id };
      } else if (session.type === "manual") {
        bodyObj = { config: session.config };
      } else {
        throw new Error("Invalid session type");
      }

      const res = await fetch(`${API_BASE_URL}/api/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch bootstrap data");
      }

      const json = await res.json();
      console.log("Bootstrap JSON from backend:", json);

      setData({
        orders: json.orders || [],
        products: json.products || [],
        customers: json.customers || [],
      });
      setSalesReport(json.report || null);
    } catch (err) {
      let msg = "Failed to connect.";
      if (
        err.message.includes("Failed to fetch") ||
        err.message.includes("CORS")
      ) {
        msg =
          "Connection blocked by browser security (CORS). Please enable 'Use CORS Proxy' in the login screen.";
      } else {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchAllData();
    }
  }, [session, fetchAllData]);

  // -------- Selection handlers --------
  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setActiveTab("order-details");
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setActiveTab("customer-details");
  };

  // -------- Derived notifications (last 24h orders) --------
  const derivedNotifications = useMemo(() => {
    const safeOrders = Array.isArray(data.orders) ? data.orders : [];
    if (!safeOrders.length) return [];

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);

    return safeOrders
      .filter((o) => {
        if (!o.date) return false;
        const d = new Date(o.date);
        if (Number.isNaN(d.getTime())) return false;
        return d >= start;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.orders]);

  const notificationsCount = derivedNotifications.length;

  // -------- If not logged in, show login --------
  if (!session) {
    return <LoginView onLogin={handleLogin} onDemo={handleDemo} />;
  }

  const storeUrl =
    session.type === "sso"
      ? session.store_url
      : session.config?.url || "Store";

  // -------- Screen switch --------
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            navigate={setActiveTab}
            data={data}
            loading={loading}
            error={error}
            onRefresh={fetchAllData}
            config={{ url: storeUrl, useMock: session.type === "manual" && session.config.useMock }}
            salesReport={salesReport}
            notificationsCount={notificationsCount}
            onSelectOrder={handleSelectOrder}
          />
        );
      case "orders":
        return (
          <OrdersList
            orders={data.orders}
            loading={loading}
            error={error}
            onRefresh={fetchAllData}
            onLogout={handleLogout}
            onSelectOrder={handleSelectOrder}
          />
        );
      case "products":
        return (
          <ProductsList
            products={data.products}
            loading={loading}
            error={error}
            onRefresh={fetchAllData}
            onLogout={handleLogout}
          />
        );
      case "analytics":
        return (
          <Analytics
            data={data}
            salesReport={salesReport}
            loading={loading}
            error={error}
            onRefresh={fetchAllData}
            // You no longer need full config here, but pass storeId if you later want server-side filtering
          />
        );
      case "settings":
        return <SettingsView config={{ url: storeUrl }} onLogout={handleLogout} />;
      case "customers":
        return (
          <CustomersList
            customers={data.customers}
            loading={loading}
            error={error}
            onRefresh={fetchAllData}
            onLogout={handleLogout}
            onSelectCustomer={handleSelectCustomer}
          />
        );
      case "customer-details":
        return (
          <CustomerDetails
            customer={selectedCustomer}
            onBack={() => setActiveTab("customers")}
          />
        );
      case "order-details":
        return (
          <OrderDetails
            order={selectedOrder}
            onBack={() => setActiveTab("orders")}
          />
        );
      case "notifications":
        return (
          <Notifications
            notifications={derivedNotifications}
            loading={loading}
            error={error}
            onRefresh={fetchAllData}
            onLogout={handleLogout}
            onSelectOrder={handleSelectOrder}
          />
        );
      default:
        return null;
    }
  };

  // -------- Layout --------
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 max-w-md mx-auto relative shadow-2xl overflow-hidden">
      <div className="h-1 bg-purple-800 w-full" />
      <main className="h-full min-h-screen bg-gray-50">{renderContent()}</main>

      {activeTab !== "order-details" &&
        activeTab !== "customer-details" && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-area z-50 max-w-md mx-auto">
            <div className="flex justify-around items-center px-2 py-3">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                  activeTab === "dashboard"
                    ? "text-purple-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Home
                  size={24}
                  strokeWidth={activeTab === "dashboard" ? 2.5 : 2}
                />
                <span className="text-[10px] mt-1 font-medium">Home</span>
              </button>

              <button
                onClick={() => setActiveTab("orders")}
                className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                  activeTab === "orders" || activeTab === "order-details"
                    ? "text-purple-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <ShoppingBag
                  size={24}
                  strokeWidth={
                    activeTab === "orders" || activeTab === "order-details"
                      ? 2.5
                      : 2
                  }
                />
                <span className="text-[10px] mt-1 font-medium">Orders</span>
              </button>

              <button
                onClick={() => setActiveTab("products")}
                className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                  activeTab === "products"
                    ? "text-purple-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Package
                  size={24}
                  strokeWidth={activeTab === "products" ? 2.5 : 2}
                />
                <span className="text-[10px] mt-1 font-medium">Products</span>
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                  activeTab === "analytics"
                    ? "text-purple-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <BarChart2
                  size={24}
                  strokeWidth={activeTab === "analytics" ? 2.5 : 2}
                />
                <span className="text-[10px] mt-1 font-medium">Stats</span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                  activeTab === "settings"
                    ? "text-purple-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Settings
                  size={24}
                  strokeWidth={activeTab === "settings" ? 2.5 : 2}
                />
                <span className="text-[10px] mt-1 font-medium">Store</span>
              </button>
            </div>
          </nav>
        )}

      <style>{`
        .pb-safe-area {
          padding-bottom: env(safe-area-inset-bottom, 16px);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
