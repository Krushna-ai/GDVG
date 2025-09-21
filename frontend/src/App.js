import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Footer from './Footer';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';
import UserAuth from './UserAuth';
import FeaturedSections from './FeaturedSections';
import AdvancedSearch from './AdvancedSearch';
import ContentManagement from './ContentManagement';
import ContentDetail from './ContentDetail';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// App Component
function App() {
  const [darkTheme, setDarkTheme] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null); // 'admin' or 'user'
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'GDVG - Global Drama Verse Guide';

    if (window.location.pathname.startsWith('/admin')) {
      setIsAdminMode(true);
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) {
        setIsAuthenticated(true);
        setUserType('admin');
      }
    } else {
      const userToken = localStorage.getItem('user_token');
      if (userToken) {
        setIsAuthenticated(true);
        setUserType('user');
        fetchUserProfile(userToken);
      } else {
        fetchPublicContents('');
      }
    }
  }, []);

  const fetchPublicContents = async (search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await axios.get(`${API}/content?${params}`);
      setContents(response.data.contents || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (token) => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile', error);
    }
  };

  const handleLogin = (token, type) => {
    setIsAuthenticated(true);
    setUserType(type);
    setShowUserAuth(false);
    if (type === 'user') setCurrentUser({ token });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setCurrentUser(null);
    localStorage.removeItem('user_token');
    localStorage.removeItem('admin_token');
    window.location.assign('/');
  };

  const openUserAuth = (isLogin) => {
    setIsLoginMode(isLogin);
    setShowUserAuth(true);
  };

  const HomePage = () => {
    const navigate = useNavigate();

    const handleContentClick = (content) => {
      const slug = (content.slug || content.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') || 'untitled';
      navigate(`/content/${content.id}/${slug}`);
    };

    return (
      <div className={`min-h-screen ${darkTheme ? 'bg-black' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className={`text-3xl font-bold ${darkTheme ? 'text-white' : 'text-gray-900'}`}>Discover</h1>
            <div className="flex gap-2">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => openUserAuth(true)} className="px-4 py-2 rounded-lg bg-red-600 text-white">Sign In</button>
                  <button onClick={() => openUserAuth(false)} className={`px-4 py-2 rounded-lg ${darkTheme ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'}`}>Sign Up</button>
                </>
              ) : (
                <button onClick={handleLogout} className={`px-4 py-2 rounded-lg ${darkTheme ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'}`}>Logout</button>
              )}
            </div>
          </div>

          <FeaturedSections darkTheme={darkTheme} handleContentClick={handleContentClick} />

          <div className="mt-12">
            <h2 className={`text-2xl font-bold mb-4 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>All Content</h2>
            <ContentGrid contents={contents} darkTheme={darkTheme} onContentClick={handleContentClick} loading={loading} />
          </div>

          <div className="mt-12">
            <AdvancedSearch darkTheme={darkTheme} onContentClick={handleContentClick} />
          </div>
        </div>
        <Footer darkTheme={darkTheme} />
      </div>
    );
  };

  const AdminRoutes = () => {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLogin darkTheme={darkTheme} />} />
        <Route path="/admin/dashboard" element={<AdminDashboard darkTheme={darkTheme} />} />
        <Route path="/admin/content" element={<ContentManagement darkTheme={darkTheme} />} />
      </Routes>
    );
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/content/:id/:title" element={<ContentDetail darkTheme={darkTheme} currentUser={currentUser} />} />
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showUserAuth && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowUserAuth(false)} />
          <div className="relative z-10">
            <UserAuth 
              onLogin={(token, type) => {
                handleLogin(token, type);
                fetchPublicContents('');
              }}
              darkTheme={darkTheme}
              isLogin={isLoginMode}
              setIsLogin={setIsLoginMode}
              onClose={() => {
                setShowUserAuth(false);
                fetchPublicContents('');
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Content Grid Component
const ContentGrid = ({ contents, darkTheme, onContentClick, loading }) => {
  const navigate = useNavigate();

  const formatTitleForUrl = (title) => {
    return (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') || 'untitled';
  };

  const handleContentClick = (content) => {
    const slug = formatTitleForUrl(content.slug || content.title);
    navigate(`/content/${content.id}/${slug}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`animate-pulse rounded-xl ${
            darkTheme ? 'bg-gray-900 border border-gray-800' : 'bg-gray-200'
          }`}>
            <div className="aspect-[2/3] rounded-t-xl bg-current opacity-20" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-current opacity-20 rounded" />
              <div className="h-3 bg-current opacity-20 rounded" />
              <div className="h-3 bg-current opacity-20 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className={`text-center py-16 ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
        <svg className="mx-auto h-12 w-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 7v8a1 1 0 002 0V7a1 1 0 00-2 0z" />
        </svg>
        <p className="text-lg font-medium">No content found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {contents.map((content) => (
        <div key={content.id} className={`group cursor-pointer transition-all duration-300 transform hover:scale-105 ${darkTheme ? 'hover:shadow-2xl' : 'hover:shadow-xl'}`} onClick={() => onContentClick ? onContentClick(content) : handleContentClick(content)}>
          <div className={`rounded-xl overflow-hidden transition-all duration-300 ${darkTheme ? 'bg-gray-900 group-hover:bg-gray-800' : 'bg-white group-hover:bg-gray-50'}`}>
            <div className="relative aspect-[2/3] overflow-hidden">
              <img src={content.poster_url} alt={content.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
                <div className="flex items-center gap-1">
                  <svg className="h-3 w-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                  <span className="text-white font-semibold text-xs">{(content.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold uppercase">{content.content_type}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="p-3">
              <h3 className={`font-bold text-sm mb-1 line-clamp-2 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>{content.title}</h3>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>{content.year ?? 'N.A'}</span>
                <span className={`text-xs ${darkTheme ? 'text-gray-500' : 'text-gray-400'}`}>•</span>
                <span className={`text-xs truncate max-w-[6rem] ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>{content.country || 'N.A'}</span>
              </div>
              <p className={`text-xs line-clamp-2 min-h-[2.5rem] ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>{content.synopsis}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;