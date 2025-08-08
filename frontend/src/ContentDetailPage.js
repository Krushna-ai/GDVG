import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const DetailsTab = ({ content, darkTheme }) => {
  const formatDuration = (minutes) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Poster & Info */}
      <div className="lg:col-span-1">
        <img src={content.poster_url} alt={content.title} className="rounded-lg shadow-lg w-full" />
        <div className={`mt-6 p-4 rounded-lg ${darkTheme ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <h3 className="text-xl font-bold mb-4">Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Type:</span>
              <span className="font-medium capitalize">{content.content_type}</span>
            </div>
            <div className="flex justify-between">
              <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Country:</span>
              <span className="font-medium">{content.country}</span>
            </div>
            <div className="flex justify-between">
              <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Year:</span>
              <span className="font-medium">{content.year}</span>
            </div>
            {content.episodes && (
              <div className="flex justify-between">
                <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Episodes:</span>
                <span className="font-medium">{content.episodes}</span>
              </div>
            )}
            {content.duration && (
              <div className="flex justify-between">
                <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Duration:</span>
                <span className="font-medium">{formatDuration(content.duration)}</span>
              </div>
            )}
             <div className="flex justify-between">
              <span className={`font-semibold ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Score:</span>
              <span className="font-medium text-yellow-400">{content.rating.toFixed(1)}/10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Synopsis, Details, etc. */}
      <div className="lg:col-span-2">
        <h2 className="text-3xl font-bold mb-4">Synopsis</h2>
        <p className={`leading-relaxed ${darkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
          {content.synopsis}
        </p>

        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-4">Genres</h3>
          <div className="flex flex-wrap gap-3">
            {content.genres.map((genre) => (
              <span key={genre} className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${darkTheme ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'}`}>
                {genre.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-4">Tags</h3>
          <div className="flex flex-wrap gap-3">
            {content.tags.map((tag) => (
              <span key={tag} className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${darkTheme ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'}`}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ContentDetailPage = ({ darkTheme }) => {
  const { id } = useParams();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API}/content/${id}`);
        setContent(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch content details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  if (loading) {
    return <div className={`text-center py-20 ${darkTheme ? 'text-white' : 'text-black'}`}>Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">{error}</div>;
  }

  if (!content) {
    return <div className={`text-center py-20 ${darkTheme ? 'text-white' : 'text-black'}`}>Content not found.</div>;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return <DetailsTab content={content} darkTheme={darkTheme} />;
      case 'cast':
        return <div className="py-8">Cast & Crew Content Placeholder</div>;
      case 'reviews':
        return <div className="py-8">Reviews Content Placeholder</div>;
      case 'photos':
        return <div className="py-8">Photos Content Placeholder</div>;
      default:
        return null;
    }
  };

  const getTabClass = (tabName) => {
    const baseClass = 'px-4 py-3 font-medium text-sm rounded-t-lg focus:outline-none';
    if (activeTab === tabName) {
      return `${baseClass} ${darkTheme ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`;
    }
    return `${baseClass} ${darkTheme ? 'text-gray-400 hover:bg-gray-800/60' : 'text-gray-500 hover:bg-gray-200/60'}`;
  };

  return (
    <div className={`min-h-screen ${darkTheme ? 'bg-black' : 'bg-gray-900'}`}>
      {/* Banner */}
      <div className="relative h-64 md:h-96 bg-cover bg-center" style={{ backgroundImage: `url(${content.banner_url || content.poster_url})` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white shadow-lg">{content.title}</h1>
          {content.original_title && content.original_title !== content.title && (
            <p className="text-xl text-gray-300 mt-2">{content.original_title}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         {/* Tab Navigation */}
        <div className="border-b ${darkTheme ? 'border-gray-700' : 'border-gray-300'}">
          <nav className="flex space-x-2" aria-label="Tabs">
            <button onClick={() => setActiveTab('details')} className={getTabClass('details')}>Details</button>
            <button onClick={() => setActiveTab('cast')} className={getTabClass('cast')}>Cast & Crew</button>
            <button onClick={() => setActiveTab('reviews')} className={getTabClass('reviews')}>Reviews</button>
            <button onClick={() => setActiveTab('photos')} className={getTabClass('photos')}>Photos</button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ContentDetailPage;
