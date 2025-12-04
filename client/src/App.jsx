// client/src/App.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Home,
  Package,
  ShoppingBag,
  BarChart2,
  Settings,
  Loader,
  OctagonX,
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
import RazorpayConnectView from "./components/RazorpayConnectView";
import AbandonedCarts from "./components/AbandonedCarts";
import AbandonedCartDetails from "./components/AbandonedCartDetails";

import {
  fetchRazorpayPayment,
  fetchNotifications,
  fetchAbandonedCarts,
  fetchAbandonedCart,
} from "./services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // ✅ NEW: update banner state
  const [updateReady, setUpdateReady] = useState(false);

  // ✅ NEW: listen for SW update event
  useEffect(() => {
    const handler = () => {
      console.log("[APP] New version available event received");
      setUpdateReady(true);
    };

    window.addEventListener("woomanager-update-available", handler);
    return () =>
      window.removeEventListener("woomanager-update-available", handler);
  }, []);

  // ✅ NEW: User authentication state
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [ordersPagination, setOrdersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    perPage: 20,
  });
  const [productsPagination, setProductsPagination] = useState({
  currentPage: 1,
  totalPages: 1,
  totalProducts: 0,
  perPage: 20,
});

const [abandonedPagination, setAbandonedPagination] = useState({
  currentPage: 1,
  totalPages: 1,
  total: 0,
  perPage: 20,
});

// 🔹 NEW: products pagination
const [productPagination, setProductPagination] = useState({
  currentPage: 1,
  totalPages: 1,
  totalProducts: 0,
  perPage: 20,
});


  const [customersLoaded, setCustomersLoaded] = useState(false);

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
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);

  // 👇 ADD THESE
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [abandonedCartsLoading, setAbandonedCartsLoading] = useState(false);
  const [abandonedCartsError, setAbandonedCartsError] = useState(null);

  const [selectedAbandonedCart, setSelectedAbandonedCart] = useState(null);
  const [abandonedCartDetailLoading, setAbandonedCartDetailLoading] =
    useState(false);
  const [abandonedCartDetailError, setAbandonedCartDetailError] =
    useState(null);

  // 🔹 Razorpay payment for the selected order
  const [razorpayPayment, setRazorpayPayment] = useState(null);
  const [razorpayError, setRazorpayError] = useState(null);

  // ---- route: /sso-complete handled separately ----
  const path = window.location.pathname;
  const hash = window.location.hash || "";

  const getNotificationsSeenKey = (session) => {
    if (session?.type === "sso" && session.store_id) {
      return `woo_manager_notifications_seen_at_store_${session.store_id}`;
    }
    // fallback for demo/manual
    return "woo_manager_notifications_seen_at_default";
  };

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

  useEffect(() => {
    if (!session) return;
    const key = getNotificationsSeenKey(session);
    const saved = localStorage.getItem(key);
    if (saved) {
      setNotificationsSeenAt(saved);
    }
  }, [session]);

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
  // ✅ NEW: Product pagination
// ✅ NEW: Handle product pagination
const handleProductPageChange = useCallback(
  async (nextPage) => {
    if (!session) return;

    setLoading(true);
    setError(null);

    const body =
      session.type === "sso"
        ? {
            store_id: session.store_id,
            page: nextPage,
            per_page: productPagination.perPage,
          }
        : {
            config: session.config,
            page: nextPage,
            per_page: productPagination.perPage,
          };

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch products");
      }

      const json = await res.json();

      setData((prev) => ({
        ...prev,
        products: Array.isArray(json.products) ? json.products : [],
      }));

      setProductPagination({
        currentPage: json.page || nextPage,
        totalPages: json.total_pages || 1,
        totalProducts: json.total || 0,
        perPage: json.per_page || productPagination.perPage,
      });
    } catch (err) {
      console.error("Products pagination error:", err);
      setError(err.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  },
  [session, productPagination.perPage]
);


  // ✅ NEW: Store connected handler
  const handleStoreConnected = () => {
    // Refresh user data
    window.location.reload();
  };

  // ✅ NEW: Razorpay connected handler
  const handleRazorpayConnected = ({ store_id }) => {
    // Update user flag so we skip Razorpay screen next time
    setUser((prev) =>
      prev
        ? {
            ...prev,
            has_razorpay_connected: true,
          }
        : prev
    );

    // Ensure session is set (should already be set if Woo is connected)
    if (!session && user?.has_store_connected) {
      setSession({
        type: "sso",
        store_id: store_id || user.id,
        store_url: user.store_url,
        app_user_id: user.app_user_id,
      });
    }

    // Go to dashboard
    setActiveTab("dashboard");
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
    const keyCurrent = getNotificationsSeenKey(session);
    if (keyCurrent) {
      localStorage.removeItem(keyCurrent);
    }
    localStorage.removeItem("woo_manager_notifications_seen_at_default");

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

  const handleSelectAbandonedCart = async (cart) => {
    if (!session || session.type !== "sso" || !session.store_id) return;

    setSelectedAbandonedCart(cart);
    setAbandonedCartDetailError(null);
    setAbandonedCartDetailLoading(true);
    setActiveTab("abandoned-cart-details");

    try {
      // Pull fresh detail from backend if available
      const fullCart = await fetchAbandonedCart(session.store_id, cart.id);
      setSelectedAbandonedCart(fullCart || cart);
    } catch (err) {
      console.error("Abandoned cart detail fetch failed:", err);
      setAbandonedCartDetailError(
        err.message || "Failed to fetch cart details"
      );
    } finally {
      setAbandonedCartDetailLoading(false);
    }
  };

  const refreshSelectedAbandonedCart = async () => {
    if (
      !session ||
      session.type !== "sso" ||
      !session.store_id ||
      !selectedAbandonedCart
    )
      return;

    setAbandonedCartDetailError(null);
    setAbandonedCartDetailLoading(true);

    try {
      const fullCart = await fetchAbandonedCart(
        session.store_id,
        selectedAbandonedCart.id
      );
      setSelectedAbandonedCart(fullCart || selectedAbandonedCart);
    } catch (err) {
      console.error("Abandoned cart detail refresh failed:", err);
      setAbandonedCartDetailError(
        err.message || "Failed to refresh cart details"
      );
    } finally {
      setAbandonedCartDetailLoading(false);
    }
  };

  // -------- Fetch everything via /api/bootstrap --------
 const fetchAllData = useCallback(async () => {
  if (!session) return;

  setLoading(true);
  setError(null);

  const body =
    session.type === "sso"
      ? { store_id: session.store_id }
      : { config: session.config };

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

    setData({
      orders: json.orders || [],
      products: json.products || [],
      customers: json.customers || [], // still loaded separately for full list
    });

    // ✅ Orders pagination
    setOrdersPagination({
      currentPage: json.current_page || 1,
      totalPages: json.total_pages || 1,
      totalOrders: json.total_orders || 0,
      perPage: json.per_page || 20,
    });

    // ✅ Products pagination (from bootstrap meta)
    setProductPagination({
      currentPage: json.products_page || 1,
      totalPages: json.products_total_pages || 1,
      totalProducts:
        json.products_total ||
        (Array.isArray(json.products) ? json.products.length : 0),
      perPage: json.products_per_page || 20,
    });

    setAbandonedCarts(json.abandoned_carts || []);
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


  const loadNotifications = useCallback(async () => {
    // Only meaningful for SSO stores (where we have a store_id)
    if (!session || session.type !== "sso" || !session.store_id) return;

    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const list = await fetchNotifications(session.store_id);
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Notifications fetch failed:", err);
      setNotificationsError(err.message || "Failed to fetch notifications");
    } finally {
      setNotificationsLoading(false);
    }
  }, [session]);

  // ✅ NEW: Handle order pagination
  const handleOrderPageChange = useCallback(
    async (page, filters = {}) => {
      if (!session) return;

      setLoading(true);
      setError(null);

      const body =
        session.type === "sso"
          ? {
              store_id: session.store_id,
              page,
              per_page: 20,
              ...filters,
            }
          : {
              config: session.config,
              page,
              per_page: 20,
              ...filters,
            };

      try {
        const res = await fetch(`${API_BASE_URL}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch orders");
        }

        const json = await res.json();

        setData((prev) => ({
          ...prev,
          orders: json.orders || [],
        }));

        setOrdersPagination({
          currentPage: json.page || 1,
          totalPages: json.total_pages || 1,
          totalOrders: json.total || 0,
          perPage: json.per_page || 20,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  

  // ✅ NEW: Load customers on-demand
  const loadCustomers = useCallback(async () => {
    if (!session || customersLoaded) return;

    console.log("🔄 Loading customers...");

    const body =
      session.type === "sso"
        ? { store_id: session.store_id }
        : { config: session.config };

    try {
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch customers");
      }

      const json = await res.json();

      setData((prev) => ({
        ...prev,
        customers: json.customers || [],
      }));

      setCustomersLoaded(true);
      console.log("✅ Customers loaded");
    } catch (err) {
      console.error("Failed to load customers:", err);
      setError(err.message);
    }
  }, [session, customersLoaded]);

  const loadAbandonedCarts = useCallback(
  async (page = 1) => {
    if (!session || session.type !== "sso" || !session.store_id) return;

    setAbandonedCartsLoading(true);
    setAbandonedCartsError(null);

    try {
      // assuming fetchAbandonedCarts accepts (storeId, page, perPage)
      const res = await fetchAbandonedCarts(session.store_id, page, 20);

      // Backend should return:
      // { carts, total, total_pages, page, per_page }
      const carts = res?.carts || res || [];

      setAbandonedCarts(Array.isArray(carts) ? carts : []);

      setAbandonedPagination({
        currentPage: res.page || page,
        totalPages: res.total_pages || 1,
        total: res.total || carts.length || 0,
        perPage: res.per_page || 20,
      });
    } catch (err) {
      console.error("Abandoned carts fetch failed:", err);
      setAbandonedCartsError(err.message || "Failed to fetch abandoned carts");
    } finally {
      setAbandonedCartsLoading(false);
    }
  },
  [session]
);


  useEffect(() => {
    if (session?.type === "sso" && session.store_id) {
      loadAbandonedCarts();
    }
  }, [session, loadAbandonedCarts]);

  const subscribeToPush = useCallback(async (storeId) => {
    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !VAPID_PUBLIC_KEY
      ) {
        console.log("[Push] Not supported or VAPID key missing");
        return;
      }

      if (!storeId) {
        console.log("[Push] No storeId, skipping subscription");
        return;
      }

      // Request notification permission if needed
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }

      if ("Notification" in window && Notification.permission !== "granted") {
        console.log("[Push] Notification permission not granted");
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      await fetch(`${API_BASE_URL}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          subscription,
        }),
      });

      console.log("[Push] Subscribed for store", storeId);
    } catch (err) {
      console.error("[Push] Subscription failed:", err);
    }
  }, []);
  useEffect(() => {
    if (session?.type === "sso" && session.store_id) {
      subscribeToPush(session.store_id);
    }
  }, [session, subscribeToPush]);

  // 🔔 Listen for messages from the service worker (abandoned cart / others)
useEffect(() => {
  if (!("serviceWorker" in navigator)) return;

  const handler = async (event) => {
    const data = event.data || {};
    if (!data.action) return;

    // 🔥 Abandoned cart push → open details
    if (data.action === "open-abandoned-cart" && data.cartId) {
      if (!session || session.type !== "sso" || !session.store_id) {
        setActiveTab("abandoned-carts");
        return;
      }

      setActiveTab("abandoned-cart-details");
      setAbandonedCartDetailLoading(true);
      setAbandonedCartDetailError(null);

      try {
        const fullCart = await fetchAbandonedCart(
          session.store_id,
          data.cartId
        );
        setSelectedAbandonedCart(fullCart);
      } catch (err) {
        console.error("Abandoned cart from push failed:", err);
        setAbandonedCartDetailError(
          err.message || "Failed to open abandoned cart"
        );
      } finally {
        setAbandonedCartDetailLoading(false);
      }
      return;
    }

    // 🔥 Order push → open order details
    if (data.action === "open-order" && data.orderId) {
      if (!session) {
        // No session yet → just navigate to orders
        setActiveTab("orders");
        return;
      }

      try {
        // Load the page filtered by that order ID, then open details
        await handleOrderPageChange(1, { search: String(data.orderId) });

        const found = (Array.isArray(data.orders) ? data.orders : []).find(
          (o) => String(o.id) === String(data.orderId)
        );

        // Fallback: search in current state
        const orderToOpen =
          found ||
          (Array.isArray(data.orders)
            ? null
            : (Array.isArray(data.orders) ? data.orders : data.orders) &&
              (Array.isArray(data.orders) ? data.orders : data.orders).find(
                (o) => String(o.id) === String(data.orderId)
              )) ||
          (Array.isArray(data.orders)
            ? null
            : Array.isArray(data.orders)
            ? data.orders
            : null);

        const inState =
          (Array.isArray(data.orders) ? data.orders : []) ||
          (Array.isArray(data.orders) ? data.orders : []);

        const stateOrder =
          (Array.isArray(inState) &&
            inState.find((o) => String(o.id) === String(data.orderId))) ||
          null;

        const finalOrder = found || stateOrder;

        if (finalOrder) {
          handleSelectOrder(finalOrder);
        } else {
          setActiveTab("orders");
        }
      } catch (err) {
        console.error("Failed to open order from push:", err);
        setActiveTab("orders");
      }
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => {
    navigator.serviceWorker.removeEventListener("message", handler);
  };
}, [session, handleOrderPageChange]);


  useEffect(() => {
    if (session) {
      fetchAllData();
    }
  }, [session, fetchAllData]);

  useEffect(() => {
    if (session?.type === "sso" && session.store_id) {
      loadNotifications();
    }
  }, [session, loadNotifications]);

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

    // We only support Razorpay lookup for SSO stores
    const storeId =
      session?.type === "sso" && session.store_id ? session.store_id : null;

    if (!storeId) {
      console.warn(
        "[Razorpay] No store_id in session; skipping payment lookup"
      );
      return;
    }

    try {
      const payment = await fetchRazorpayPayment(txId, storeId);
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
    const iso = new Date().toISOString();
    setNotificationsSeenAt(iso);

    const key = getNotificationsSeenKey(session);
    if (key) {
      localStorage.setItem(key, iso);
    }

    if (session?.type === "sso" && session.store_id) {
      loadNotifications(); // from earlier fix
    }

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
    const isSSO = session?.type === "sso";
    const baseList = isSSO ? notifications : derivedNotifications;

    if (!baseList.length) return 0;
    if (!notificationsSeenAt) return baseList.length;

    const seenTs = new Date(notificationsSeenAt).getTime();
    if (!Number.isFinite(seenTs)) return baseList.length;

    return baseList.filter((n) => {
      const raw = n.date || n.date_created || n.date_created_gmt || null;

      if (!raw) return false;
      const t = new Date(raw).getTime();
      if (!Number.isFinite(t)) return false;
      return t > seenTs;
    }).length;
  }, [session, notifications, derivedNotifications, notificationsSeenAt]);

  // ✅ NEW: Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-purple-700 flex items-center justify-center">
        <Loader className="animate-spin text-white" size={40} />
      </div>
    );
  }

  // ✅ NEW: Authentication + connection flow
  // 1. No user -> Show AuthView (Login/Signup)
  if (!user) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  // 2. User exists but no Woo store connected -> Show WooCommerce connect view
  if (!user.has_store_connected) {
    return (
      <ConnectStoreView user={user} onStoreConnected={handleStoreConnected} />
    );
  }

  // 3. Woo store connected but Razorpay NOT connected -> Show Razorpay connect view
  if (user.has_store_connected && !user.has_razorpay_connected) {
    return (
      <RazorpayConnectView
        user={user}
        token={token}
        onConnected={handleRazorpayConnected}
      />
    );
  }

  // 4. Both Woo + Razorpay connected -> app shell / dashboard
  const storeUrl = session?.store_url || user.store_url || "Store";

  const newAbandonedCount = Array.isArray(abandonedCarts)
    ? abandonedCarts.length
    : 0;
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
            // 👇 NEW
            abandonedCarts={abandonedCarts}
            newAbandonedCount={newAbandonedCount}
            onOpenAbandoned={() => setActiveTab("abandoned-carts")}
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
            // ✅ NEW: Pagination props
            onPageChange={handleOrderPageChange}
            currentPage={ordersPagination.currentPage}
            totalPages={ordersPagination.totalPages}
            totalOrders={ordersPagination.totalOrders}
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
      page={productPagination.currentPage}
      totalPages={productPagination.totalPages}
      onPageChange={handleProductPageChange}
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
            loading={loading || !customersLoaded}
            error={error}
            onRefresh={loadCustomers} // ✅ Changed
            onLogout={handleLogout}
            onSelectCustomer={handleSelectCustomer}
            onMount={loadCustomers} // ✅ NEW
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
      case "notifications": {
        const isSSO = session?.type === "sso";

        const notificationsSource = isSSO
          ? notifications
          : derivedNotifications;
        const notificationsLoadingState = isSSO
          ? notificationsLoading
          : loading;
        const notificationsErrorState = isSSO ? notificationsError : error;
        const onRefreshNotifications = isSSO ? loadNotifications : fetchAllData;

        return (
          <Notifications
            notifications={notificationsSource}
            loading={notificationsLoadingState}
            error={notificationsErrorState}
            onRefresh={onRefreshNotifications}
            onLogout={handleLogout}
            onSelectOrder={handleSelectOrder}
          />
        );
      }
      case "abandoned-carts":
  return (
    <AbandonedCarts
      carts={abandonedCarts}
      loading={abandonedCartsLoading}
      error={abandonedCartsError}
      onRefresh={() =>
        loadAbandonedCarts(abandonedPagination.currentPage || 1)
      }
      onBack={() => setActiveTab("dashboard")}
      onSelectCart={handleSelectAbandonedCart}
      // 🔹 Pagination props
      page={abandonedPagination.currentPage}
      totalPages={abandonedPagination.totalPages}
      onPageChange={loadAbandonedCarts}
    />
  );

      case "abandoned-cart-details":
        return (
          <AbandonedCartDetails
            cart={selectedAbandonedCart}
            loading={abandonedCartDetailLoading}
            error={abandonedCartDetailError}
            onBack={() => setActiveTab("abandoned-carts")}
            onRefresh={refreshSelectedAbandonedCart}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl px-5 py-4 max-w-xs w-[90%] shadow-2xl border border-purple-100">
            <div className="text-sm font-semibold text-gray-900 mb-2">
              New version available
            </div>
            <p className="text-xs text-gray-600 mb-4">
              A new version of WooManager is ready. Reload to get the latest
              features and fixes.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600"
                onClick={() => setUpdateReady(false)}
              >
                Later
              </button>
              <button
                className="text-xs px-3 py-1 rounded-lg bg-purple-700 text-white font-semibold"
                onClick={() => window.location.reload()}
              >
                Reload now
              </button>
            </div>
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

            {/* 🔥 New: Abandoned tab */}
            <button
              onClick={() => setActiveTab("abandoned-carts")}
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === "abandoned-carts" ||
                activeTab === "abandoned-cart-details"
                  ? "text-purple-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <OctagonX
                size={24}
                strokeWidth={
                  activeTab === "abandoned-carts" ||
                  activeTab === "abandoned-cart-details"
                    ? 2.5
                    : 2
                }
              />
              <span className="text-[10px] mt-1 font-medium text-center">
                Abandoned
              </span>
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
