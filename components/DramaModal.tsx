
import React from 'react';
import type { Content, COUNTRY_CODES } from '../types';
import { XIcon, PlayIcon, PlusIcon, CheckIcon } from './icons';
import { getBackdropUrl, getPosterUrl, PLACEHOLDER_BACKDROP } from '../lib/tmdbImages';

interface DramaModalProps {
  drama: Content;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (drama: Content) => void;
  isMyList: boolean;
  onToggleMyList: (id: string) => void;
}

const DramaModal: React.FC<DramaModalProps> = ({
  drama,
  isOpen,
  onClose,
  onPlay,
  isMyList,
  onToggleMyList
}) => {
  if (!isOpen) return null;

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

  // Derive year from release_date or first_air_date
  const year = drama.release_date?.split('-')[0] || drama.first_air_date?.split('-')[0] || '';

  // Get country name from origin_country
  const countryCode = drama.origin_country?.[0] || '';
  const countryName = countryNames[countryCode] || countryCode;

  // Background image
  const bgImage = drama.backdrop_path
    ? getBackdropUrl(drama.backdrop_path, 'w1280')
    : drama.poster_path
      ? getPosterUrl(drama.poster_path, 'original')
      : PLACEHOLDER_BACKDROP;

  // Genre names
  const genreNames = drama.genres?.map(g => g.name) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-[#141414] text-white rounded-lg shadow-2xl max-w-4xl w-full relative overflow-hidden z-10 animate-fadeIn mt-10 mb-10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-[#141414]/60 rounded-full p-2 hover:bg-[#141414] transition"
        >
          <XIcon />
        </button>

        {/* Hero Image Area */}
        <div className="relative h-64 md:h-96">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>

          <div className="absolute bottom-8 left-8 right-8">
            <h2 className="text-4xl md:text-5xl font-extrabold drop-shadow-lg mb-4">{drama.title}</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onPlay(drama)}
                className="flex items-center bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 transition"
              >
                <PlayIcon />
                <span className="ml-2">Play</span>
              </button>
              <button
                onClick={() => onToggleMyList(drama.id)}
                className="flex items-center justify-center w-10 h-10 border-2 border-gray-400 rounded-full text-gray-300 hover:border-white hover:text-white transition bg-black/30"
                title={isMyList ? "Remove from My List" : "Add to My List"}
              >
                {isMyList ? <CheckIcon /> : <PlusIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Details Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center space-x-4 text-sm font-semibold text-gray-400">
              <span className="text-green-400">98% Match</span>
              {year && <span>{year}</span>}
              <span className="border border-gray-500 px-1 rounded text-xs">HD</span>
              {countryName && <span>{countryName}</span>}
            </div>

            <p className="text-lg leading-relaxed text-gray-100">
              {drama.overview || 'No description available.'}
            </p>

            {/* Networks as platforms */}
            {drama.networks && drama.networks.length > 0 && (
              <div>
                <h4 className="font-bold text-gray-400 mb-2">Available on:</h4>
                <div className="flex flex-wrap gap-2">
                  {drama.networks.map(network => (
                    <span key={network.id} className="bg-gray-800 px-3 py-1 rounded text-xs text-gray-300">
                      {network.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-sm space-y-4">
            {genreNames.length > 0 && (
              <div>
                <span className="text-gray-500">Genres:</span>
                <div className="text-gray-300 mt-1">
                  {genreNames.join(', ')}
                </div>
              </div>
            )}
            {drama.vote_average && drama.vote_average > 0 && (
              <div>
                <span className="text-gray-500">Rating:</span>
                <div className="text-gray-300 mt-1">
                  ⭐ {drama.vote_average.toFixed(1)} / 10
                </div>
              </div>
            )}
            {drama.number_of_episodes && (
              <div>
                <span className="text-gray-500">Episodes:</span>
                <div className="text-gray-300 mt-1">
                  {drama.number_of_episodes} episodes
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DramaModal;
