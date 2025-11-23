import React from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import StatusBadge from './ui/StatusBadge';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';

const ProductsList = ({ products, loading, error, onRefresh, onLogout }) => {
  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in min-h-screen">
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Products</h1>
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
          <button className="p-2 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 active:scale-95 transition">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} onLogout={onLogout} />
      ) : (
        <div className="grid grid-cols-1 gap-4 mt-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-4"
            >
              <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/100';
                  }}
                />
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h4 className="font-bold text-gray-800 leading-tight mb-1">
                    {product.name}
                  </h4>
                  <StatusBadge status={product.status} />
                </div>
                <div className="flex justify-between items-end mt-2">
                  <div className="text-sm text-gray-500">
                    Stock:{' '}
                    <span className="font-medium text-gray-800">{product.stock}</span>
                  </div>
                  <div className="font-bold text-purple-700 text-lg">
                    ₹{product.price.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="text-center py-10 text-gray-400">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductsList;
