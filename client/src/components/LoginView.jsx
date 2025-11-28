// client/src/components/LoginView.jsx
import React, { useState } from 'react';
import { ShoppingBag, Globe, Key, Lock, Loader, LogIn } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LoginView = ({ onLogin, onDemo }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [secret, setSecret] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!url || !key || !secret) return;
    setLoading(true);

    const config = { url, key, secret, useProxy, useMock: false };
    setTimeout(() => {
      onLogin(config);
      setLoading(false);
    }, 800);
  };

  const handleSsoConnect = async () => {
    setError(null);
    if (!url) {
      setError('Enter your store URL first.');
      return;
    }

    try {
      setSsoLoading(true);

      const cleanedUrl = url.trim();
      // ✅ FIXED: Simple single-user ID WITHOUT embedding URL
      // Backend will create the pipe-delimited format
      const appUserId = 'pwa-user-1';

      const res = await fetch(`${API_BASE_URL}/api/auth/woo/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_url: cleanedUrl,
          app_user_id: appUserId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed with status ${res.status}`);
      }

      const json = await res.json();
      if (!json.authUrl) throw new Error('authUrl not returned from backend');

      // Redirect to Woo auth screen
      window.location.href = json.authUrl;
    } catch (err) {
      console.error('SSO start error:', err);
      setError(
        err.message || 'Failed to start WooCommerce SSO. Check store URL and try again.'
      );
    } finally {
      setSsoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-purple-700 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
            <ShoppingBag className="text-purple-700" size={40} />
          </div>
          <h1 className="text-3xl font-bold">WooManager</h1>
          <p className="text-purple-200 mt-2">Manage your store anywhere.</p>
        </div>

        {/* Store URL shared by both flows */}
        <div className="mb-4">
          <label className="text-xs font-bold text-purple-100 uppercase ml-1 mb-1 block">
            Store URL
          </label>
          <div className="flex items-center bg-white/10 rounded-lg border border-purple-300/50 px-3 py-2">
            <Globe size={18} className="text-purple-100 mr-2" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="mystore.com"
              className="bg-transparent w-full outline-none text-sm text-white placeholder:text-purple-200/70"
            />
          </div>
        </div>

        {/* SSO block */}
        <div className="bg-white rounded-2xl p-4 shadow-2xl text-gray-800 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-1">
            1. Connect via WooCommerce (Recommended)
          </h2>
          <p className="text-[11px] text-gray-500 mb-3">
            Opens WooCommerce&apos;s official permission screen and auto-creates API
            keys + webhooks. Safer and easier than pasting keys here.
          </p>

          <button
            type="button"
            onClick={handleSsoConnect}
            disabled={ssoLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center text-sm"
          >
            {ssoLoading ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <>
                <LogIn size={18} className="mr-2" />
                Connect via WooCommerce
              </>
            )}
          </button>
        </div>

        {/* Manual / legacy login */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-2xl space-y-4 text-gray-800"
        >
          <h2 className="text-xs font-bold text-gray-500 uppercase mb-1">
            2. Manual API Keys (Legacy)
          </h2>
          <p className="text-[11px] text-gray-500 mb-2">
            Only use this if you can&apos;t complete the WooCommerce connect flow.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">
              Consumer Key
            </label>
            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-purple-500 transition-colors">
              <Key size={18} className="text-gray-400 mr-2" />
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="ck_xxxxxxxx..."
                className="bg-transparent w-full outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">
              Consumer Secret
            </label>
            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-purple-500 transition-colors">
              <Lock size={18} className="text-gray-400 mr-2" />
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="cs_xxxxxxxx..."
                className="bg-transparent w-full outline-none text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useProxy"
                checked={useProxy}
                onChange={(e) => setUseProxy(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <label
                htmlFor="useProxy"
                className="text-xs font-medium text-gray-600 cursor-pointer"
              >
                Use CORS Proxy (Fixes Connection Errors)
              </label>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 ml-5">
              Enable this if you see &quot;Failed to Fetch&quot; errors and cannot change
              server CORS settings.
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-200 mt-2 flex items-center justify-center"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : 'Connect with API Keys'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-purple-200 text-sm mb-2">Don&apos;t have a store handy?</p>
          <button
            onClick={onDemo}
            className="text-white font-semibold text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors"
          >
            Try Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;