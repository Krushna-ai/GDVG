import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserAuth = ({ onLogin, darkTheme, isLogin, setIsLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      first_name: '',
      last_name: ''
    });
    setError('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      darkTheme ? 'bg-black' : 'bg-gray-50'
    }`}>
      <div className={`max-w-md w-full space-y-8 p-8 ${
        darkTheme ? 'bg-gray-900 border border-red-900/50' : 'bg-white border border-gray-200'
      } rounded-2xl shadow-xl`}>
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent tracking-wider mb-2">
            GDVG
          </h1>
          <h2 className={`text-2xl font-bold ${
            darkTheme ? 'text-white' : 'text-gray-900'
          }`}>
            {isLogin ? 'Welcome Back' : 'Join GDVG'}
          </h2>
          <p className={`mt-2 text-sm ${
            darkTheme ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isLogin 
              ? 'Sign in to discover global entertainment'
              : 'Start your global entertainment journey'
            }
          </p>
        </div>

        {/* Auth Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            {/* Back Button */}
            <div>
              <button
                type="button"
                onClick={() => window.history.back()}
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

            </div>
          )}

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
                      required={!isLogin}
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        darkTheme
                          ? 'bg-gray-800 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="John"
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
                      required={!isLogin}
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        darkTheme
                          ? 'bg-gray-800 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Doe"
                    />
                  </div>
                </div>

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
                    required={!isLogin}
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      darkTheme
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="johndoe"
                  />
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  darkTheme
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="john@example.com"
              />
            </div>

            {/* Password Field */}
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
                required
                value={formData.password}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  darkTheme
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder={isLogin ? "Enter your password" : "Min 6 characters"}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                <>
                  {isLogin ? (
                    <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  )}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </div>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className={`text-sm font-medium transition-colors ${
                darkTheme
                  ? 'text-gray-400 hover:text-red-400'
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              {isLogin 
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Features Preview for Registration */}
          {!isLogin && (
            <div className={`mt-6 p-4 rounded-lg ${
              darkTheme ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                darkTheme ? 'text-white' : 'text-gray-900'
              }`}>
                Join the global entertainment community:
              </h4>
              <ul className={`text-sm space-y-1 ${
                darkTheme ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <li className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Track your watchlists across all platforms
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connect with fellow entertainment lovers
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Discover content from every corner of the world
                </li>
              </ul>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UserAuth;