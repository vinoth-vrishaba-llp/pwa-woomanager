// client/src/components/ConnectStoreView.jsx
import React, { useState } from 'react';
import { Globe, LogIn, Loader } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ConnectStoreView = ({ user, onStoreConnected }) => {
  const [storeUrl, setStoreUrl] = useState(user.store_url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setError(null);

    if (!storeUrl) {
      setError('Please enter your store URL');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/auth/woo/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_url: storeUrl.trim(),
          app_user_id: user.app_user_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start connection');
      }

      const data = await res.json();

      if (!data.authUrl) {
        throw new Error('No auth URL returned');
      }

      // Redirect to WooCommerce authorization
      window.location.href = data.authUrl;
    } catch (err) {
      console.error('Connect store error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-purple-700 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-6 shadow-2xl text-gray-800">
          <h1 className="text-2xl font-bold mb-2">Connect Your Store</h1>
          <p className="text-sm text-gray-600 mb-6">
            Welcome <strong>{user.username}</strong>! Let's connect your WooCommerce
            store to get started.
          </p>

          {/* Store URL Input */}
          <div className="space-y-2 mb-4">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">
              Store URL
            </label>
            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-purple-500 transition-colors">
              <Globe size={18} className="text-gray-400 mr-2" />
              <input
                type="text"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="mystore.com"
                className="bg-transparent w-full outline-none text-sm"
              />
            </div>
            <p className="text-[10px] text-gray-400 ml-1">
              Enter your WooCommerce store URL without http://
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-purple-800">
              <strong>What happens next?</strong>
              <br />
              You'll be redirected to your WooCommerce store to authorize WooManager.
              API keys will be generated automatically — no manual setup required!
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center"
          >
            {loading ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <>
                <LogIn size={20} className="mr-2" />
                Connect WooCommerce Store
              </>
            )}
          </button>

          {/* Logout Link */}
          <div className="text-center mt-4">
            <button
              onClick={() => {
                localStorage.removeItem('woo_manager_token');
                localStorage.removeItem('woo_manager_user');
                window.location.reload();
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectStoreView;