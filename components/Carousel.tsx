
import React, { useRef } from 'react';
import type { Content } from '../types';
import DramaCard from './DramaCard';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface CarouselProps {
  title: string;
  dramas: Content[];
  onDramaClick: (drama: Content) => void;
}

const Carousel: React.FC<CarouselProps> = ({ title, dramas, onDramaClick }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!dramas || dramas.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full mb-8 z-0 relative group">
      <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-4 text-gray-100 hover:text-white cursor-pointer transition px-4 md:px-12">{title}</h3>

      <div className="relative px-4 md:px-12">
        {/* Left Scroll Button */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-0 bottom-0 z-50 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70 h-full hidden md:flex cursor-pointer"
        >
          <ChevronLeftIcon />
        </button>

        <div
          ref={rowRef}
          className="flex space-x-2 md:space-x-4 overflow-x-auto overflow-y-hidden pb-6 md:pb-8 no-scrollbar scroll-smooth"
        >
          {dramas.map((drama) => (
            <DramaCard key={drama.id} drama={drama} onClick={onDramaClick} />
          ))}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-0 bottom-0 z-50 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70 h-full hidden md:flex cursor-pointer"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
};

export default Carousel;
