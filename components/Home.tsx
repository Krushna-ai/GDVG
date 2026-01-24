
import React from 'react';
import Hero from './Hero';
import Carousel from './Carousel';
import type { Content } from '../types';
import type { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface HomeProps {
    dramas: Content[];
    topRated?: Content[];
    recentlyAdded?: Content[];
    myListIds: string[];
    session: Session | null;
    onPlay: (drama: Content) => void;
    onToggleMyList: (id: string) => void;
    onDramaClick?: (drama: Content) => void;
}

// Helper to check country
const hasCountry = (content: Content, code: string) => {
    return content.origin_country?.includes(code) || false;
};

const Home: React.FC<HomeProps> = ({
    dramas,
    topRated = [],
    recentlyAdded = [],
    myListIds,
    session,
    onPlay,
    onToggleMyList,
    onDramaClick
}) => {
    const navigate = useNavigate();

    const handleDramaClick = onDramaClick || ((d) => navigate(`/title/${d.id}`));

    const featuredDrama = dramas.length > 0 ? dramas[0] : null;
    const trendingDramas = dramas.slice(1, 11);

    // Filter by origin_country
    const kDramas = dramas.filter(d => hasCountry(d, 'KR')).slice(0, 10);
    const cDramas = dramas.filter(d => hasCountry(d, 'CN')).slice(0, 10);
    const jDramas = dramas.filter(d => hasCountry(d, 'JP')).slice(0, 10);
    const indianDramas = dramas.filter(d => hasCountry(d, 'IN')).slice(0, 10);
    const westernDramas = dramas.filter(d => hasCountry(d, 'US') || hasCountry(d, 'GB')).slice(0, 10);

    const myListDramas = dramas.filter(d => myListIds.includes(d.id));

    return (
        <div className="animate-fadeIn">
            {featuredDrama && (
                <Hero
                    drama={featuredDrama}
                    onPlay={onPlay}
                    onMoreInfo={handleDramaClick}
                    isMyList={myListIds.includes(featuredDrama.id)}
                    onToggleMyList={onToggleMyList}
                />
            )}

            <div className="relative z-20 -mt-16 md:-mt-32 space-y-8 md:space-y-12 bg-gradient-to-b from-transparent to-[#0b0b0b] pt-16 pb-20">
                {trendingDramas.length > 0 && (
                    <Carousel title="Trending Now" dramas={trendingDramas} onDramaClick={handleDramaClick} />
                )}

                {topRated.length > 0 && (
                    <Carousel title="Top Rated" dramas={topRated.slice(0, 10)} onDramaClick={handleDramaClick} />
                )}

                {recentlyAdded.length > 0 && (
                    <Carousel title="Recently Added" dramas={recentlyAdded.slice(0, 10)} onDramaClick={handleDramaClick} />
                )}

                {session && myListDramas.length > 0 && (
                    <Carousel title="My List" dramas={myListDramas} onDramaClick={handleDramaClick} />
                )}

                {kDramas.length > 0 && (
                    <Carousel title="Popular K-Dramas" dramas={kDramas} onDramaClick={handleDramaClick} />
                )}

                {jDramas.length > 0 && (
                    <Carousel title="Japanese Series" dramas={jDramas} onDramaClick={handleDramaClick} />
                )}

                {cDramas.length > 0 && (
                    <Carousel title="Must-Watch C-Dramas" dramas={cDramas} onDramaClick={handleDramaClick} />
                )}

                {indianDramas.length > 0 && (
                    <Carousel title="Indian Hits" dramas={indianDramas} onDramaClick={handleDramaClick} />
                )}

                {westernDramas.length > 0 && (
                    <Carousel title="Western Series" dramas={westernDramas} onDramaClick={handleDramaClick} />
                )}

                {dramas.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-xl">No content available yet.</p>
                        <p className="text-gray-600 text-sm mt-2">Check back soon for new releases!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;

