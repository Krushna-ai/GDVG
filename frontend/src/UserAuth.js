import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserAuth = ({ onLogin, darkTheme, isLogin, setIsLogin, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetData, setResetData] = useState({ username: '', email: '', new_password: '', confirm_password: '' });
  const [resetSuccess, setResetSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleResetChange = (e) => {
    setResetData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Allow login with either email OR username
        const response = await axios.post(`${API}/auth/login`, {
          login: formData.email || formData.username,
          password: formData.password
        });
        const { access_token } = response.data;
        localStorage.setItem('user_token', access_token);
        onLogin(access_token, 'user');
      } else {
        // Registration with uniqueness checks happens in backend
        await axios.post(`${API}/auth/register`, {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name
        });
        // Auto login
        const loginResponse = await axios.post(`${API}/auth/login`, {
          login: formData.email,
          password: formData.password
        });
        const { access_token } = loginResponse.data;
        localStorage.setItem('user_token', access_token);
        onLogin(access_token, 'user');
      }
    } catch (error) {
      setError(error.response?.data?.detail || `${isLogin ? 'Login' : 'Registration'} failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetSuccess('');
    try {
      if (!resetData.username || !resetData.email || !resetData.new_password) {
        setError('Please fill username, email, and new password');
        setLoading(false);
        return;
      }
      if (resetData.new_password !== resetData.confirm_password) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      const resp = await axios.post(`${API}/auth/reset-password`, {
        username: resetData.username,
        email: resetData.email,
        new_password: resetData.new_password
      });
      if (resp.data?.success) {
        setResetSuccess('Password updated. You can now sign in with your new password.');
        setForgotMode(false);
        setIsLogin(true);
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      first_name: '',
      last_name: ''
    });
    setError('');
    setResetSuccess('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setForgotMode(false);
    resetForm();
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      darkTheme ? 'bg-black' : 'bg-gray-50'
    }`}>
      <div className={`relative max-w-md w-full space-y-8 p-8 ${
        darkTheme ? 'bg-gray-900 border border-red-900/50' : 'bg-white border border-gray-200'
      } rounded-2xl shadow-xl`}>
        {/* Exit (X) button top-left */}
        <button
          aria-label="Close"
          onClick={() => {
            if (onClose) onClose();
            navigate('/');
          }}
          className={`absolute top-3 left-3 h-8 w-8 flex items-center justify-center rounded-full ${
            darkTheme ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent tracking-wider mb-2">
            GDVG
          </h1>
          <h2 className={`text-2xl font-bold ${
            darkTheme ? 'text-white' : 'text-gray-900'
          }`}>
            {forgotMode ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Join GDVG'}
          </h2>
          <p className={`mt-2 text-sm ${
            darkTheme ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {forgotMode
              ? 'Provide your username & email to set a new password'
              : isLogin 
                ? 'Sign in to discover global entertainment'
                : 'Start your global entertainment journey'
            }
          </p>
        </div>

        {/* Forms */}
        {!forgotMode ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Back Button */}
            <div>
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  navigate(-1);
                }}
                className={`mb-2 inline-flex items-center px-3 py-2 rounded-lg ${
                  darkTheme ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>

            <div className="space-y-4">
              {/* Registration Fields */}
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first_name" className={`block text-sm font-medium ${
                        darkTheme ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        First Name
                      </label>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                        className={`mt-1 block w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label htmlFor="last_name" className={`block text-sm font-medium ${
                        darkTheme ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Last Name
                      </label>
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                        className={`mt-1 block w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Username (for both modes) */}
              <div>
                <label htmlFor="username" className={`block text-sm font-medium ${
                  darkTheme ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder={isLogin ? 'username (or use email below)' : ''}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className={`block text-sm font-medium ${
                  darkTheme ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Email {isLogin && <span className="text-xs text-gray-400">(optional if username provided)</span>}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={`block text-sm font-medium ${
                  darkTheme ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className={`mt-1 block w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleMode}
                className={`text-sm underline ${darkTheme ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {isLogin ? "Create an account" : "Have an account? Sign in"}
              </button>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className={`text-sm underline ${darkTheme ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Forgot password?
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50"
            >
              {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
        ) : (
          // Forgot password form
          <form className="mt-8 space-y-6" onSubmit={handleResetSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {resetSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">
                {resetSuccess}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>Username</label>
                <input
                  name="username"
                  type="text"
                  value={resetData.username}
                  onChange={handleResetChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                <input
                  name="email"
                  type="email"
                  value={resetData.email}
                  onChange={handleResetChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
                <input
                  name="new_password"
                  type="password"
                  value={resetData.new_password}
                  onChange={handleResetChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password</label>
                <input
                  name="confirm_password"
                  type="password"
                  value={resetData.confirm_password}
                  onChange={handleResetChange}
                  className={`mt-1 block w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className={`text-sm underline ${darkTheme ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Back to Sign in
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserAuth;