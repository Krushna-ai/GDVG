import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import axios from 'axios';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import UserAuth from './UserAuth';
import UserDashboard from './UserDashboard';
import ContentDetailPage from './ContentDetailPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Footer Component
const Footer = ({ darkTheme }) => {
  return (
    <footer className={`border-t transition-all duration-300 ${
      darkTheme 
        ? 'bg-black border-red-900/50' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <h3 className={`text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent mb-4`}>
              Global Drama Verse Guide
            </h3>
            <p className={`text-sm leading-relaxed mb-4 ${
              darkTheme ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Your gateway to the world's best entertainment. Discover dramas, movies, and anime from every corner of the globe, all in one beautifully designed platform.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-red-600/20 text-red-600 rounded-full text-xs font-medium">
                🇰🇷 Korean
              </span>
              <span className="px-3 py-1 bg-red-600/20 text-red-600 rounded-full text-xs font-medium">
                🇯🇵 Japanese
              </span>
              <span className="px-3 py-1 bg-red-600/20 text-red-600 rounded-full text-xs font-medium">
                🇮🇳 Indian
              </span>
              <span className="px-3 py-1 bg-red-600/20 text-red-600 rounded-full text-xs font-medium">
                🇪🇸 Spanish
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={`font-semibold mb-4 ${
              darkTheme ? 'text-white' : 'text-gray-900'
            }`}>
              Discover
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
                  darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
                }`}>
                  Trending
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
                  darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
                }`}>
                  K-Dramas
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
                  darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
                }`}>
                  Anime
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
                  darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
                }`}>
                  Movies
                </a>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className={`font-semibold mb-4 ${
              darkTheme ? 'text-white' : 'text-gray-900'
            }`}>
              Categories
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
                  darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
                }`}>
                  Romance
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
                  darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
                }`}>
                  Thriller
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
                  darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
                }`}>
                  Comedy
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
                  darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
                }`}>
                  Drama
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`border-t pt-8 mt-8 flex flex-col md:flex-row justify-between items-center ${
          darkTheme ? 'border-red-900/50' : 'border-gray-200'
        }`}>
          <div className={`text-sm ${
            darkTheme ? 'text-gray-400' : 'text-gray-600'
          }`}>
            © 2025 Global Drama Verse Guide. All rights reserved.
          </div>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
              darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
            }`}>
              Privacy Policy
            </a>
            <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
              darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
            }`}>
              Terms of Service
            </a>
            <a href="#" className={`text-sm hover:text-red-600 transition-colors ${
              darkTheme ? 'text-gray-400 hover:text-red-400' : 'text-gray-600'
            }`}>
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Header Component
const Header = ({ onSearch, darkTheme, setDarkTheme, onAuthClick }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-all duration-300 ${
      darkTheme 
        ? 'bg-black/95 border-red-900/50' 
        : 'bg-white/95 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent tracking-wider`}>
              GDVG
            </h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search global dramas, movies, anime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-2 pl-12 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  darkTheme
                    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>
          </div>

          {/* Theme Toggle and User Auth */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAuthClick(true)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                darkTheme
                  ? 'text-white hover:bg-gray-900'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
            >
              Sign In
            </button>
            
            <button
              onClick={() => onAuthClick(false)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
            >
              Sign Up
            </button>

            <a
              href="/admin"
              className={`p-2 rounded-lg transition-all duration-200 ${
                darkTheme
                  ? 'text-gray-400 hover:bg-gray-900 hover:text-red-400'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-red-600'
              }`}
              title="Admin Panel"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </a>
            
            <button
              onClick={() => setDarkTheme(!darkTheme)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                darkTheme
                  ? 'text-yellow-400 hover:bg-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {darkTheme ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

// Hero Section Component
const HeroSection = ({ darkTheme }) => {
  return (
    <div className="relative h-96 overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1710988486897-e933e4b0f72c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwzfHxnbG9iYWwlMjBjaW5lbWF8ZW58MHx8fHwxNzUzNTI3MjU2fDA&ixlib=rb-4.1.0&q=85)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      <div className="relative h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Discover Global
              <span className="block bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                Entertainment
              </span>
            </h1>
            <p className="text-xl text-gray-200 mb-8 leading-relaxed">
              From Korean dramas to Bollywood blockbusters, Japanese anime to Spanish thrillers. 
              Your gateway to the world's best entertainment, all in one place.
            </p>
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 bg-red-600/80 backdrop-blur-sm rounded-full text-white font-medium border border-red-500/50">
                🇰🇷 K-Dramas
              </span>
              <span className="px-4 py-2 bg-red-600/80 backdrop-blur-sm rounded-full text-white font-medium border border-red-500/50">
                🇯🇵 Anime
              </span>
              <span className="px-4 py-2 bg-red-600/80 backdrop-blur-sm rounded-full text-white font-medium border border-red-500/50">
                🇮🇳 Bollywood
              </span>
              <span className="px-4 py-2 bg-red-600/80 backdrop-blur-sm rounded-full text-white font-medium border border-red-500/50">
                🇪🇸 Spanish Cinema
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Content Card Component
const ContentCard = ({ content, darkTheme }) => {
  const formatRating = (rating) => {
    return rating.toFixed(1);
  };

  const formatGenres = (genres) => {
    return genres.slice(0, 3).map(genre => 
      genre.charAt(0).toUpperCase() + genre.slice(1).replace('_', ' ')
    ).join(' • ');
  };

  return (
    <Link to={`/content/${content.id}`} className="group transition-all duration-300 transform hover:scale-105 hover:z-10">
      <div className={`rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
        darkTheme 
          ? 'bg-gray-900 group-hover:bg-gray-800' 
          : 'bg-white group-hover:bg-gray-50'
      }`}>
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={content.poster_url}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Rating Badge */}
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
              <span className="text-white font-semibold text-sm">{formatRating(content.rating)}</span>
            </div>
          </div>

          {/* Content Type Badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 rounded-lg text-xs font-semibold uppercase ${
              content.content_type === 'movie' ? 'bg-red-600 text-white' :
              content.content_type === 'series' ? 'bg-red-700 text-white' :
              content.content_type === 'drama' ? 'bg-red-800 text-white' :
              'bg-red-500 text-white'
            }`}>
              {content.content_type}
            </span>
          </div>
        </div>

        {/* Content Info */}
        <div className="p-4">
          <h3 className={`font-bold text-lg mb-1 line-clamp-2 ${
            darkTheme ? 'text-white' : 'text-gray-900'
          }`}>
            {content.title}
          </h3>
          
          {content.original_title && content.original_title !== content.title && (
            <p className={`text-sm mb-2 ${
              darkTheme ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {content.original_title}
            </p>
          )}

          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-medium ${
              darkTheme ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {content.year}
            </span>
            <span className={`text-xs ${
              darkTheme ? 'text-gray-500' : 'text-gray-400'
            }`}>•</span>
            <span className={`text-sm ${
              darkTheme ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {content.country}
            </span>
          </div>

          <p className={`text-sm mb-3 ${
            darkTheme ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {formatGenres(content.genres)}
          </p>

          <p className={`text-sm line-clamp-2 ${
            darkTheme ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {content.synopsis}
          </p>
        </div>
      </div>
    </Link>
  );
};

// Content Grid Component
const ContentGrid = ({ contents, darkTheme, loading }) => {
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
      <div className={`text-center py-16 ${
        darkTheme ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <svg className="mx-auto h-12 w-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 7v8a1 1 0 002 0V7a1 1 0 00-2 0zm4 0v8a1 1 0 002 0V7a1 1 0 00-2 0z" />
        </svg>
        <p className="text-lg font-medium">No content found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {contents.map((content) => (
        <ContentCard
          key={content.id}
          content={content}
          darkTheme={darkTheme}
        />
      ))}
    </div>
  );
};

// Main App Component
function App() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkTheme, setDarkTheme] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null); // 'admin' or 'user'
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  useEffect(() => {
    document.title = 'GDVG - Global Drama Verse Guide';
    
    // Check if user is accessing admin route
    if (window.location.pathname.startsWith('/admin')) {
      setIsAdminMode(true);
      
      // Check if admin is already authenticated
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) {
        setIsAuthenticated(true);
        setUserType('admin');
      }
    } else {
      // Check if user is authenticated
      const userToken = localStorage.getItem('user_token');
      if (userToken) {
        setIsAuthenticated(true);
        setUserType('user');
        fetchUserProfile(userToken);
      } else {
        // Show public content for non-authenticated users
        fetchContents();
      }
    }
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Token might be expired, clear it
      localStorage.removeItem('user_token');
      setIsAuthenticated(false);
      setUserType(null);
      fetchContents();
    }
  };

  const handleLogin = (token, type) => {
    setIsAuthenticated(true);
    setUserType(type);
    setShowUserAuth(false);
    
    if (type === 'user') {
      fetchUserProfile(token);
    }
  };

  const handleAuthClick = (isLogin) => {
    setIsLoginMode(isLogin);
    setShowUserAuth(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setCurrentUser(null);
    localStorage.removeItem('user_token');
    localStorage.removeItem('admin_token');
    
    if (isAdminMode) {
      // Redirect to main site
      window.location.href = '/';
    } else {
      fetchContents();
    }
  };

  // Admin Mode
  if (isAdminMode) {
    if (!isAuthenticated || userType !== 'admin') {
      return <AdminLogin onLogin={(token) => handleLogin(token, 'admin')} darkTheme={darkTheme} />;
    }
    return <AdminDashboard darkTheme={darkTheme} onLogout={handleLogout} />;
  }

  // User Authentication Modal
  if (showUserAuth) {
    return (
      <UserAuth 
        onLogin={handleLogin} 
        darkTheme={darkTheme} 
        isLogin={isLoginMode}
        setIsLogin={setIsLoginMode}
      />
    );
  }

  // Authenticated User Dashboard
  if (isAuthenticated && userType === 'user') {
    return (
      <UserDashboard 
        darkTheme={darkTheme} 
        onLogout={handleLogout}
        currentUser={currentUser}
      />
    );
  }

  const fetchContents = async (search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      
      const response = await axios.get(`${API}/content?${params}`);
      setContents(response.data.contents);
    } catch (error) {
      console.error('Error fetching contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    fetchContents(query);
  };

  const Home = ({ darkTheme, searchQuery, contents, loading }) => (
    <>
      {!searchQuery && <HeroSection darkTheme={darkTheme} />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {searchQuery && (
          <div className="mb-8">
            <h2 className={`text-2xl font-bold mb-2 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
              Search Results for "{searchQuery}"
            </h2>
            <p className={`${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
              {contents.length} results found
            </p>
          </div>
        )}
        {!searchQuery && (
          <div className="mb-8">
            <h2 className={`text-3xl font-bold mb-6 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
              Trending Global Content
            </h2>
          </div>
        )}
        <ContentGrid
          contents={contents}
          darkTheme={darkTheme}
          loading={loading}
        />
      </main>
    </>
  );

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkTheme ? 'bg-black' : 'bg-gray-50'
    }`}>
      <Header
        onSearch={handleSearch}
        darkTheme={darkTheme}
        setDarkTheme={setDarkTheme}
        onAuthClick={handleAuthClick}
      />

      <Routes>
        <Route path="/" element={
          <Home
            darkTheme={darkTheme}
            searchQuery={searchQuery}
            contents={contents}
            loading={loading}
          />
        } />
        <Route path="/content/:id" element={<ContentDetailPage darkTheme={darkTheme} />} />
      </Routes>

      <Footer darkTheme={darkTheme} />
    </div>
  );
}

export default App;