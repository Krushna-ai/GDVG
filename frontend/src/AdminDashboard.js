import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ContentManagement from './ContentManagement';
import Footer from './Footer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ darkTheme, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const safeLogout = () => {
    try {
      localStorage.removeItem('admin_token');
    } catch {}
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      // Fallback: navigate back to admin login
      window.location.assign('/admin');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      if (error.response?.status === 401) {
        safeLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    safeLogout();
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`p-6 rounded-xl border transition-all duration-200 hover:shadow-lg ${
      darkTheme 
        ? 'bg-gray-900 border-red-900/50 hover:border-red-800/70' 
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className={`text-sm font-medium ${
            darkTheme ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {title}
          </p>
          <p className={`text-2xl font-bold ${
            darkTheme ? 'text-white' : 'text-gray-900'
          }`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );

  const Sidebar = () => {
    const menuItems = [
      {
        id: 'dashboard',
        name: 'Dashboard',
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
          </svg>
        )
      },
      {
        id: 'content',
        name: 'Content Management',
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a1 1 0 011-1h4z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8v12a2 2 0 002 2h10a2 2 0 002-2V8H5z" />
          </svg>
        )
      }
    ];

    return (
      <div className={`w-64 min-h-screen border-r transition-all duration-300 ${
        darkTheme 
          ? 'bg-black border-red-900/50' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="p-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent tracking-wider">
            GDVG
          </h1>
          <p className={`text-sm mt-1 ${
            darkTheme ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Admin Panel
          </p>
        </div>

        <nav className="px-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentSection(item.id)}
              className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg transition-all duration-200 ${
                currentSection === item.id
                  ? 'bg-red-600 text-white'
                  : darkTheme
                  ? 'text-gray-300 hover:bg-gray-900 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.icon}
              <span className="ml-3 font-medium">{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
              darkTheme
                ? 'text-gray-400 hover:bg-gray-900 hover:text-red-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-red-600'
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>
    );
  };

  const DashboardContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className={`text-3xl font-bold ${
            darkTheme ? 'text-white' : 'text-gray-900'
          }`}>
            Dashboard Overview
          </h2>
          <p className={`mt-2 ${
            darkTheme ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Welcome to GDVG Admin Panel. Manage your global content database.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Content"
            value={stats?.total_content || 0}
            color="bg-red-100 text-red-600"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a1 1 0 011-1h4z" />
              </svg>
            }
          />

          <StatCard
            title="Movies"
            value={stats?.total_movies || 0}
            color="bg-blue-100 text-blue-600"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
          />

          <StatCard
            title="Series & Dramas"
            value={(stats?.total_series || 0) + (stats?.total_dramas || 0)}
            color="bg-green-100 text-green-600"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            }
          />

          <StatCard
            title="Countries"
            value={stats?.countries || 0}
            color="bg-purple-100 text-purple-600"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`p-6 rounded-xl border ${
            darkTheme 
              ? 'bg-gray-900 border-red-900/50' 
              : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              darkTheme ? 'text-white' : 'text-gray-900'
            }`}>
              Recent Activity
            </h3>
            <div className="space-y-3">
              <div className={`flex items-center p-3 rounded-lg ${
                darkTheme ? 'bg-gray-800' : 'bg-gray-50'
              }`}>
                <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`font-medium ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                    {stats?.recent_additions || 0} new items added
                  </p>
                  <p className={`text-sm ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                    In the last 7 days
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl border ${
            darkTheme 
              ? 'bg-gray-900 border-red-900/50' 
              : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              darkTheme ? 'text-white' : 'text-gray-900'
            }`}>
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setCurrentSection('content')}
                className="w-full flex items-center p-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="ml-3">Add New Content</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col ${
      darkTheme ? 'bg-black' : 'bg-gray-50'
    }`}>
      <div className="flex flex-1">
        <Sidebar />
        
        <div className="flex-1 p-8 overflow-auto">
          {currentSection === 'dashboard' && <DashboardContent />}
          {currentSection === 'content' && (
            <ContentManagement darkTheme={darkTheme} onStatsUpdate={fetchStats} />
          )}
        </div>
      </div>
      <Footer darkTheme={darkTheme} />
    </div>
  );
};

export default AdminDashboard;