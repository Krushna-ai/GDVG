import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import WatchlistButton from './WatchlistButton';
import QuickRating from './QuickRating';
import ReviewSystem from './ReviewSystem';
import Footer from './Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ContentDetail = ({ darkTheme, currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [relatedContent, setRelatedContent] = useState([]);

  useEffect(() => {
    fetchContentDetail();
  }, [id]);

  useEffect(() => {
    if (content) fetchRelatedContent(content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id]);

  const fetchContentDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/content/${id}`);
      setContent(response.data);
    } catch (error) {
      console.error('Error fetching content:', error);
      setContent(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedContent = async (base) => {
    try {
      // Prefer same country; fallback to top rated
      const params = new URLSearchParams();
      if (base?.country) params.append('country', base.country);
      params.append('limit', '12');
      const response = await axios.get(`${API}/content/search?${params.toString()}`);
      const list = response.data?.contents || [];
      const filtered = list.filter((item) => item.id !== base.id).slice(0, 6);
      setRelatedContent(filtered);
    } catch (error) {
      console.error('Error fetching related content:', error);
    }
  };

  const formatTitleForUrl = (title) => {
    return (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') || 'untitled';
  };

  const handleRelatedContentClick = (item) => {
    const titleSlug = formatTitleForUrl(item.slug || item.title);
    navigate(`/content/${item.id}/${titleSlug}`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkTheme ? 'bg-black' : 'bg-white'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className={`mt-4 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>Loading content details...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkTheme ? 'bg-black' : 'bg-white'}`}>
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${darkTheme ? 'text-white' : 'text-gray-900'}`}>Content Not Found</h2>
          <p className={`mt-2 ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>The requested content could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'cast', label: 'Cast & Crew' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'photos', label: 'Photos' }
  ];

  return (
    <div className={`min-h-screen ${darkTheme ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Content Header */}
      <div className={`${darkTheme ? 'bg-gray-900' : 'bg-white'} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Poster Image */}
            <div className="lg:w-1/4">
              <div className="sticky top-8">
                <div className="relative">
                  <img
                    src={content.poster_url || '/api/placeholder/300/450'}
                    alt={content.title}
                    className="w-full rounded-lg shadow-lg"
                    onError={(e) => {
                      e.currentTarget.src = '/api/placeholder/300/450';
                    }}
                  />
                  <div className="mt-4 space-y-3">
                    <WatchlistButton
                      content={content}
                      darkTheme={darkTheme}
                    />
                    {QuickRating && (
                      <QuickRating
                        content={content}
                        darkTheme={darkTheme}
                        currentUser={currentUser}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Information */}
            <div className="lg:w-3/4">
              <div className="space-y-6">
                {/* Title and Basic Info */}
                <div>
                  <h1 className={`text-4xl font-bold ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                    {content.title}
                  </h1>
                  {content.original_title && (
                    <h2 className={`text-xl mt-2 ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                      {content.original_title}
                    </h2>
                  )}
                  <div className="flex items-center gap-4 mt-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      darkTheme ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {content.content_type}
                    </span>
                    <span className={`text-sm ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                      {content.year ?? 'N.A'}
                    </span>
                    <span className={`text-sm ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                      {content.country || 'N.A'}
                    </span>
                  </div>
                </div>

                {/* Rating and Statistics */}
                <div className={`p-4 rounded-lg ${darkTheme ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {(content.rating ?? 0).toFixed(1)}
                      </div>
                      <div className={`text-sm ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                        Rating
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                        {content.episodes ?? 'N.A'}
                      </div>
                      <div className={`text-sm ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                        Episodes
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                        {content.duration ? `${content.duration} min` : 'N.A'}
                      </div>
                      <div className={`text-sm ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                        Duration
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className={`border-b ${darkTheme ? 'border-gray-800' : 'border-gray-200'}`}>
                  <nav className="flex space-x-8">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'border-red-600 text-red-600'
                            : `border-transparent ${
                                darkTheme 
                                  ? 'text-gray-400 hover:text-gray-300 hover:border-gray-300' 
                                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'details' && (
          <div className="space-y-8">
            {/* Synopsis */}
            <section>
              <h3 className={`text-2xl font-bold mb-4 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                Synopsis
              </h3>
              <p className={`text-lg leading-relaxed ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
                {content.synopsis || 'No synopsis available.'}
              </p>
            </section>

            {/* Details */}
            <section>
              <h3 className={`text-2xl font-bold mb-4 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                Information
              </h3>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-lg ${
                darkTheme ? 'bg-gray-900' : 'bg-white'
              }`}>
                <div className="space-y-4">
                  <div>
                    <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                      Genres:
                    </span>
                    <span className={`ml-2 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                      {(content.genres || []).join(', ') || 'N.A'}
                    </span>
                  </div>
                  <div>
                    <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                      Country:
                    </span>
                    <span className={`ml-2 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                      {content.country || 'N.A'}
                    </span>
                  </div>
                  <div>
                    <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                      Year:
                    </span>
                    <span className={`ml-2 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                      {content.year ?? 'N.A'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                      Type:
                    </span>
                    <span className={`ml-2 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                      {content.content_type}
                    </span>
                  </div>
                  <div>
                    <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                      Episodes:
                    </span>
                    <span className={`ml-2 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                      {content.episodes ?? 'N.A'}
                    </span>
                  </div>
                  <div>
                    <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                      Platforms:
                    </span>
                    <span className={`ml-2 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                      {(content.streaming_platforms || []).join(', ') || 'N.A'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Related Content */}
            {relatedContent.length > 0 && (
              <section>
                <h3 className={`text-2xl font-bold mb-6 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
                  Related Content
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {relatedContent.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleRelatedContentClick(item)}
                      className={`cursor-pointer rounded-lg overflow-hidden transition-transform hover:scale-105 ${
                        darkTheme ? 'bg-gray-800' : 'bg-white'
                      } shadow-lg`}
                    >
                      <img
                        src={item.poster_url || '/api/placeholder/150/225'}
                        alt={item.title}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/150/225';
                        }}
                      />
                      <div className="p-3">
                        <h4 className={`font-medium text-sm line-clamp-2 ${
                          darkTheme ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.title}
                        </h4>
                        <p className={`text-xs mt-1 ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                          {(item.year ?? 'N.A')} • {(item.country || 'N.A')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'cast' && (
          <div className="text-center py-16">
            <h3 className={`text-2xl font-bold mb-4 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
              Cast & Crew
            </h3>
            <p className={`text-lg ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
              Cast and crew information will be available soon.
            </p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {ReviewSystem && (
              <ReviewSystem 
                content={content}
                darkTheme={darkTheme}
                currentUser={currentUser}
              />
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="text-center py-16">
            <h3 className={`text-2xl font-bold mb-4 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
              Photos
            </h3>
            <p className={`text-lg ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
              Photo gallery will be available soon.
            </p>
          </div>
        )}
      </div>

      <Footer darkTheme={darkTheme} />
    </div>
  );
};

export default ContentDetail;