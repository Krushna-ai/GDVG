
'use client';

import React from 'react';
import type { Content } from '../types';
import { PlayCircleIcon } from './icons';
import { getPosterUrl, PLACEHOLDER_POSTER } from '../lib/tmdbImages';
import Link from 'next/link';
import SafeImage from './SafeImage';
import { getContentUrl } from '../lib/urlHelper';

interface DramaCardProps {
  drama: Content;
  onClick: (drama: Content) => void;
}

const DramaCard: React.FC<DramaCardProps> = ({ drama, onClick }) => {
  const posterImage = drama.poster_path
    ? getPosterUrl(drama.poster_path, 'w342')
    : PLACEHOLDER_POSTER;

  // Extract genre names from genre objects - with defensive check
  const genreNames = (Array.isArray(drama.genres) ? drama.genres : [])
    .slice(0, 2)
    .map(g => g.name);

  return (
    <Link
      href={getContentUrl(drama)}
      className="group relative block flex-shrink-0 w-36 md:w-48 h-[216px] md:h-[288px] rounded-md overflow-hidden cursor-pointer transition-all duration-300 hover:scale-110 hover:z-20 hover:shadow-xl"
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick(drama);
        }
      }}
    >
      <SafeImage
        src={posterImage}
        alt={drama.title}
        fill
        className="object-cover transition-opacity duration-300 group-hover:opacity-50"
        sizes="(max-width: 768px) 144px, 192px"
      />

      <div className="absolute inset-0 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <PlayCircleIcon />
        <h4 className="text-white text-xs md:text-sm font-bold text-center px-2 mt-2 drop-shadow-md">{drama.title}</h4>
        <div className="flex space-x-1 mt-1 text-[10px] text-gray-200">
          {genreNames.map(g => <span key={g}>• {g}</span>)}
        </div>
      </div>
    </Link>
  );
};

export default DramaCard;
