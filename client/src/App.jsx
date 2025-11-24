// client/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Home, Package, ShoppingBag, BarChart2, Settings } from 'lucide-react';

import LoginView from './components/LoginView';
import Dashboard from './components/Dashboard';
import OrdersList from './components/OrdersList';
import OrderDetails from './components/OrderDetails';
import ProductsList from './components/ProductsList';
import Analytics from './components/Analytics';
import SettingsView from './components/SettingsView';
import CustomersList from './components/CustomersList';
import CustomerDetails from './components/CustomerDetails';

// use env if you want, fallback to localhost:5000
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userConfig, setUserConfig] = useState(null);
  const [data, setData] = useState({ orders: [], products: [], customers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem('woo_manager_config');
    if (savedConfig) {
      setUserConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleLogin = (config) => {
    setUserConfig(config);
    localStorage.setItem('woo_manager_config', JSON.stringify(config));
  };

  const handleDemo = () => {
    const demoConfig = {
      useMock: true,
      url: 'https://demo.store',
      key: 'demo',
      secret: 'demo',
      useProxy: false,
    };
    setUserConfig(demoConfig);
    localStorage.setItem('woo_manager_config', JSON.stringify(demoConfig));
  };

  const handleLogout = () => {
    setUserConfig(null);
    setData({ orders: [], products: [], customers: [] });
    setError(null);
    setSelectedOrder(null);
    setSelectedCustomer(null);
    setActiveTab('dashboard');
    localStorage.removeItem('woo_manager_config');
  };

  const fetchAllData = useCallback(async () => {
    if (!userConfig) return;
    setLoading(true);
    setError(null);

    try {
      const body = JSON.stringify({ config: userConfig });
      const headers = { 'Content-Type': 'application/json' };

      const [ordersRes, productsRes, customersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/orders`, { method: 'POST', headers, body }),
        fetch(`${API_BASE_URL}/api/products`, { method: 'POST', headers, body }),
        fetch(`${API_BASE_URL}/api/customers`, { method: 'POST', headers, body }),
      ]);

      if (!ordersRes.ok) throw new Error('Failed to fetch orders');
      if (!productsRes.ok) throw new Error('Failed to fetch products');
      if (!customersRes.ok) throw new Error('Failed to fetch customers');

      const [ordersJson, productsJson, customersJson] = await Promise.all([
        ordersRes.json(),
        productsRes.json(),
        customersRes.json(),
      ]);

      setData({
        orders: ordersJson.orders || [],
        products: productsJson.products || [],
        customers: customersJson.customers || [],
      });
    } catch (err) {
      let msg = 'Failed to connect.';
      if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
        msg =
          "Connection blocked by browser security (CORS). Please enable 'Use CORS Proxy' in the login screen.";
      } else {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userConfig]);

  useEffect(() => {
    if (userConfig) {
      fetchAllData();
    }
  }, [userConfig, fetchAllData]);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setActiveTab('order-details');
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setActiveTab('customer-details');
  };

  if (!userConfig) {
    return <LoginView onLogin={handleLogin} onDemo={handleDemo} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            navigate={setActiveTab}
            data={data}
            loading={loading}
            error={error}
            onRefresh={fetchAllData}
            config={userConfig}
          />
        );

      case 'orders':
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

      case 'products':
        return (
          <ProductsList
            products={data.products}
            loading={loading}
            error={error}
            onRefresh={fetchAllData}
            onLogout={handleLogout}
          />
        );

      case 'customers':
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

      case 'analytics':
        return <Analytics />;

      case 'settings':
        return <SettingsView config={userConfig} onLogout={handleLogout} />;

      case 'order-details':
        return (
          <OrderDetails
            order={selectedOrder}
            onBack={() => setActiveTab('orders')}
          />
        );

      case 'customer-details':
        return (
          <CustomerDetails
            customer={selectedCustomer}
            onBack={() => setActiveTab('customers')}
          />
        );

      default:
        return (
          <Dashboard
            navigate={setActiveTab}
            data={data}
            loading={loading}
            error={error}
            onRefresh={fetchAllData}
            config={userConfig}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 max-w-md mx-auto relative shadow-2xl overflow-hidden">
      <div className="h-1 bg-purple-800 w-full"></div>
      <main className="h-full min-h-screen bg-gray-50">{renderContent()}</main>

      {/* Hide nav on full-screen detail views */}
      {activeTab !== 'order-details' && activeTab !== 'customer-details' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-area z-50 max-w-md mx-auto">
          <div className="flex justify-around items-center px-2 py-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'text-purple-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Home size={24} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">Home</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'orders' || activeTab === 'order-details'
                  ? 'text-purple-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ShoppingBag
                size={24}
                strokeWidth={
                  activeTab === 'orders' || activeTab === 'order-details' ? 2.5 : 2
                }
              />
              <span className="text-[10px] mt-1 font-medium">Orders</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'products'
                  ? 'text-purple-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Package size={24} strokeWidth={activeTab === 'products' ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">Products</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'text-purple-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <BarChart2
                size={24}
                strokeWidth={activeTab === 'analytics' ? 2.5 : 2}
              />
              <span className="text-[10px] mt-1 font-medium">Stats</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${
                activeTab === 'settings'
                  ? 'text-purple-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Settings
                size={24}
                strokeWidth={activeTab === 'settings' ? 2.5 : 2}
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
