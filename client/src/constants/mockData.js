// client/src/constants/mockData.js

export const MOCK_ORDERS = [
  { 
    id: 1204, 
    customer: "Alex Johnson", 
    total: 1450.00, 
    status: "processing", 
    date: "2 mins ago", 
    items: 3,
    line_items: [
      { id: 101, name: "Premium Cotton T-Shirt", quantity: 2, total: "500.00" },
      { id: 102, name: "Slim Fit Jeans", quantity: 1, total: "950.00" }
    ],
    billing: { 
      first_name: "Alex", last_name: "Johnson", 
      address_1: "123 MG Road", city: "Bangalore", state: "KA", postcode: "560001",
      email: "alex.j@example.com", phone: "+91 98765 43210"
    },
    payment_method: "UPI"
  },
  { 
    id: 1203, 
    customer: "Sarah Smith", 
    total: 895.00, 
    status: "completed", 
    date: "1 hour ago", 
    items: 1,
    line_items: [
      { id: 103, name: "Urban Hoodie", quantity: 1, total: "895.00" }
    ],
    billing: { 
      first_name: "Sarah", last_name: "Smith", 
      address_1: "45 Park Street", city: "Mumbai", state: "MH", postcode: "400001",
      email: "sarah.s@example.com", phone: "+91 98765 12345"
    },
    payment_method: "Credit Card"
  },
  { 
    id: 1202, 
    customer: "Michael Brown", 
    total: 2100.00, 
    status: "processing", 
    date: "3 hours ago", 
    items: 4, 
    line_items: [], 
    billing: {}, 
    payment_method: "COD" 
  },
  { 
    id: 1201, 
    customer: "Emily Davis", 
    total: 450.00, 
    status: "cancelled", 
    date: "5 hours ago", 
    items: 1, 
    line_items: [], 
    billing: {}, 
    payment_method: "UPI" 
  },
  { 
    id: 1200, 
    customer: "David Wilson", 
    total: 3200.00, 
    status: "completed", 
    date: "Yesterday", 
    items: 2, 
    line_items: [], 
    billing: {}, 
    payment_method: "Net Banking" 
  },
  { 
    id: 1199, 
    customer: "Jessica Garcia", 
    total: 672.00, 
    status: "completed", 
    date: "Yesterday", 
    items: 1, 
    line_items: [], 
    billing: {}, 
    payment_method: "COD" 
  },
  { 
    id: 1198, 
    customer: "Rahul Kumar", 
    total: 1200.00, 
    status: "completed", 
    date: "Yesterday", 
    items: 2, 
    line_items: [], 
    billing: {}, 
    payment_method: "UPI" 
  },
  { 
    id: 1197, 
    customer: "Priya Singh", 
    total: 450.00, 
    status: "processing", 
    date: "Yesterday", 
    items: 1, 
    line_items: [], 
    billing: {}, 
    payment_method: "UPI" 
  },
];

export const MOCK_PRODUCTS = [
  { 
    id: 1, 
    name: "Premium Cotton T-Shirt", 
    price: 250.00, 
    stock: 45, 
    status: "instock", 
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=100&q=80" 
  },
  { 
    id: 2, 
    name: "Slim Fit Jeans", 
    price: 1500.00, 
    stock: 12, 
    status: "lowstock", 
    image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&w=100&q=80" 
  },
  { 
    id: 3, 
    name: "Urban Hoodie", 
    price: 999.00, 
    stock: 0, 
    status: "outofstock", 
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=100&q=80" 
  },
  { 
    id: 4, 
    name: "Canvas Sneakers", 
    price: 2499.00, 
    stock: 28, 
    status: "instock", 
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=100&q=80" 
  },
  { 
    id: 5, 
    name: "Leather Wallet", 
    price: 450.00, 
    stock: 15, 
    status: "instock", 
    image: "https://images.unsplash.com/photo-1627123424574-181ce90b9940?auto=format&fit=crop&w=100&q=80" 
  },
  { 
    id: 6, 
    name: "Smart Watch", 
    price: 3999.00, 
    stock: 5, 
    status: "lowstock", 
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=100&q=80" 
  },
  { 
    id: 7, 
    name: "Wireless Earbuds", 
    price: 1999.00, 
    stock: 50, 
    status: "instock", 
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=100&q=80" 
  },
];
