
import React from 'react';
import type { Content } from '../types';
import { PlayIcon, InfoIcon, PlusIcon, CheckIcon } from './icons';
import { getBackdropUrl, getPosterUrl, PLACEHOLDER_BACKDROP } from '../lib/tmdbImages';

interface HeroProps {
  drama: Content;
  onPlay: (drama: Content) => void;
  onMoreInfo: (drama: Content) => void;
  isMyList: boolean;
  onToggleMyList: (id: string) => void;
}

const Hero: React.FC<HeroProps> = ({ drama, onPlay, onMoreInfo, isMyList, onToggleMyList }) => {
  // Derive year from release_date or first_air_date
  const year = drama.release_date?.split('-')[0] || drama.first_air_date?.split('-')[0] || '';

  // Use backdrop if available, else poster, else placeholder
  const bgImage = drama.backdrop_path
    ? getBackdropUrl(drama.backdrop_path, 'original')
    : drama.poster_path
      ? getPosterUrl(drama.poster_path, 'original')
      : PLACEHOLDER_BACKDROP;

  return (
    <div className="relative h-[56.25vw] min-h-[500px] max-h-[850px] w-full">
      <div
        className="absolute top-0 left-0 w-full h-full bg-cover bg-center transition-all duration-1000"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-[#0b0b0b] via-[#0b0b0b]/40 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#0b0b0b] to-transparent"></div>

      <div className="relative z-10 h-full flex flex-col justify-center px-4 md:px-12 lg:px-24 w-full md:w-2/3 lg:w-1/2 pt-16">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold drop-shadow-xl mb-4 text-white leading-tight">
          {drama.title || drama.original_title}
        </h1>
        <div className="flex items-center space-x-2 mb-4 text-gray-300 font-semibold">
          <span className="text-green-500">98% Match</span>
          {year && <span>{year}</span>}
          <span className="border border-gray-500 px-1 text-xs rounded">HD</span>
        </div>
        <p className="text-sm md:text-lg text-gray-200 line-clamp-3 drop-shadow-md mb-8 w-full md:w-4/5">
          {drama.overview || 'No description available.'}
        </p>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onPlay(drama)}
            className="flex items-center justify-center bg-white text-black font-bold px-6 md:px-8 py-2 md:py-3 rounded hover:bg-gray-200 transition text-lg"
          >
            <PlayIcon />
            <span className="ml-2">Play</span>
          </button>
          <button
            onClick={() => onMoreInfo(drama)}
            className="flex items-center justify-center bg-gray-500/70 text-white font-bold px-6 md:px-8 py-2 md:py-3 rounded hover:bg-gray-600/70 transition text-lg backdrop-blur-sm"
          >
            <InfoIcon />
            <span className="ml-2">More Info</span>
          </button>

          <button
            onClick={() => onToggleMyList(drama.id)}
            className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 border-2 border-gray-400 rounded-full text-gray-300 hover:border-white hover:text-white transition bg-black/30 backdrop-blur-sm"
            title={isMyList ? "Remove from My List" : "Add to My List"}
          >
            {isMyList ? <CheckIcon /> : <PlusIcon />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
