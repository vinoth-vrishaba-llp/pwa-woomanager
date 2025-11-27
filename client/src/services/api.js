const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function testConnection(config) {
  const res = await fetch(`${API_BASE}/api/auth/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to connect');
  return data;
}

export async function fetchOrders(config) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch orders');
  return data.orders || [];
}

export async function fetchProducts(config) {
  const res = await fetch(`${API_BASE}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch products');
  return data.products || [];
}

/**
 * 🔹 Fetch Razorpay payment details (status + method etc.)
 * Body: { transaction_id }
 */
export async function fetchRazorpayPayment(transaction_id) {
  const res = await fetch(`${API_BASE}/api/razorpay/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch Razorpay payment');

  return data.payment; // raw Razorpay /v1/payments/:id object
}
