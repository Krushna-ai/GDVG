import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminLogin = ({ darkTheme }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendHealthy, setBackendHealthy] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get(`${API}/health`);
        setBackendHealthy(true);
      } catch (e) {
        setBackendHealthy(false);
      }
    };
    checkHealth();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const resp = await axios.post(`${API}/admin/login`, credentials);
      if (resp.data?.access_token) {
        localStorage.setItem('admin_token', resp.data.access_token);
        window.location.assign('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkTheme ? 'bg-black' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full space-y-8 p-8 ${darkTheme ? 'bg-gray-900 border border-red-900/50' : 'bg-white border border-gray-200'} rounded-2xl shadow-xl`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent tracking-wider mb-2">GDVG</h1>
          <h2 className={`text-2xl font-bold ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
            Admin Login
          </h2>
          <p className={`mt-2 text-sm ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
            Sign in with your admin email to manage Global Drama Verse Guide
          </p>
        </div>

        {!backendHealthy && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            Backend not reachable right now. Please try again in a moment.
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className={`block text-sm font-medium ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
                Email
              </label>
              <input
                id="username"
                name="username"
                type="email"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Enter your admin email"
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${darkTheme ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className={`text-center text-sm ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
            You can also use default admin: admin / admin123
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;