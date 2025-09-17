import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdvancedSearch = ({ darkTheme, onContentClick }) => {
  const [searchParams, setSearchParams] = useState({
    query: '',
    country: '',
    content_type: '',
    genre: '',
    year_from: '',
    year_to: '',
    rating_min: '',
    rating_max: '',
    sort_by: 'rating',
    sort_order: 'desc'
  });

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    genres: [],
    contentTypes: []
  });

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [countriesRes, genresRes, typesRes] = await Promise.all([
        axios.get(`${API}/countries`),
        axios.get(`${API}/genres`),
        axios.get(`${API}/content-types`)
      ]);

      setFilterOptions({
        countries: countriesRes.data.countries,
        genres: genresRes.data.genres,
        contentTypes: typesRes.data.content_types
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleSearch = async (page = 1) => {
    setLoading(true);
    setCurrentPage(page);

    try {
      const params = new URLSearchParams();
      
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, value);
        }
      });
      
      params.append('page', page);
      params.append('limit', 20);

      const response = await axios.get(`${API}/content/search?${params}`);
      setSearchResults(response.data.contents);
      setTotalResults(response.data.total);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setSearchParams({
      query: '',
      country: '',
      content_type: '',
      genre: '',
      year_from: '',
      year_to: '',
      rating_min: '',
      rating_max: '',
      sort_by: 'rating',
      sort_order: 'desc'
    });
    setSearchResults([]);
    setTotalResults(0);
  };

  const ContentCard = ({ content }) => (
    <div 
      className={`group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
        darkTheme ? 'hover:shadow-2xl' : 'hover:shadow-xl'
      }`}
      onClick={() => onContentClick(content)}
    >
      <div className={`rounded-xl overflow-hidden transition-all duration-300 ${
        darkTheme 
          ? 'bg-gray-900 group-hover:bg-gray-800' 
          : 'bg-white group-hover:bg-gray-50'
      }`}>
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={content.poster_url}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
              <span className="text-white font-semibold text-sm">{(content.rating ?? 0).toFixed(1)}</span>
            </div>
          </div>

          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold uppercase">
              {content.content_type}
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className={`font-bold text-lg mb-1 line-clamp-2 ${
            darkTheme ? 'text-white' : 'text-gray-900'
          }`}>
            {content.title}
          </h3>
          
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-medium ${
              darkTheme ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {content.year ?? 'N.A'}
            </span>
            <span className={`text-xs ${
              darkTheme ? 'text-gray-500' : 'text-gray-400'
            }`}>•</span>
            <span className={`text-sm ${
              darkTheme ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {content.country || 'N.A'}
            </span>
          </div>

          <p className={`text-sm line-clamp-2 ${
            darkTheme ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {content.synopsis}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <h2 className={`text-3xl font-bold ${
          darkTheme ? 'text-white' : 'text-gray-900'
        }`}>
          Discover Content
        </h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showFilters
              ? 'bg-red-600 text-white'
              : darkTheme
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Main Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by title, cast, crew, or description..."
            value={searchParams.query}
            onChange={(e) => handleInputChange('query', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              darkTheme
                ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
        <button
          onClick={() => handleSearch(1)}
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all duration-200 font-medium"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className={`p-6 rounded-xl border ${
          darkTheme ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            darkTheme ? 'text-white' : 'text-gray-900'
          }`}>
            Advanced Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Country Filter */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Country
              </label>
              <select
                value={searchParams.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  darkTheme
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">All Countries</option>
                {filterOptions.countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {/* Content Type Filter */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Content Type
              </label>
              <select
                value={searchParams.content_type}
                onChange={(e) => handleInputChange('content_type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  darkTheme
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">All Types</option>
                {filterOptions.contentTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Genre Filter */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Genre
              </label>
              <select
                value={searchParams.genre}
                onChange={(e) => handleInputChange('genre', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  darkTheme
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">All Genres</option>
                {filterOptions.genres.map(genre => (
                  <option key={genre} value={genre}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Range */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Year Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="From"
                  min="1900"
                  max="2030"
                  value={searchParams.year_from}
                  onChange={(e) => handleInputChange('year_from', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <input
                  type="number"
                  placeholder="To"
                  min="1900"
                  max="2030"
                  value={searchParams.year_to}
                  onChange={(e) => handleInputChange('year_to', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Rating Range */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Rating Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  max="10"
                  step="0.1"
                  value={searchParams.rating_min}
                  onChange={(e) => handleInputChange('rating_min', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  max="10"
                  step="0.1"
                  value={searchParams.rating_max}
                  onChange={(e) => handleInputChange('rating_max', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={searchParams.sort_by}
                  onChange={(e) => handleInputChange('sort_by', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="rating">Rating</option>
                  <option value="year">Year</option>
                  <option value="title">Title</option>
                  <option value="created_at">Date Added</option>
                </select>
                <select
                  value={searchParams.sort_order}
                  onChange={(e) => handleInputChange('sort_order', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    darkTheme
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="desc">High to Low</option>
                  <option value="asc">Low to High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => handleSearch(1)}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all duration-200 font-medium"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className={`px-6 py-2 rounded-lg transition-colors ${
                darkTheme
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Search Results */}
      {totalResults > 0 && (
        <div className={`mb-4 ${darkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
          Found {totalResults} results
          {searchParams.query && ` for "${searchParams.query}"`}
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={`animate-pulse rounded-xl ${
              darkTheme ? 'bg-gray-900 border border-gray-800' : 'bg-gray-200'
            }`}>
              <div className="aspect-[2/3] rounded-t-xl bg-current opacity-20" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-current opacity-20 rounded" />
                <div className="h-3 bg-current opacity-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {searchResults.map((content) => (
            <ContentCard key={content.id} content={content} />
          ))}
        </div>
      ) : searchParams.query || Object.values(searchParams).some(v => v && v !== 'rating' && v !== 'desc') ? (
        <div className={`text-center py-16 ${
          darkTheme ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <svg className="mx-auto h-12 w-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg font-medium mb-2">No results found</p>
          <p className="text-sm">Try adjusting your search criteria or filters</p>
        </div>
      ) : null}

      {/* Pagination */}
      {totalResults > 20 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => handleSearch(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
              darkTheme
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>
          
          <span className={`px-4 py-2 ${
            darkTheme ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Page {currentPage} of {Math.ceil(totalResults / 20)}
          </span>
          
          <button
            onClick={() => handleSearch(currentPage + 1)}
            disabled={currentPage >= Math.ceil(totalResults / 20) || loading}
            className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
              darkTheme
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;