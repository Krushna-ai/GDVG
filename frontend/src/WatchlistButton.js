import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WatchlistButton = ({ content, darkTheme, size = 'md' }) => {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const statusOptions = [
    { value: 'want_to_watch', label: 'Want to Watch', icon: '📌' },
    { value: 'watching', label: 'Watching', icon: '▶️' },
    { value: 'completed', label: 'Completed', icon: '✅' },
    { value: 'dropped', label: 'Dropped', icon: '❌' }
  ];

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  useEffect(() => {
    checkWatchlistStatus();
  }, [content?.id]);

  const checkWatchlistStatus = async () => {
    if (!content?.id) return;

    try {
      const token = localStorage.getItem('user_token');
      if (!token) return;

      const response = await axios.get(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const watchlistItem = response.data.items.find(
        item => item.content_id === content.id
      );

      if (watchlistItem) {
        setIsInWatchlist(true);
        setCurrentStatus(watchlistItem.status);
      } else {
        setIsInWatchlist(false);
        setCurrentStatus(null);
      }
    } catch (error) {
      console.error('Error checking watchlist status:', error);
    }
  };

  const addToWatchlist = async (status) => {
    if (!content?.id) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('user_token');
      if (!token) {
        alert('Please sign in to add content to your watchlist');
        return;
      }

      await axios.post(`${API}/watchlist`, {
        content_id: content.id,
        status: status,
        total_episodes: content.episodes || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsInWatchlist(true);
      setCurrentStatus(status);
      setShowDropdown(false);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      const msg = error.response?.data?.detail || (typeof error.response?.data === 'string' ? error.response.data : null);
      if (error.response?.status === 401) {
        alert('Please sign in to add content to your watchlist');
      } else if (error.response?.status === 400) {
        alert(msg || 'This content is already in your watchlist');
      } else if (error.response) {
        alert(`Failed to add to watchlist (${error.response.status}): ${msg || 'Unknown error'}`);
      } else {
        alert('Failed to add to watchlist: network error');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateWatchlistStatus = async (newStatus) => {
    if (!content?.id) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('user_token');
      
      // Find the watchlist item first
      const watchlistResponse = await axios.get(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const watchlistItem = watchlistResponse.data.items.find(
        item => item.content_id === content.id
      );

      if (watchlistItem) {
        await axios.put(`${API}/watchlist/${watchlistItem.id}`, {
          status: newStatus
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCurrentStatus(newStatus);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error updating watchlist status:', error);
      alert('Failed to update watchlist status');
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async () => {
    if (!content?.id) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('user_token');
      
      // Find the watchlist item first
      const watchlistResponse = await axios.get(`${API}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const watchlistItem = watchlistResponse.data.items.find(
        item => item.content_id === content.id
      );

      if (watchlistItem) {
        await axios.delete(`${API}/watchlist/${watchlistItem.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setIsInWatchlist(false);
        setCurrentStatus(null);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      alert('Failed to remove from watchlist');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatusOption = () => {
    return statusOptions.find(option => option.value === currentStatus);
  };

  return (
    <div className="relative inline-block">
      {!isInWatchlist ? (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loading}
          className={`${sizeClasses[size]} bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all duration-200 font-medium flex items-center gap-2`}
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          )}
          Add to List
        </button>
      ) : (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loading}
          className={`${sizeClasses[size]} rounded-lg transition-all duration-200 font-medium flex items-center gap-2 ${
            darkTheme
              ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
              : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-300'
          }`}
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <span>{getCurrentStatusOption()?.icon}</span>
          )}
          {getCurrentStatusOption()?.label || 'In List'}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Content */}
          <div className={`absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg z-20 ${
            darkTheme ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  if (isInWatchlist) {
                    updateWatchlistStatus(option.value);
                  } else {
                    addToWatchlist(option.value);
                  }
                }}
                className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                  currentStatus === option.value
                    ? darkTheme
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 text-red-800'
                    : darkTheme
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                } ${option === statusOptions[0] ? 'rounded-t-lg' : ''} ${
                  option === statusOptions[statusOptions.length - 1] ? 'rounded-b-lg' : ''
                }`}
              >
                <span className="text-lg">{option.icon}</span>
                <span className="font-medium">{option.label}</span>
                {currentStatus === option.value && (
                  <svg className="h-4 w-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            
            {isInWatchlist && (
              <>
                <div className={`border-t ${darkTheme ? 'border-gray-700' : 'border-gray-200'}`} />
                <button
                  onClick={removeFromWatchlist}
                  className={`w-full text-left px-4 py-3 rounded-b-lg transition-colors flex items-center gap-3 ${
                    darkTheme
                      ? 'text-red-400 hover:bg-gray-700'
                      : 'text-red-600 hover:bg-gray-100'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="font-medium">Remove from List</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WatchlistButton;