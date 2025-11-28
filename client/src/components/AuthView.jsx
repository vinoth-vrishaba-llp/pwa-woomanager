// client/src/components/AuthView.jsx
import React, { useState } from 'react';
import { ShoppingBag, User, Lock, Loader } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AuthView = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setShowSignupPrompt(false);

    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    try {
      setLoading(true);

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle user not found specifically for login
        if (isLogin && (res.status === 404 || data.error === 'User not found')) {
          setError('No account found with this username.');
          setShowSignupPrompt(true);
          throw new Error('User not found');
        }
        
        // Handle user already exists for signup
        if (!isLogin && (res.status === 409 || data.error?.includes('already exists'))) {
          setError('This username is already taken.');
          setShowSignupPrompt(true);
          throw new Error('Username exists');
        }
        
        // Use the message if provided, otherwise use error
        throw new Error(data.message || data.error || 'Authentication failed');
      }

      // Save token to localStorage
      localStorage.setItem('woo_manager_token', data.token);
      localStorage.setItem('woo_manager_user', JSON.stringify(data.user));

    //console.log('✅ Authentication successful:', data.user);

      // Call parent callback
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      console.error('Auth error:', err);
      if (err.message !== 'User not found' && err.message !== 'Username exists') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToSignup = () => {
    setIsLogin(false);
    setError(null);
    setShowSignupPrompt(false);
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setError(null);
    setShowSignupPrompt(false);
  };

  return (
    <div className="min-h-screen bg-purple-700 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
            <ShoppingBag className="text-purple-700" size={40} />
          </div>
          <h1 className="text-3xl font-bold">WooManager</h1>
          <p className="text-purple-200 mt-2">Manage your store anywhere.</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-4 text-gray-800">
          <h2 className="text-xl font-bold text-center mb-4">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">
              Username
            </label>
            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-purple-500 transition-colors">
              <User size={18} className="text-gray-400 mr-2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="bg-transparent w-full outline-none text-sm"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">
              Password
            </label>
            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-purple-500 transition-colors">
              <Lock size={18} className="text-gray-400 mr-2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-transparent w-full outline-none text-sm"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>
            {!isLogin && (
              <p className="text-[10px] text-gray-400 ml-1 mt-1">
                At least 6 characters
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 space-y-2">
              <p className="text-red-600 font-medium">{error}</p>
              {showSignupPrompt && (
                <button
                  type="button"
                  onClick={isLogin ? switchToSignup : switchToLogin}
                  className="text-purple-600 hover:text-purple-700 font-semibold underline block"
                >
                  {isLogin ? '→ Create a new account' : '→ Sign in instead'}
                </button>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-200 mt-2 flex items-center justify-center"
          >
            {loading ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>

          {/* Toggle Login/Signup */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setShowSignupPrompt(false);
              }}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-center text-purple-200 text-xs mt-6 px-4">
          {isLogin
            ? 'Sign in to connect your WooCommerce store and manage it from anywhere.'
            : 'Create an account to get started with WooManager. You\'ll connect your store in the next step.'}
        </p>
      </div>
    </div>
  );
};

export default AuthView;