
import React, { useState, useEffect, useRef } from 'react';
import { XIcon, SearchIcon } from './icons';
import type { Content, Person } from '../types';
import { searchContent } from '../services/contentService';
import { searchPeople } from '../services/personService';
import { getPosterUrl, getProfileUrl, PLACEHOLDER_POSTER, PLACEHOLDER_PROFILE } from '../lib/tmdbImages';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onDramaClick: (content: Content) => void;
  onPersonClick: (person: Person) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, onDramaClick, onPersonClick }) => {
  const [query, setQuery] = useState('');
  const [content, setContent] = useState<Partial<Content>[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setContent([]);
      setPeople([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const performSearch = async () => {
      if (query.trim().length < 2) {
        setContent([]);
        setPeople([]);
        return;
      }

      setLoading(true);
      try {
        const [contentData, peopleData] = await Promise.all([
          searchContent(query),
          searchPeople(query)
        ]);
        setContent(contentData);
        setPeople(peopleData);
      } catch (error) {
        console.error("Search error", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!isOpen) return null;

  const handleContentSelect = (item: Partial<Content>) => {
    onDramaClick(item as Content);
    onClose();
  };

  const handlePersonSelect = (person: Person) => {
    onPersonClick(person);
    onClose();
  };

  // Helper to get display year from content
  const getYear = (item: Partial<Content>) => {
    const date = item.first_air_date || item.release_date;
    return date ? new Date(date).getFullYear() : '';
  };

  // Helper to get country display
  const getCountry = (item: Partial<Content>) => {
    return item.origin_country?.[0] || '';
  };

  // Helper to get genres as string
  const getGenres = (item: Partial<Content>) => {
    if (!item.genres) return '';
    return item.genres.slice(0, 3).map(g => g.name).join(', ');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0b0b]/95 backdrop-blur-md animate-fadeIn flex flex-col">
      <div className="container mx-auto px-4 md:px-12 pt-8">
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <SearchIcon />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for shows, movies, actors, or people..."
            className="w-full bg-[#1a1a1a] border-b-2 border-gray-700 text-white text-2xl md:text-4xl font-bold py-4 pl-14 pr-12 focus:outline-none focus:border-red-600 placeholder-gray-600"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={onClose}
            className="absolute inset-y-0 right-0 pr-4 text-gray-400 hover:text-white transition"
          >
            <XIcon />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-160px)]">
          {loading && <div className="text-gray-500 text-center py-8">Searching database...</div>}

          {!loading && query.trim().length >= 2 && content.length === 0 && people.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-xl">No results found for "{query}"</p>
              <p className="text-sm mt-2">Try searching for a specific title or actor name.</p>
            </div>
          )}

          {/* Content Results */}
          {content.length > 0 && (
            <div className="mb-12">
              <h3 className="text-gray-500 uppercase text-sm font-bold mb-4 tracking-widest">Movies & TV</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {content.map(item => (
                  <div
                    key={item.id}
                    className="flex bg-[#141414] hover:bg-[#1f1f1f] border border-gray-800 rounded-lg overflow-hidden cursor-pointer transition group"
                    onClick={() => handleContentSelect(item)}
                  >
                    <img
                      src={getPosterUrl(item.poster_path, 'w185') || PLACEHOLDER_POSTER}
                      alt={item.title}
                      className="w-24 h-36 object-cover"
                    />
                    <div className="p-4 flex flex-col justify-center">
                      <h4 className="text-white font-bold text-lg group-hover:text-red-500 transition">{item.title}</h4>
                      <div className="text-gray-400 text-sm mt-1">
                        {getYear(item)} {getCountry(item) && `• ${getCountry(item)}`}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {getGenres(item)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* People Results */}
          {people.length > 0 && (
            <div className="mb-12">
              <h3 className="text-gray-500 uppercase text-sm font-bold mb-4 tracking-widest">People</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {people.map(person => (
                  <div
                    key={person.id}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => handlePersonSelect(person)}
                  >
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-gray-800 group-hover:border-red-600 transition mb-3">
                      <img
                        src={getProfileUrl(person.profile_path) || PLACEHOLDER_PROFILE}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="text-white text-center font-medium group-hover:text-red-500 transition">{person.name}</h4>
                    {person.known_for_department && (
                      <p className="text-gray-500 text-xs">{person.known_for_department}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
