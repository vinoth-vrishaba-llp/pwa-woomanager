// client/src/App.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Home,
  Package,
  ShoppingBag,
  BarChart2,
  Settings,
  Loader,
} from "lucide-react";

import AuthView from "./components/AuthView";
import ConnectStoreView from "./components/ConnectStoreView";
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

// 🔹 import API helper
import { fetchRazorpayPayment } from "./services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // ✅ NEW: update banner state
  const [updateReady, setUpdateReady] = useState(false);

  // ✅ NEW: listen for SW update event
  useEffect(() => {
    const handler = () => {
      console.log('[APP] New version available event received');
      setUpdateReady(true);
    };

    window.addEventListener('woomanager-update-available', handler);
    return () => window.removeEventListener('woomanager-update-available', handler);
  }, []);


  // ✅ NEW: User authentication state
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // unified session:
  // { type:'sso', store_id, store_url, app_user_id }
  // or { type:'manual', config: { url, key, secret, useProxy, useMock } } - kept for demo mode
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
  const [notificationsSeenAt, setNotificationsSeenAt] = useState(null);
  const [serverTimeIso, setServerTimeIso] = useState(null);

  // 🔹 Razorpay payment for the selected order
  const [razorpayPayment, setRazorpayPayment] = useState(null);
  const [razorpayError, setRazorpayError] = useState(null);

  // ---- route: /sso-complete handled separately ----
  const path = window.location.pathname;
const hash = window.location.hash || "";

// Hash-based SSO route (production)
if (hash.startsWith("#/sso-complete")) {
  return <SsoComplete />;
}

// Direct path (useful in local dev)
if (path.startsWith("/sso-complete")) {
  return <SsoComplete />;
}


  // ✅ NEW: Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem("woo_manager_token");

      if (!savedToken) {
        setAuthLoading(false);
        return;
      }

      try {
        // Verify token with backend
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Invalid token");
        }

        const responseData = await res.json();
        setUser(responseData.user);
        setToken(savedToken);

        // If user has store connected, set up session
        if (responseData.user.has_store_connected) {
          setSession({
            type: "sso",
            store_id: responseData.user.id,
            store_url: responseData.user.store_url,
            app_user_id: responseData.user.app_user_id,
          });
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        // Clear invalid token
        localStorage.removeItem("woo_manager_token");
        localStorage.removeItem("woo_manager_user");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const fetchServerTime = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/server-time`);
        if (!res.ok) throw new Error("Failed to fetch server time");
        const json = await res.json();
        setServerTimeIso(json.now);
      } catch (e) {
        console.warn(
          "Failed to load server time, falling back to client clock",
          e
        );
        setServerTimeIso(null);
      }
    };

    fetchServerTime();
  }, []);

  // ✅ NEW: Auth success handler
  const handleAuthSuccess = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);

    // If user already has store connected, set up session
    if (userData.has_store_connected) {
      setSession({
        type: "sso",
        store_id: userData.id,
        store_url: userData.store_url,
        app_user_id: userData.app_user_id,
      });
    }
  };

  // ✅ NEW: Store connected handler
  const handleStoreConnected = () => {
    // Refresh user data
    window.location.reload();
  };

  // -------- Demo mode (kept for testing) --------
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

  // ✅ UPDATED: Logout handler
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setSession(null);
    setData({ orders: [], products: [], customers: [] });
    setSalesReport(null);
    setError(null);
    setActiveTab("dashboard");
    setSelectedOrder(null);
    setSelectedCustomer(null);
    setNotificationsSeenAt(null);
    localStorage.removeItem("woo_manager_token");
    localStorage.removeItem("woo_manager_user");
    localStorage.removeItem("woo_manager_store");
    localStorage.removeItem("woo_manager_config");
  };

  // -------- Fetch everything via /api/bootstrap --------
  const fetchAllData = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    // body depends on how user is connected
    const body =
      session.type === "sso"
        ? { store_id: session.store_id } // secure SSO path
        : { config: session.config }; // manual / demo path

    try {
      const res = await fetch(`${API_BASE_URL}/api/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch store data");
      }

      const json = await res.json();
      //console.log("BOOTSTRAP PAYLOAD:", json);

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
  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setActiveTab("order-details");
    setRazorpayPayment(null);
    setRazorpayError(null);

    const txId = order.transaction_id;
    const methodSlug = (order.payment_method || "").toLowerCase();

    if (!txId || methodSlug !== "razorpay") {
      return;
    }

    try {
      const payment = await fetchRazorpayPayment(txId);
      setRazorpayPayment(payment);
    } catch (err) {
      console.error("Failed to load Razorpay payment:", err);
      setRazorpayError(err.message || "Failed to load Razorpay payment");
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setActiveTab("customer-details");
  };

  const handleOpenNotifications = () => {
    setNotificationsSeenAt(new Date().toISOString());
    setActiveTab("notifications");
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

  const notificationsCount = useMemo(() => {
    if (!derivedNotifications.length) return 0;
    if (!notificationsSeenAt) return derivedNotifications.length;

    const seenTs = new Date(notificationsSeenAt).getTime();
    if (!Number.isFinite(seenTs)) return derivedNotifications.length;

    return derivedNotifications.filter((n) => {
      if (!n.date) return false;
      const t = new Date(n.date).getTime();
      if (!Number.isFinite(t)) return false;
      return t > seenTs;
    }).length;
  }, [derivedNotifications, notificationsSeenAt]);

  // ✅ NEW: Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-purple-700 flex items-center justify-center">
        <Loader className="animate-spin text-white" size={40} />
      </div>
    );
  }

  // ✅ NEW: Authentication flow
  // 1. No user -> Show AuthView (Login/Signup)
  if (!user) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  // 2. User exists but no store connected -> Show ConnectStoreView
  if (!user.has_store_connected) {
    return (
      <ConnectStoreView user={user} onStoreConnected={handleStoreConnected} />
    );
  }

  // 3. User exists and store connected -> Show Dashboard
  const storeUrl = session?.store_url || user.store_url || "Store";

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
            config={{
              url: storeUrl,
              useMock: session?.type === "manual" && session.config.useMock,
            }}
            salesReport={salesReport}
            notificationsCount={notificationsCount}
            onSelectOrder={handleSelectOrder}
            onOpenNotifications={handleOpenNotifications}
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
            session={session}
            serverTimeIso={serverTimeIso}
          />
        );
      case "settings":
        return (
          <SettingsView
            config={{
              url: storeUrl,
              useMock: session?.type === "manual" && session.config?.useMock,
            }}
            onLogout={handleLogout}
            notificationsCount={notificationsCount}
            onOpenNotifications={handleOpenNotifications}
          />
        );
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
            razorpayPayment={razorpayPayment}
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

      {/* ✅ New version banner */}
      {updateReady && (
        <div className="fixed bottom-16 inset-x-0 max-w-md mx-auto px-4 z-50">
          <div className="bg-purple-700 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
            <span className="text-xs font-medium">
              New version of WooManager is available.
            </span>
            <button
              className="ml-3 text-xs font-semibold bg-white text-purple-700 px-3 py-1 rounded-lg"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      )}

      {activeTab !== "order-details" && activeTab !== "customer-details" && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-area z-50 max-w-md mx-auto">
          {/* ... your existing nav ... */}
        </nav>
      )}

      {activeTab !== "order-details" && activeTab !== "customer-details" && (
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
