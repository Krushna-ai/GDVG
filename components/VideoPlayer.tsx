
import React from 'react';
import { XIcon } from './icons';

interface VideoPlayerProps {
  videoId: string;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-12 text-white hover:text-gray-300 z-20 bg-black/50 rounded-full p-2"
      >
        <XIcon />
      </button>
      <div className="w-full h-full max-w-screen-xl max-h-[80vh] aspect-video relative px-4">
        <iframe
          className="w-full h-full rounded-lg shadow-2xl"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default VideoPlayer;
