
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Content, Person, UserListEntry, WatchStatus, WatchLink, CastMember } from '../types';
import type { Session } from '@supabase/supabase-js';
import { PlayIcon, PlusIcon, CheckIcon, ArrowLeftIcon, UserCircleIcon, StarIcon } from './icons';
import ReviewSection from './ReviewSection';
import DiscussionSection from './DiscussionSection';
import { fetchContentById, fetchContentBySlug, fetchSimilarContent, fetchRecommendations, fetchContentCast, fetchContentCrew, fetchWatchLinks } from '../services/contentService';
import { fetchUserList, updateUserListEntry, removeFromUserList } from '../services/listService';
import DramaCard from './DramaCard';
import AdBanner from './AdBanner';
import TrackModal from './TrackModal';
import SEOHead from './SEO/SEOHead';
import { getPosterUrl, getBackdropUrl, getProfileUrl, getLogoUrl, PLACEHOLDER_POSTER, PLACEHOLDER_PROFILE } from '../lib/tmdbImages';
import { getTmdbContentUrl, getImdbUrl, getWikipediaUrl } from '../lib/externalLinks';
import { getContentUrl, getPersonUrl } from '../lib/urlHelper';
import ImageGallery from './ImageGallery';
import WatchProvidersRegional from './WatchProvidersRegional';

interface DramaDetailProps {
    drama?: Content;
    onBack?: () => void;
    onPlay?: (drama: Content) => void;
    isMyList?: boolean;
    onToggleMyList?: (id: string) => void;
    session: Session | null;
    onOpenAuth: () => void;
    onPersonClick?: (person: Person) => void;
    onGenreClick?: (genre: string) => void;
    onDramaClick?: (drama: Content) => void;
    onRefreshList?: () => void;
}

// Helper: Extract year from date string
const getYear = (content: Content | null) => {
    if (!content) return '';
    const date = content.first_air_date || content.release_date;
    return date ? new Date(date).getFullYear() : '';
};

// Helper: Get country display
const getCountry = (content: Content | null) => {
    return content?.origin_country?.[0] || '';
};

// Helper: Get genres as string array for display
const getGenreNames = (content: Content | null): string[] => {
    if (!content) return [];
    if (!Array.isArray(content.genres)) return [];
    return content.genres.map(g => g.name);
};

// Helper: Get network name
const getNetworkName = (content: Content | null): string => {
    if (!content) return 'N/A';
    if (!Array.isArray(content.networks) || content.networks.length === 0) return 'N/A';
    return content.networks[0].name;
};

const DramaDetail: React.FC<DramaDetailProps> = ({
    drama: propDrama,
    onBack,
    onPlay,
    session,
    onOpenAuth,
    onPersonClick,
    onGenreClick,
    onDramaClick,
    onRefreshList
}) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [activeDrama, setActiveDrama] = useState<Content | null>(propDrama || null);
    const [castMembers, setCastMembers] = useState<CastMember[]>([]);
    const [crewMembers, setCrewMembers] = useState<any[]>([]);
    const [watchLinks, setWatchLinks] = useState<WatchLink[]>([]);
    const [similarContent, setSimilarContent] = useState<Content[]>([]);
    const [recommendations, setRecommendations] = useState<Content[]>([]); // NEW: TMDB recommendations
    const [isShareCopied, setIsShareCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'cast' | 'reviews' | 'discussions'>('overview');

    const [listEntry, setListEntry] = useState<UserListEntry | null>(null);
    const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(!propDrama);

    // Fallback handlers if props are missing (Routing Mode)
    const handleBack = onBack || (() => navigate(-1));
    const handlePerson = onPersonClick || ((person: Person) => navigate(getPersonUrl(person)));
    const handleGenre = onGenreClick || ((genre) => navigate(`/browse/series?genre=${encodeURIComponent(genre)}`));
    const handleDrama = onDramaClick || ((d) => navigate(getContentUrl(d)));

    useEffect(() => {
        const loadContent = async () => {
            if (propDrama) {
                setActiveDrama(propDrama);
                setIsLoading(false);
                return;
            }

            if (id) {
                setIsLoading(true);
                try {
                    let fetched: Content | null = null;
                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

                    if (isUUID) {
                        fetched = await fetchContentById(id);
                    } else {
                        const decodedStr = decodeURIComponent(id);
                        fetched = await fetchContentBySlug(decodedStr);
                    }

                    if (fetched) {
                        setActiveDrama(fetched);
                    } else {
                        console.error("Content not found:", id);
                    }
                } catch (e) {
                    console.error("Failed to load content", e);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        loadContent();
    }, [id, propDrama]);

    const drama = activeDrama;

    useEffect(() => {
        if (!drama) return;

        const loadRelated = async () => {
            // Load cast
            const cast = await fetchContentCast(drama.id);
            console.log("DramaDetail setCastMembers:", cast);
            setCastMembers(cast);

            // Load crew
            const crew = await fetchContentCrew(drama.id);
            setCrewMembers(crew);

            // Load TMDB recommendations (NEW: prioritize over genre-based)
            const recs = await fetchRecommendations(drama.id, 10);
            setRecommendations(recs);

            // Load similar content as fallback
            if (Array.isArray(drama.genres) && drama.genres.length > 0) {
                const similar = await fetchSimilarContent(drama.id, drama.genres);
                setSimilarContent(similar);
            }

            // Load watch links (streaming platforms)
            const links = await fetchWatchLinks(drama.id);
            setWatchLinks(links);

            // Load user list entry
            if (session) {
                const list = await fetchUserList(session.user.id);
                const entry = list.find(l => l.dramaId === drama.id);
                setListEntry(entry || null);
            }
        };
        loadRelated();
    }, [drama, session]);

    if (isLoading) return <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center text-white">Loading...</div>;
    if (!drama) return <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center text-white">Content not found</div>;

    const stats = {
        score: drama.vote_average || 0,
        rank: 42,
        popularity: Math.round(drama.popularity || 0),
        watchers: drama.vote_count || 0
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setIsShareCopied(true);
        setTimeout(() => setIsShareCopied(false), 2000);
    };

    const handleUpdateList = async (status: WatchStatus, progress: number, score: number) => {
        if (!session) return;
        const updated = await updateUserListEntry(session.user.id, drama.id, { status, progress, score });
        setListEntry(updated);
        if (onRefreshList) onRefreshList();
    };

    const handleRemoveFromList = async () => {
        if (!session) return;
        await removeFromUserList(session.user.id, drama.id);
        setListEntry(null);
        if (onRefreshList) onRefreshList();
    };

    // Get directors and writers from crew
    const directors = crewMembers.filter(c => c.job === 'Director');
    const writers = crewMembers.filter(c => c.department === 'Writing' || c.job === 'Screenplay' || c.job === 'Writer');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                // Filter main cast (role_type = 'main') or first 8 if no role_type
                const mainCast = castMembers.filter(c => c.role_type === 'main').length > 0
                    ? castMembers.filter(c => c.role_type === 'main')
                    : castMembers.slice(0, 8);

                // Get trailers from videos array - with defensive check
                const trailers = (Array.isArray(drama.videos) ? drama.videos : [])
                    .filter(v =>
                        v.type === 'Trailer' && v.site === 'YouTube'
                    );

                // Get keywords - with defensive check
                const keywords = Array.isArray(drama.keywords) ? drama.keywords : [];

                return (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Synopsis */}
                        <div>
                            <h3 className="text-xl font-bold text-white mb-3 border-l-4 border-red-600 pl-3">Synopsis</h3>
                            <p className="text-gray-300 text-lg leading-relaxed bg-[#141414] p-6 rounded-lg border border-gray-800 shadow-sm">
                                {drama.overview || 'No synopsis available.'}
                            </p>
                        </div>

                        {/* Keywords/Tags */}
                        {keywords.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold text-white mb-3 border-l-4 border-red-600 pl-3">Tags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {keywords.slice(0, 15).map(kw => (
                                        <span key={kw.id} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm hover:bg-red-600 hover:text-white transition cursor-pointer">
                                            {kw.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trailers */}
                        {trailers.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold text-white mb-3 border-l-4 border-red-600 pl-3">Trailers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {trailers.slice(0, 2).map((video, idx) => (
                                        <div key={video.key || idx} className="aspect-video rounded-lg overflow-hidden bg-black">
                                            <iframe
                                                src={`https://www.youtube.com/embed/${video.key}`}
                                                title={video.name || 'Trailer'}
                                                className="w-full h-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Where to Watch - Streaming Links */}
                        {(watchLinks.length > 0 || drama.homepage) && (
                            <div>
                                <h3 className="text-xl font-bold text-white mb-3 border-l-4 border-red-600 pl-3">Where to Watch</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {watchLinks.map(link => (
                                        <a
                                            key={link.id}
                                            href={link.link_url}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 hover:border-red-600 p-4 rounded-lg flex items-center justify-between group transition"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <PlayIcon />
                                                <div>
                                                    <span className="font-bold text-gray-200 group-hover:text-white block">{link.platform_name}</span>
                                                    <span className="text-xs text-gray-500">{link.region === 'ALL' ? 'Worldwide' : link.region}</span>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500 uppercase group-hover:text-red-500">Watch Now</span>
                                        </a>
                                    ))}
                                    {/* Fallback to homepage if no streaming links */}
                                    {watchLinks.length === 0 && drama.homepage && (
                                        <a
                                            href={drama.homepage}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 hover:border-red-600 p-4 rounded-lg flex items-center justify-between group transition"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <PlayIcon />
                                                <span className="font-bold text-gray-200 group-hover:text-white">Official Website</span>
                                            </div>
                                            <span className="text-xs text-gray-500 uppercase group-hover:text-red-500">Watch Now</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Regional Watch Providers */}
                        {drama.watch_providers && (
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-white mb-3 border-l-4 border-red-600 pl-3">Streaming Availability</h3>
                                <WatchProvidersRegional watchProviders={drama.watch_providers} />
                            </div>
                        )}

                        <AdBanner className="w-full h-24 rounded-lg" />

                        {/* Main Cast */}
                        {mainCast.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold text-white mb-3 border-l-4 border-red-600 pl-3">Main Cast</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {mainCast.slice(0, 8).map(cast => (
                                        <div
                                            key={cast.id}
                                            className="bg-[#141414] rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-red-600 transition"
                                            onClick={() => handlePerson(cast.person?.name || '')}
                                        >
                                            <img
                                                src={getProfileUrl(cast.person?.profile_path) || PLACEHOLDER_PROFILE}
                                                alt={cast.person?.name}
                                                className="w-full h-40 object-cover object-top"
                                            />
                                            <div className="p-3">
                                                <p className="text-white font-bold text-sm truncate">{cast.person?.name}</p>
                                                <p className="text-gray-500 text-xs truncate">{cast.character_name || 'Main Role'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {castMembers.length > mainCast.length && (
                                    <button onClick={() => setActiveTab('cast')} className="mt-4 text-red-500 text-sm font-bold hover:underline">
                                        View Full Cast &amp; Crew &rarr;
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Similar Content - Prioritize TMDB Recommendations */}
                        {(recommendations.length > 0 || similarContent.length > 0) && (
                            <div>
                                <h3 className="text-xl font-bold text-white mb-3 border-l-4 border-red-600 pl-3">You May Also Like</h3>
                                <div className="flex space-x-4 overflow-x-auto pb-6 no-scrollbar">
                                    {(recommendations.length > 0 ? recommendations : similarContent).map(sim => (
                                        <DramaCard key={sim.id} drama={sim} onClick={handleDrama} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'cast':
                return (
                    <div className="animate-fadeIn">
                        <h3 className="text-2xl font-bold text-white mb-6">Cast & Crew</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {castMembers.map(cast => (
                                <div
                                    key={cast.id}
                                    onClick={() => cast.person && handlePerson(cast.person)}
                                >
                                    <div className="w-24 h-24 rounded-full overflow-hidden mb-3 border-2 border-gray-800 group-hover:border-red-600 transition">
                                        <img
                                            src={getProfileUrl(cast.person?.profile_path) || PLACEHOLDER_PROFILE}
                                            alt={cast.person?.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <p className="text-white font-bold">{cast.person?.name}</p>
                                    <p className="text-gray-500 text-xs">{cast.character_name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'photos':
                return <ImageGallery images={drama.images || {}} type="content" />;
            case 'reviews':
                return <ReviewSection dramaId={drama.id} session={session} onOpenAuth={onOpenAuth} />;
            case 'discussions':
                return <DiscussionSection dramaId={drama.id} session={session} onOpenAuth={onOpenAuth} />;
        }
    };

    const backdropUrl = getBackdropUrl(drama.backdrop_path) || getPosterUrl(drama.poster_path, 'w780') || PLACEHOLDER_POSTER;
    const posterUrl = getPosterUrl(drama.poster_path) || PLACEHOLDER_POSTER;

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white animate-fadeIn pb-20">
            <SEOHead
                title={drama.title}
                description={drama.overview || ''}
                image={posterUrl}
                type={drama.content_type === 'movie' ? 'video.movie' : 'video.tv_show'}
                drama={drama as any}
            />

            <div className="relative w-full h-[50vh] md:h-[60vh]">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${backdropUrl})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0b]/90 via-transparent to-transparent"></div>
                </div>

                <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-end px-4 md:px-12 lg:px-24 pb-12">
                    <button onClick={handleBack} className="absolute top-24 left-4 md:left-12 flex items-center space-x-2 text-gray-300 hover:text-white transition">
                        <ArrowLeftIcon /> <span>Back</span>
                    </button>

                    <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg mb-2">{drama.title}</h1>
                    {drama.original_title && drama.original_title !== drama.title && (
                        <h2 className="text-2xl text-gray-400 font-light mb-4">{drama.original_title}</h2>
                    )}

                    {/* Tagline */}
                    {drama.tagline && (
                        <p className="text-lg md:text-xl text-gray-300 italic mb-4 font-light">"{drama.tagline}"</p>
                    )}

                    <div className="flex items-center flex-wrap gap-3 mb-6">
                        {/* Rating Score */}
                        <div className="flex items-center space-x-1 bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded text-yellow-400 font-bold text-sm">
                            <StarIcon filled /> <span>{stats.score.toFixed(1)}</span>
                        </div>

                        {/* Year */}
                        <span className="text-gray-300">{getYear(drama)}</span>

                        {/* Content Type */}
                        <span className="border border-gray-500 px-2 py-1 rounded text-xs font-semibold">
                            {drama.content_type?.toUpperCase()}
                        </span>

                        {/* Content Rating (Age Rating) */}
                        {drama.content_rating && (
                            <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                                {drama.content_rating}
                            </span>
                        )}

                        {/* Status Badge - Enhanced */}
                        {drama.tmdb_status && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${drama.tmdb_status.toLowerCase().includes('returning') || drama.tmdb_status.toLowerCase().includes('production')
                                ? 'bg-green-600 text-white'
                                : drama.tmdb_status.toLowerCase().includes('ended')
                                    ? 'bg-gray-600 text-white'
                                    : drama.tmdb_status.toLowerCase().includes('canceled')
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-gray-700 text-gray-300'
                                }`}>
                                {drama.tmdb_status}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => onPlay ? onPlay(drama) : console.log("Play not implemented yet")}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-bold flex items-center space-x-2 shadow-lg transition transform hover:scale-105"
                        >
                            <PlayIcon /> <span>Play Trailer</span>
                        </button>

                        <button
                            onClick={() => {
                                if (!session) { onOpenAuth(); return; }
                                setIsTrackModalOpen(true);
                            }}
                            className={`px-6 py-3 rounded font-bold flex items-center space-x-2 transition border ${listEntry
                                ? 'bg-white text-black border-white hover:bg-gray-200'
                                : 'bg-gray-800/80 text-white border-gray-600 hover:bg-gray-700'
                                }`}
                        >
                            {listEntry ? (
                                <>
                                    <CheckIcon />
                                    <div className="flex flex-col items-start -space-y-1 ml-2 text-left">
                                        <span className="text-xs uppercase font-extrabold">{listEntry.status}</span>
                                        <span className="text-[10px]">
                                            {listEntry.status === 'Completed'
                                                ? `Score: ${listEntry.score || '-'}/10`
                                                : `${listEntry.progress}/${drama.number_of_episodes || '?'} Eps`
                                            }
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <PlusIcon />
                                    <span>Add to List</span>
                                </>
                            )}
                        </button>

                        <button onClick={handleShare} className="text-gray-400 hover:text-white font-bold underline text-sm px-4">
                            {isShareCopied ? 'Copied!' : 'Share'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-12 lg:px-24 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2">
                        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto no-scrollbar">
                            {['overview', 'cast', 'photos', 'reviews', 'discussions'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-6 py-3 font-bold uppercase text-sm tracking-wide whitespace-nowrap border-b-2 transition ${activeTab === tab ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="min-h-[400px]">{renderTabContent()}</div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-[#141414] border border-gray-800 rounded-lg p-6 shadow-lg">
                            <h4 className="text-gray-400 font-bold text-sm uppercase mb-4 tracking-wider border-b border-gray-800 pb-2">Statistics</h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-black/50 p-3 rounded">
                                    <p className="text-xs text-gray-500 uppercase">Score</p>
                                    <p className="text-xl font-bold text-yellow-500">{stats.score.toFixed(1)}<span className="text-sm text-gray-600">/10</span></p>
                                </div>
                                <div className="bg-black/50 p-3 rounded">
                                    <p className="text-xs text-gray-500 uppercase">Votes</p>
                                    <p className="text-xl font-bold text-white">{stats.watchers.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-gray-400">
                                <div className="flex justify-between"><span>Popularity</span><span className="text-white font-medium">#{stats.popularity}</span></div>
                            </div>
                        </div>

                        <AdBanner type="rectangle" className="h-64 w-full rounded-lg" />

                        <div className="bg-[#141414] border border-gray-800 rounded-lg p-6">
                            <h4 className="text-gray-400 font-bold text-sm uppercase mb-4 tracking-wider border-b border-gray-800 pb-2">Details</h4>
                            <ul className="space-y-3 text-sm">
                                <li className="flex flex-col">
                                    <span className="text-red-500 font-bold text-xs uppercase">Original Title</span>
                                    <span className="text-white">{drama.original_title || 'N/A'}</span>
                                </li>

                                {directors.length > 0 && (
                                    <li className="flex flex-col">
                                        <span className="text-red-500 font-bold text-xs uppercase">Director</span>
                                        <div className="flex flex-wrap gap-2">
                                            {directors.map((d, i) => (
                                                <span key={i} className="text-blue-400 hover:underline cursor-pointer" onClick={() => handlePerson(d.person?.name || '')}>
                                                    {d.person?.name}{i < directors.length - 1 ? ', ' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </li>
                                )}

                                {writers.length > 0 && (
                                    <li className="flex flex-col">
                                        <span className="text-red-500 font-bold text-xs uppercase">Writer</span>
                                        <div className="flex flex-wrap gap-2">
                                            {writers.map((w, i) => (
                                                <span key={i} className="text-blue-400 hover:underline cursor-pointer" onClick={() => handlePerson(w.person?.name || '')}>
                                                    {w.person?.name}{i < writers.length - 1 ? ', ' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </li>
                                )}

                                <li className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">Country</span><span className="text-white">{getCountry(drama)}</span></li>
                                <li className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">Episodes</span><span className="text-white">{drama.number_of_episodes || 'N/A'}</span></li>
                                <li className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">Aired</span><span className="text-white">{getYear(drama)}</span></li>
                                <li className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">Network</span><span className="text-white">{getNetworkName(drama)}</span></li>
                                <li className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">Runtime</span><span className="text-white">{drama.runtime ? `${drama.runtime} min` : 'N/A'}</span></li>
                            </ul>

                            {/* External References */}
                            {(drama.tmdb_id || drama.imdb_id || drama.wikipedia_url) && (
                                <div className="mt-6">
                                    <h4 className="text-gray-500 font-bold text-xs uppercase mb-3">External Links</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {drama.tmdb_id && (
                                            <a
                                                href={getTmdbContentUrl(drama.content_type as 'tv' | 'movie', drama.tmdb_id)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-[#01b4e4] hover:bg-[#0199c7] text-white px-3 py-2 rounded text-xs font-semibold transition"
                                            >
                                                <span>🎬</span> TMDB
                                            </a>
                                        )}
                                        {drama.imdb_id && (
                                            <a
                                                href={getImdbUrl(drama.imdb_id)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-[#f5c518] hover:bg-[#e0b00f] text-black px-3 py-2 rounded text-xs font-semibold transition"
                                            >
                                                <span>⭐</span> IMDB
                                            </a>
                                        )}
                                        {drama.wikipedia_url && (
                                            <a
                                                href={getWikipediaUrl(drama.wikipedia_url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-xs font-semibold transition"
                                            >
                                                <span>📖</span> Wikipedia
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Production Companies */}
                            {Array.isArray(drama.production_companies) && drama.production_companies.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-gray-500 font-bold text-xs uppercase mb-3">Produced By</h4>
                                    <div className="space-y-3">
                                        {drama.production_companies.map((company: any) => (
                                            <div key={company.id} className="flex items-center gap-3">
                                                {company.logo_path ? (
                                                    <img
                                                        src={getLogoUrl(company.logo_path, 'w92') || ''}
                                                        alt={company.name}
                                                        className="h-8 w-auto object-contain bg-white/10 rounded px-2 py-1"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-12 bg-gray-800 rounded flex items-center justify-center">
                                                        <span className="text-xs">🏢</span>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm text-white font-medium">{company.name}</p>
                                                    {company.origin_country && (
                                                        <p className="text-xs text-gray-500">{company.origin_country}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Languages */}
                            {Array.isArray(drama.spoken_languages) && drama.spoken_languages.length > 0 && (
                                <div className="mb-3">
                                    <span className="block text-gray-500 text-xs uppercase mb-2">Languages</span>
                                    <div className="flex flex-wrap gap-2">
                                        {drama.spoken_languages.map((lang: any) => (
                                            <span key={lang.iso_639_1} className="text-xs bg-blue-700 text-white px-2 py-1 rounded">
                                                {lang.english_name || lang.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Production Countries */}
                            {Array.isArray(drama.production_countries) && drama.production_countries.length > 0 && (
                                <div className="mb-3">
                                    <span className="block text-gray-500 text-xs uppercase mb-2">Production Countries</span>
                                    <div className="flex flex-wrap gap-2">
                                        {drama.production_countries.map((country: any) => (
                                            <span key={country.iso_3166_1} className="text-xs bg-gray-700 text-white px-2 py-1 rounded">
                                                {country.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Alternative Titles */}
                            {Array.isArray(drama.alternative_titles) && drama.alternative_titles.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-gray-400 font-bold text-xs uppercase mb-3">Also Known As</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {drama.alternative_titles.map((alt: any, i: number) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <span className="text-sm text-gray-300 flex-1">{alt.title}</span>
                                                {alt.iso_3166_1 && (
                                                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                                                        {alt.iso_3166_1}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6">
                                <h4 className="text-gray-500 font-bold text-xs uppercase mb-2">Genres</h4>
                                <div className="flex flex-wrap gap-2">
                                    {getGenreNames(drama).map(g => (
                                        <span key={g} onClick={() => handleGenre(g)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded cursor-pointer transition">
                                            {g}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TrackModal
                drama={drama as any}
                isOpen={isTrackModalOpen}
                onClose={() => setIsTrackModalOpen(false)}
                currentStatus={listEntry?.status || null}
                currentProgress={listEntry?.progress || 0}
                currentScore={listEntry?.score || 0}
                onSave={handleUpdateList}
                onRemove={handleRemoveFromList}
            />
        </div>
    );
};

export default DramaDetail;
