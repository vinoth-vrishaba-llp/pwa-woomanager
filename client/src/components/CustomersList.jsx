// client/src/components/CustomersList.jsx
import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, Users } from 'lucide-react';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';

const CustomersList = ({ customers, loading, error, onRefresh, onLogout, onSelectCustomer }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const safeCustomers = Array.isArray(customers) ? customers : [];

  const filteredCustomers = useMemo(() => {
    let result = [...safeCustomers];

    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        const name = (c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    return result;
  }, [safeCustomers, searchQuery]);

  const resultCount = filteredCustomers.length;
  const resultLabel = `${resultCount} ${resultCount === 1 ? 'customer' : 'customers'} found`;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRefresh} onLogout={onLogout} />;

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Customers</h1>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-gray-100 rounded-full active:scale-95 transition"
          >
            <RefreshCw
              size={20}
              className={`text-gray-600 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mt-14 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search customers by name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{resultLabel}</p>
      </div>

      {/* List */}
      <div className="space-y-3 mt-1">
        {filteredCustomers.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            No customers found.
          </div>
        )}

        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelectCustomer(c)}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {c.avatar_url ? (
                  <img
                    src={c.avatar_url}
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 text-xs font-bold">
                    {c.name?.charAt(0) || 'C'}
                  </span>
                )}
              </div>
              <div>
                <div className="font-bold text-gray-800">{c.name}</div>
                <div className="text-xs text-gray-500">
                  {c.email || 'No email'} {c.phone && `• ${c.phone}`}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">Total Spent</div>
              <div className="font-bold text-purple-700 text-sm">
                ₹{(c.total_spent || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-end gap-1">
                <Users size={12} className="text-gray-400" />
                {c.orders_count || 0} orders
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomersList;
