import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import WatchlistButton from './WatchlistButton';
import { AdSenseNative } from './AdIntegration';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FeaturedSections = ({ darkTheme, handleContentClick, showAds = false }) => {
  const [featuredSections, setFeaturedSections] = useState({
    trending: [],
    newReleases: [],
    topRated: [],
    kdramas: [],
    anime: [],
    bollywood: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedContent();
  }, []);

  const fetchFeaturedContent = async () => {
    setLoading(true);
    try {
      const [trending, newReleases, topRated, kdramas, anime, bollywood] = await Promise.all([
        axios.get(`${API}/content/featured?category=trending&limit=10`),
        axios.get(`${API}/content/featured?category=new_releases&limit=8`),
        axios.get(`${API}/content/featured?category=top_rated&limit=8`),
        axios.get(`${API}/content/featured?category=by_country&country=South Korea&limit=8`),
        axios.get(`${API}/content/search?content_type=anime&limit=8`),
        axios.get(`${API}/content/featured?category=by_country&country=India&limit=8`)
      ]);

      setFeaturedSections({
        trending: trending.data,
        newReleases: newReleases.data,
        topRated: topRated.data,
        kdramas: kdramas.data,
        anime: anime.data.contents || anime.data,
        bollywood: bollywood.data
      });
    } catch (error) {
      console.error('Error fetching featured content:', error);
    } finally {
      setLoading(false);
    }
  };

  const ContentCarousel = ({ title, contents, loading }) => {
    if (loading) {
      return (
        <div className="mb-12">
          <div className={`h-6 w-48 rounded mb-6 animate-pulse ${
            darkTheme ? 'bg-gray-800' : 'bg-gray-200'
          }`} />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`flex-shrink-0 w-48 animate-pulse ${
                darkTheme ? 'bg-gray-800' : 'bg-gray-200'
              } rounded-xl`}>
                <div className="aspect-[2/3] rounded-t-xl bg-current opacity-20" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-current opacity-20 rounded" />
                  <div className="h-3 bg-current opacity-20 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!contents || contents.length === 0) {
      return null;
    }

    return (
      <div className="mb-12">
        <h2 className={`text-2xl font-bold mb-6 ${
          darkTheme ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h2>
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {contents.map((content, index) => (
            <div 
              key={content.id || index}
              className={`flex-shrink-0 w-48 group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                darkTheme ? 'hover:shadow-2xl' : 'hover:shadow-xl'
              }`}
              onClick={() => handleContentClick(content)}
            >
              <div className={`rounded-xl overflow-hidden transition-all duration-300 ${
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
                  
                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
                    <div className="flex items-center gap-1">
                      <svg className="h-3 w-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                      <span className="text-white font-semibold text-xs">{(content.rating ?? 0).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Content Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold uppercase">
                      {content.content_type}
                    </span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Content Info */}
                <div className="p-3">
                  <h3 className={`font-bold text-sm mb-1 line-clamp-2 ${
                    darkTheme ? 'text-white' : 'text-gray-900'
                  }`}>
                    {content.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${
                      darkTheme ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {content.year ?? 'N.A'}
                    </span>
                    <span className={`text-xs ${
                      darkTheme ? 'text-gray-500' : 'text-gray-400'
                    }`}>•</span>
                    <span className={`text-xs ${
                      darkTheme ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {content.country || 'N.A'}
                    </span>
                  </div>

                  <p className={`text-xs line-clamp-2 ${
                    darkTheme ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {content.synopsis}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const HeroSection = () => {
    const heroContent = featuredSections.trending[0];
    if (!heroContent) return null;

    return (
      <div className="relative h-96 mb-16 overflow-hidden rounded-2xl">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${heroContent.banner_url || heroContent.poster_url})`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold uppercase">
                  {heroContent.content_type}
                </span>
                <div className="flex items-center gap-1">
                  <svg className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                  <span className="text-white font-semibold">{(heroContent.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {heroContent.title}
              </h1>
              
              <p className="text-lg text-gray-200 mb-6 leading-relaxed">
                {heroContent.synopsis}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => handleContentClick(heroContent)}
                  className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  More Info
                </button>
                <WatchlistButton 
                  content={heroContent} 
                  darkTheme={true} 
                  size="lg" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Content Carousels */}
      <ContentCarousel 
        title="🔥 Trending Now" 
        contents={featuredSections.trending.slice(1)} 
        loading={loading} 
      />

      <ContentCarousel 
        title="🆕 New Releases" 
        contents={featuredSections.newReleases} 
        loading={loading} 
      />

      <ContentCarousel 
        title="⭐ Top Rated" 
        contents={featuredSections.topRated} 
        loading={loading} 
      />

      <ContentCarousel 
        title="🇰🇷 K-Dramas" 
        contents={featuredSections.kdramas} 
        loading={loading} 
      />

      <ContentCarousel 
        title="🎌 Anime" 
        contents={featuredSections.anime} 
        loading={loading} 
      />

      <ContentCarousel 
        title="🇮🇳 Bollywood & Indian Cinema" 
        contents={featuredSections.bollywood} 
        loading={loading} 
      />
    </div>
  );
};

export default FeaturedSections;