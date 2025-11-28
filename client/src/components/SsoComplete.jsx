// client/src/components/SsoComplete.jsx (Enhanced with better error handling)
import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;



const getSsoParams = () => {
  // 1) Normal case: query in search
  if (window.location.search && window.location.search.length > 1) {
    return new URLSearchParams(window.location.search);
  }

  // 2) Hash case: #/sso-complete?success=1&user_id=...
  const hash = window.location.hash || "";
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return new URLSearchParams();
  const queryString = hash.substring(qIndex + 1);
  return new URLSearchParams(queryString);
};


const SsoComplete = () => {
  const [success, setSuccess] = useState(null);
  const [appUserId, setAppUserId] = useState(null);
  const [loadingStore, setLoadingStore] = useState(false);
  const [storeError, setStoreError] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);

  useEffect(() => {
  const params = getSsoParams();
  const s = params.get("success");
  const u = params.get("user_id");

  console.log("SSO Complete page loaded:", { success: s, user_id: u });

  setSuccess(s === "1");
  setAppUserId(u || null);
}, []);

  useEffect(() => {
    if (!success || !appUserId) return;
    
    (async () => {
      try {
        setLoadingStore(true);
        setStoreError(null);

        // ✅ Extract just the app_user_id part (before double underscore if present)
        const cleanAppUserId = appUserId.includes('__') 
          ? appUserId.split('__')[0] 
          : appUserId;

       //onsole.log('Fetching store for app_user_id:', cleanAppUserId);

        const res = await fetch(`${API_BASE_URL}/api/store/by-app-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_user_id: cleanAppUserId }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error('Store lookup failed:', text);
          throw new Error(text || `Failed with status ${res.status}`);
        }

        const json = await res.json();
       //onsole.log('Store info received:', json);
        setStoreInfo(json);

        // Save SSO session – NO keys
        const session = {
          type: 'sso',
          store_id: json.store_id,
          store_url: json.store_url,
          app_user_id: json.app_user_id,
        };
        localStorage.setItem('woo_manager_store', JSON.stringify(session));
        console.log('Session saved to localStorage');
      } catch (err) {
        console.error('Fetch store by app_user error:', err);
        setStoreError(err.message || 'Failed to load store info.');
      } finally {
        setLoadingStore(false);
      }
    })();
  }, [success, appUserId]);

  const goHome = () => {
    // After successful store connection, go back to app
    // App.jsx will detect user has store connected and show Dashboard
    window.location.href = '/';
  };

  const title = success ? 'Store Connected' : 'Connection Failed';

  return (
    <div className="min-h-screen bg-purple-700 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-gray-800 text-center">
        {success ? (
          <>
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-1">{title}</h1>
            <p className="text-sm text-gray-600 mb-3">
              WooCommerce granted access to <strong>WooManager</strong>. We&apos;ve
              registered your store and webhook.
            </p>

            {appUserId && (
              <p className="text-[11px] text-gray-400 break-all mb-2">
                Reference: <span className="font-mono">{appUserId}</span>
              </p>
            )}

            {loadingStore && (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-3">
                <Loader2 size={14} className="animate-spin" />
                <span>Finalizing store connection...</span>
              </div>
            )}

            {storeError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-3 mb-3 text-left">
                <p className="font-semibold mb-1">Connection Error</p>
                <p className="text-[11px] leading-relaxed">{storeError}</p>
                <p className="text-[10px] text-gray-500 mt-2">
                  Try reconnecting from the login screen, or contact support if this persists.
                </p>
              </div>
            )}

            {storeInfo && !loadingStore && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                <p className="text-xs text-green-800 font-medium mb-1">✓ Store Connected</p>
                <p className="text-[11px] text-gray-600">
                  <span className="font-mono">{storeInfo.store_url}</span>
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Store ID: {storeInfo.store_id}
                </p>
              </div>
            )}

            <button
              onClick={goHome}
              className="inline-flex items-center justify-center w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm py-2.5 rounded-xl transition active:scale-95"
            >
              Open WooManager
              <ExternalLink size={16} className="ml-2" />
            </button>
          </>
        ) : (
          <>
            <XCircle size={40} className="text-red-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-1">{title}</h1>
            <p className="text-sm text-gray-600 mb-4">
              The WooCommerce connection was cancelled or failed. You can retry from the
              app login screen.
            </p>
            <button
              onClick={goHome}
              className="inline-flex items-center justify-center w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm py-2.5 rounded-xl transition active:scale-95"
            >
              Back to App
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SsoComplete;