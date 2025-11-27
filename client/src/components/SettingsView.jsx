// client/src/components/SettingsView.jsx
import React from 'react';
import { Bell, Truck, IndianRupee, ChevronRight, ShieldAlert, LogOut } from 'lucide-react';

const SettingsView = ({ config, onLogout, notificationsCount = 0, onOpenNotifications }) => (

  <div className="pb-24 pt-16 px-4 animate-fade-in">
    <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100">
      <h1 className="text-xl font-bold text-gray-800">Settings</h1>
    </div>

    <div className="mt-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4 flex items-center gap-4 border-b border-gray-100">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xl">
          {config.useMock ? 'D' : 'S'}
        </div>
        <div className="overflow-hidden">
          <h3 className="font-bold text-gray-800 truncate">
            {config.useMock ? 'Demo Store' : 'My Store'}
          </h3>
          <p className="text-sm text-gray-500 truncate">
            {config.useMock ? 'demo.woomanager.app' : config.url}
          </p>
        </div>
      </div>
      <div className="p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Connection Status</span>
          <span
            className={`text-sm font-bold flex items-center gap-1 ${
              config.useMock ? 'text-orange-500' : 'text-green-600'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                config.useMock ? 'bg-orange-500' : 'bg-green-600'
              }`}
            ></div>
            {config.useMock ? 'Demo Mode' : 'Connected'}
          </span>
        </div>
        {config.useProxy && (
          <div className="mt-2 flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
            <ShieldAlert size={14} className="mt-0.5" /> Proxy Enabled (Testing)
          </div>
        )}
      </div>
    </div>

    <div className="mt-6 space-y-2">
      <button
        onClick={onOpenNotifications}
        className="w-full bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center text-gray-700 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-2">
            <Bell size={20} className="text-gray-400" />
            <span>Notifications</span>
            {notificationsCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
                {notificationsCount > 9 ? '9+' : notificationsCount}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-400" />
      </button>
    </div>

    <button
      onClick={onLogout}
      className="w-full mt-8 p-4 rounded-xl bg-red-50 text-red-600 font-bold border border-red-100 hover:bg-red-100 transition flex items-center justify-center gap-2"
    >
      <LogOut size={18} /> Log Out
    </button>

    <div className="text-center mt-6 text-xs text-gray-400">
      WooManager v2.3 (Order Details)
    </div>
  </div>
);

export default SettingsView;
