
import React, { useState, useMemo, useRef, useEffect } from 'react';
import DramaCard from './DramaCard';
import type { Content, COUNTRY_CODES } from '../types';
import { ChevronDownIcon, XIcon } from './icons';

interface CatalogPageProps {
  type: 'Series' | 'Movie';
  dramas: Content[];
  onDramaClick: (drama: Content) => void;
  initialGenre?: string | null;
}

const CatalogPage: React.FC<CatalogPageProps> = ({ type, dramas, onDramaClick, initialGenre }) => {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(initialGenre || null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  const genreRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);

  // Country code to name mapping
  const countryNames: Record<string, string> = {
    KR: 'South Korea',
    JP: 'Japan',
    CN: 'China',
    TW: 'Taiwan',
    TH: 'Thailand',
    TR: 'Turkey',
    IN: 'India',
    US: 'USA',
    GB: 'United Kingdom',
  };

  // Sync with prop updates
  useEffect(() => {
    if (initialGenre) {
      setSelectedGenre(initialGenre);
    }
  }, [initialGenre]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(event.target as Node)) {
        setIsGenreOpen(false);
      }
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter dramas by content_type
  const categoryDramas = useMemo(() => {
    if (type === 'Movie') {
      return dramas.filter(d => d.content_type === 'movie');
    }
    // Series includes tv, drama, anime, variety
    return dramas.filter(d => d.content_type !== 'movie');
  }, [dramas, type]);

  // Extract unique genres (from genre objects)
  const genres = useMemo(() => {
    const allGenres = new Set<string>();
    categoryDramas.forEach(d => {
      d.genres?.forEach(g => allGenres.add(g.name));
    });
    return Array.from(allGenres).sort();
  }, [categoryDramas]);

  // Extract unique countries (from origin_country array)
  const countries = useMemo(() => {
    const allCountries = new Set<string>();
    categoryDramas.forEach(d => {
      d.origin_country?.forEach(code => {
        const name = countryNames[code] || code;
        allCountries.add(name);
      });
    });
    return Array.from(allCountries).sort();
  }, [categoryDramas]);

  // Apply filters
  const filteredDramas = useMemo(() => {
    return categoryDramas.filter(d => {
      const matchGenre = selectedGenre
        ? d.genres?.some(g => g.name === selectedGenre)
        : true;
      const matchCountry = selectedCountry
        ? d.origin_country?.some(code => (countryNames[code] || code) === selectedCountry)
        : true;
      return matchGenre && matchCountry;
    });
  }, [categoryDramas, selectedGenre, selectedCountry]);

  return (
    <div className="min-h-screen bg-[#0b0b0b] pt-24 px-4 md:px-12 pb-20 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-12 border-b border-gray-800 pb-6">
        <div className="flex items-baseline space-x-4 mb-4 md:mb-0">
          <h1 className="text-3xl md:text-5xl font-bold text-white">{type === 'Series' ? 'TV Series' : 'Films'}</h1>
          <span className="text-gray-400 text-lg">{filteredDramas.length} Titles</span>
        </div>

        <div className="flex space-x-4 z-30">
          {/* Genre Dropdown */}
          <div className="relative" ref={genreRef}>
            <button
              onClick={() => setIsGenreOpen(!isGenreOpen)}
              className="flex items-center space-x-2 bg-black border border-gray-600 px-4 py-2 rounded hover:bg-gray-900 transition text-sm font-bold text-white min-w-[120px] justify-between"
            >
              <span>{selectedGenre || 'All Genres'}</span>
              <ChevronDownIcon />
            </button>
            {isGenreOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-black/95 border border-gray-700 rounded shadow-xl max-h-64 overflow-y-auto no-scrollbar">
                <div
                  className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300"
                  onClick={() => { setSelectedGenre(null); setIsGenreOpen(false); }}
                >
                  All Genres
                </div>
                {genres.map(g => (
                  <div
                    key={g}
                    className={`px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm ${selectedGenre === g ? 'text-red-500 font-bold' : 'text-gray-300'}`}
                    onClick={() => { setSelectedGenre(g); setIsGenreOpen(false); }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Country Dropdown */}
          <div className="relative" ref={countryRef}>
            <button
              onClick={() => setIsCountryOpen(!isCountryOpen)}
              className="flex items-center space-x-2 bg-black border border-gray-600 px-4 py-2 rounded hover:bg-gray-900 transition text-sm font-bold text-white min-w-[120px] justify-between"
            >
              <span>{selectedCountry || 'All Countries'}</span>
              <ChevronDownIcon />
            </button>
            {isCountryOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-black/95 border border-gray-700 rounded shadow-xl max-h-64 overflow-y-auto no-scrollbar">
                <div
                  className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300"
                  onClick={() => { setSelectedCountry(null); setIsCountryOpen(false); }}
                >
                  All Countries
                </div>
                {countries.map(c => (
                  <div
                    key={c}
                    className={`px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm ${selectedCountry === c ? 'text-red-500 font-bold' : 'text-gray-300'}`}
                    onClick={() => { setSelectedCountry(c); setIsCountryOpen(false); }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {(selectedGenre || selectedCountry) && (
            <button
              onClick={() => { setSelectedGenre(null); setSelectedCountry(null); }}
              className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-gray-300"
              title="Clear filters"
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>

      {/* Content Grid */}
      {filteredDramas.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12">
          {filteredDramas.map((drama) => (
            <div key={drama.id} className="flex flex-col">
              <DramaCard drama={drama} onClick={onDramaClick} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-gray-500 text-lg">No titles found matching your filters.</p>
          <button
            onClick={() => { setSelectedGenre(null); setSelectedCountry(null); }}
            className="mt-4 text-red-500 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
