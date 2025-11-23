// server/wooService.js
const { MOCK_ORDERS, MOCK_PRODUCTS } = require('./mockData');

const WooService = {
  cleanUrl: (url) => {
    let cleaned = url.replace(/\/$/, '').trim();
    if (!cleaned.startsWith('http')) {
      cleaned = `https://${cleaned}`;
    }
    return cleaned;
  },

  buildUrl: (baseUrl, endpoint, config) => {
    const { key, secret, useProxy } = config;
    const separator = endpoint.includes('?') ? '&' : '?';
    const authParams = `consumer_key=${key}&consumer_secret=${secret}`;
    const targetUrl = `${baseUrl}/wp-json/wc/v3/${endpoint}${separator}${authParams}`;

    if (useProxy) {
      return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
  },

  getOrders: async (config, useMock) => {
    if (useMock) {
      // backend demo mode
      return MOCK_ORDERS;
    }

    try {
      const baseUrl = WooService.cleanUrl(config.url);
      const finalUrl = WooService.buildUrl(baseUrl, 'orders?per_page=100', config);

      const response = await fetch(finalUrl);

      if (!response.ok) {
        if (response.status === 401) throw new Error('Invalid Credentials. Check Key/Secret.');
        if (response.status === 404)
          throw new Error('API Endpoint not found. Is WooCommerce installed?');
        if (response.status === 403)
          throw new Error('Access Forbidden. Check server permissions.');
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      return data.map((order) => ({
        id: order.id,
        customer: order.billing
          ? `${order.billing.first_name} ${order.billing.last_name}`
          : 'Guest',
        total: parseFloat(order.total),
        status: order.status,
        date: new Date(order.date_created).toISOString(),
        items: order.line_items ? order.line_items.length : 0,
        line_items: order.line_items,
        billing: order.billing,
        shipping: order.shipping,
        payment_method: order.payment_method_title,
        currency_symbol: order.currency_symbol,
      }));
    } catch (error) {
      console.error('Fetch Orders Error:', error);
      throw error;
    }
  },

  getProducts: async (config, useMock) => {
    if (useMock) {
      return MOCK_PRODUCTS;
    }

    try {
      const baseUrl = WooService.cleanUrl(config.url);
      const finalUrl = WooService.buildUrl(baseUrl, 'products?per_page=100', config);

      const response = await fetch(finalUrl);

      if (!response.ok) throw new Error(`Server Error: ${response.status}`);

      const data = await response.json();
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price ? parseFloat(p.price) : 0,
        stock: p.stock_quantity || 0,
        status: p.stock_status || 'instock',
        image: p.images && p.images[0] ? p.images[0].src : 'https://via.placeholder.com/100',
      }));
    } catch (error) {
      console.error('Fetch Products Error:', error);
      throw error;
    }
  },
};

module.exports = WooService;
