import React, { useState } from 'react';
import { ShoppingBag, Globe, Key, Lock, Loader } from 'lucide-react';

const LoginView = ({ onLogin, onDemo }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [secret, setSecret] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url || !key || !secret) return;
    setLoading(true);

    const config = { url, key, secret, useProxy, useMock: false };
    setTimeout(() => {
      onLogin(config);
      setLoading(false);
    }, 800);
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

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-2xl space-y-4 text-gray-800"
        >
          <h2 className="text-lg font-bold text-gray-700 mb-2">Connect Store</h2>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Store URL</label>
            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-purple-500 transition-colors">
              <Globe size={18} className="text-gray-400 mr-2" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="mystore.com"
                className="bg-transparent w-full outline-none text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Consumer Key</label>
            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-purple-500 transition-colors">
              <Key size={18} className="text-gray-400 mr-2" />
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="ck_xxxxxxxx..."
                className="bg-transparent w-full outline-none text-sm"
                required
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
                required
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
              Enable this if you see &quot;Failed to Fetch&quot; errors and cannot change server
              CORS settings.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-200 mt-4 flex items-center justify-center"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : 'Connect'}
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
