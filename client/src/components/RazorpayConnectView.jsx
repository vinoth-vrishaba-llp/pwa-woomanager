import React, { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const RazorpayConnectView = ({ token, onConnected }) => {
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!keyId || !keySecret) {
      setError("Both Key ID and Key Secret are required");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/razorpay/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key_id: keyId.trim(),
          key_secret: keySecret.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to connect Razorpay");
      }

      onConnected(json);
    } catch (err) {
      console.error("Razorpay connect error:", err);
      setError(err.message || "Failed to connect Razorpay");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Connect Razorpay
        </h1>
        <p className="text-xs text-gray-500">
          Enter your Razorpay Key ID and Key Secret for this store. We store them
          encrypted and use them only to fetch payment details for your orders.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Key ID
            </label>
            <input
              type="text"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="rzp_live_..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Key Secret
            </label>
            <input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="********"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
          >
            {loading ? "Connecting..." : "Connect Razorpay"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RazorpayConnectView;
