// client/src/components/ui/ErrorState.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorState = ({ message, onRetry, onLogout }) => (
  <div className="flex flex-col items-center justify-center h-64 text-red-500 p-6 text-center animate-fade-in">
    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
      <AlertCircle size={24} className="text-red-600" />
    </div>
    <p className="text-sm font-bold text-gray-800 mb-1">Sync Failed</p>
    <p className="text-xs text-gray-500 mb-6 max-w-[250px] leading-relaxed">{message}</p>
    
    <div className="flex gap-3">
      {onLogout && (
        <button onClick={onLogout} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
          Back to Login
        </button>
      )}
      {onRetry && (
        <button onClick={onRetry} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-purple-200 hover:bg-purple-700 transition">
          Try Again
        </button>
      )}
    </div>
  </div>
);

export default ErrorState;
