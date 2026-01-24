
import React from 'react';

interface AdBannerProps {
    className?: string;
    type?: 'leaderboard' | 'rectangle';
}

const AdBanner: React.FC<AdBannerProps> = ({ className, type = 'leaderboard' }) => {
    return (
        <div className={`bg-[#1a1a1a] border border-gray-800 flex flex-col items-center justify-center text-gray-600 overflow-hidden relative ${className}`}>
             <div className="absolute top-0 right-0 bg-gray-800 text-[9px] px-1 text-gray-400">AD</div>
             
             {type === 'leaderboard' ? (
                 <div className="flex flex-col items-center space-y-2 p-4">
                     <span className="text-xs uppercase tracking-widest font-bold">Advertisment Space</span>
                     <span className="text-[10px]">Support GDVG by disabling your adblocker</span>
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <span className="text-xl font-bold text-gray-700 mb-2">GDVG PRO</span>
                      <span className="text-xs">Join the community</span>
                 </div>
             )}
        </div>
    );
};

export default AdBanner;
