import React, { useMemo, useState } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import StatusBadge from './ui/StatusBadge';
import ErrorState from './ui/ErrorState';

const ProductsList = ({ products, loading, error, onRefresh, onLogout }) => {
  const [statusFilter, setStatusFilter] = useState('all'); // all | publish | draft
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // drawer animation state
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);     // controls animation state
  const [isCategorySheetVisible, setIsCategorySheetVisible] = useState(false); // controls mounting

  const SKELETON_ITEMS = Array.from({ length: 6 });

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.remove();
  };

  // ---- Derived data: counts, categories, filtered products ----

  const { totalCount, publishedCount, draftCount } = useMemo(() => {
    let published = 0;
    let draft = 0;

    products.forEach((p) => {
      const status = p.post_status || p.status;
      if (status === 'publish') published += 1;
      if (status === 'draft') draft += 1;
    });

    return {
      totalCount: products.length,
      publishedCount: published,
      draftCount: draft,
    };
  }, [products]);

  // categories with per-category product counts
  const categories = useMemo(() => {
    const map = new Map();

    products.forEach((p) => {
      if (Array.isArray(p.categories)) {
        p.categories.forEach((cat) => {
          if (cat && cat.id != null) {
            if (!map.has(cat.id)) {
              map.set(cat.id, {
                id: cat.id,
                name: cat.name || `Category ${cat.id}`,
                count: 0,
              });
            }
            const entry = map.get(cat.id);
            entry.count += 1;
          }
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => {
        const status = p.post_status || p.status;
        return status === statusFilter;
      });
    }

    // Category filter
    if (selectedCategoryId !== 'all') {
      const catId = Number(selectedCategoryId);
      result = result.filter(
        (p) =>
          Array.isArray(p.categories) &&
          p.categories.some((c) => Number(c.id) === catId),
      );
    }

    // Search filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => {
        const name = p.name?.toLowerCase() || '';
        const sku = p.sku?.toLowerCase() || '';
        return name.includes(q) || sku.includes(q);
      });
    }

    return result;
  }, [products, statusFilter, selectedCategoryId, searchQuery]);

  // ---- UI blocks ----

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 gap-4 mt-4">
      {SKELETON_ITEMS.map((_, index) => (
        <div
          key={index}
          className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-4 animate-pulse"
        >
          <div className="w-20 h-20 rounded-lg bg-gray-200 flex-shrink-0" />
          <div className="flex-1 flex flex-col justify-between py-1">
            <div className="space-y-2">
              <div className="h-3 w-3/4 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-200 rounded-full" />
            </div>
            <div className="flex justify-between items-end mt-2">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderProducts = () => (
    <div className="grid grid-cols-1 gap-4 mt-4">
      {filteredProducts.map((product) => (
        <div
          key={product.id}
          className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-4"
        >
          <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
            {product.image && (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            )}
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
                <span className="font-medium text-gray-800">
                  {product.stock}
                </span>
              </div>
              <div className="font-bold text-purple-700 text-lg">
                ₹{product.price.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ))}
      {filteredProducts.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          No products found.
        </div>
      )}
    </div>
  );

  // ---- Category drawer helpers (with animation) ----

  const openCategorySheet = () => {
    setIsCategorySheetVisible(true);
    // defer to next frame so transition runs
    requestAnimationFrame(() => setIsCategorySheetOpen(true));
  };

  const closeCategorySheet = () => {
    setIsCategorySheetOpen(false);
    // wait for animation to finish before unmount
    setTimeout(() => setIsCategorySheetVisible(false), 250);
  };

  const CategoryButtons = ({ closeDrawer }) => (
    <>
      <button
        onClick={() => {
          setSelectedCategoryId('all');
          closeDrawer && closeDrawer();
        }}
        className={`w-full px-2 py-2 rounded-lg text-left text-sm flex justify-between items-center ${
          selectedCategoryId === 'all'
            ? 'bg-purple-100 text-purple-700 font-semibold'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span>All Categories</span>
        <span className="text-xs text-gray-500">({totalCount})</span>
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => {
            setSelectedCategoryId(cat.id);
            closeDrawer && closeDrawer();
          }}
          className={`w-full px-2 py-2 rounded-lg text-left text-sm flex justify-between items-center truncate ${
            selectedCategoryId === cat.id
              ? 'bg-purple-100 text-purple-700 font-semibold'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="truncate">{cat.name}</span>
          <span className="text-xs text-gray-500">
            ({cat.count ?? 0})
          </span>
        </button>
      ))}

      {categories.length === 0 && (
        <p className="text-[11px] text-gray-400 mt-1">
          No categories found.
        </p>
      )}
    </>
  );

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-20 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
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

      {/* Search + Status filters + Category trigger */}
      <div className="mt-12 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            />
          </div>

          {/* Category sheet trigger (desktop + mobile) */}
          <button
            type="button"
            onClick={openCategorySheet}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 active:scale-95 transition"
          >
            <SlidersHorizontal size={14} className="text-gray-500" />
            <span>Categories</span>
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              statusFilter === 'all'
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('publish')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              statusFilter === 'publish'
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              statusFilter === 'draft'
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            Draft ({draftCount})
          </button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <ErrorState
          message={error}
          onRetry={onRefresh}
          onLogout={onLogout}
        />
      ) : loading ? (
        renderSkeletons()
      ) : (
        renderProducts()
      )}

      {/* Category Drawer with animation (desktop + mobile) */}
      {isCategorySheetVisible && (
        <div className="fixed inset-0 z-30">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
              isCategorySheetOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeCategorySheet}
          />

          {/* Drawer */}
          <div
            className={`absolute right-0 top-0 h-full w-64 bg-white shadow-2xl border-l border-gray-100 flex flex-col transform transition-transform duration-300 ${
              isCategorySheetOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Categories
              </h3>
              <button
                onClick={closeCategorySheet}
                className="p-1 rounded-full hover:bg-gray-100 active:scale-95 transition"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="p-3 flex-1 overflow-y-auto">
              <CategoryButtons closeDrawer={closeCategorySheet} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsList;
