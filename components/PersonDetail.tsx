
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Person, Content } from '../types';
import { getFilmographyByPersonId, getPersonByName } from '../services/personService';
import DramaCard from './DramaCard';
import { ArrowLeftIcon } from './icons';
import SEOHead from './SEO/SEOHead';
import { getProfileUrl, PLACEHOLDER_PROFILE } from '../lib/tmdbImages';
import ImageGallery from './ImageGallery';
import { getTmdbPersonUrl, getImdbUrl, getWikipediaUrl } from '../lib/externalLinks';

interface PersonDetailProps {
    person?: Person;
    onBack?: () => void;
    onDrama?: (content: Content) => void;
}

const PersonDetail: React.FC<PersonDetailProps> = ({ person: initialPerson, onBack, onDrama }) => {
    const { name } = useParams();
    const navigate = useNavigate();
    const [person, setPerson] = useState<Person | null>(initialPerson || null);
    const [works, setWorks] = useState<Content[]>([]);
    const [worksLoading, setWorksLoading] = useState(true);
    const [showAllAkas, setShowAllAkas] = useState(false);

    useEffect(() => {
        if (!initialPerson && name) {
            getPersonByName(name).then(p => setPerson(p));
        } else {
            setPerson(initialPerson || null);
        }
    }, [name, initialPerson]);

    useEffect(() => {
        if (!person) return;
        setWorksLoading(true);
        getFilmographyByPersonId(person.id).then(content => {
            setWorks(content);
            setWorksLoading(false);
        });
    }, [person]);

    if (!person) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    const handleDrama = (content: Content) => {
        if (onDrama) {
            onDrama(content);
        } else {
            navigate(`/title/${content.id}`);
        }
    };

    const profileUrl = getProfileUrl(person.profile_path) || PLACEHOLDER_PROFILE;

    const genderMap: Record<number, string> = { 0: 'Not Specified', 1: 'Female', 2: 'Male', 3: 'Non-binary' };
    const genderDisplay = person.gender !== undefined ? genderMap[person.gender] : '';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
            <SEOHead
                title={person.name}
                description={person.biography || `Learn more about ${person.name}`}
                image={profileUrl}
                type="profile"
            />

            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black"></div>

                <button
                    onClick={handleBack}
                    className="absolute top-6 left-6 z-10 flex items-center space-x-2 text-gray-300 hover:text-white transition"
                >
                    <ArrowLeftIcon /> <span>Back</span>
                </button>

                <div className="relative container mx-auto px-6 py-24">
                    <div className="flex flex-col md:flex-row gap-12">
                        <div className="flex-shrink-0">
                            <img
                                src={profileUrl}
                                alt={person.name}
                                className="w-64 h-96 object-cover rounded-lg shadow-2xl"
                            />
                        </div>

                        <div className="flex-1">
                            <h1 className="text-5xl font-extrabold mb-2">{person.name}</h1>
                            {person.also_known_as && person.also_known_as.length > 0 && (
                                <p className="text-xl text-gray-400">{person.also_known_as[0]}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 mt-6">
                                {person.known_for_department && (
                                    <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded uppercase">
                                        {person.known_for_department}
                                    </span>
                                )}
                                {genderDisplay && (
                                    <span className="bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded uppercase">
                                        {genderDisplay}
                                    </span>
                                )}
                            </div>

                            <div className="bg-gray-800/50 rounded-lg p-6 mt-8 space-y-4">
                                {person.birthday && (
                                    <div className="mb-3">
                                        <span className="block text-gray-400 text-xs uppercase">Birthday</span>
                                        <span>{new Date(person.birthday).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {person.deathday && (
                                    <div className="mb-3">
                                        <span className="block text-gray-400 text-xs uppercase">Died</span>
                                        <span>{new Date(person.deathday).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {person.place_of_birth && (
                                    <div className="mb-3">
                                        <span className="block text-gray-400 text-xs uppercase">Place of Birth</span>
                                        <span>{person.place_of_birth}</span>
                                    </div>
                                )}
                                {person.homepage && (
                                    <div>
                                        <span className="block text-gray-400 text-xs uppercase mb-1">Website</span>
                                        <a href={person.homepage} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm">
                                            Official Website
                                        </a>
                                    </div>
                                )}

                                {/* External Links */}
                                {(person.tmdb_id || person.imdb_id || person.wikipedia_url) && (
                                    <div className="mt-6">
                                        <h4 className="text-gray-400 font-bold text-xs uppercase mb-3">External Links</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {person.tmdb_id && (
                                                <a
                                                    href={getTmdbPersonUrl(person.tmdb_id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 bg-[#01b4e4] hover:bg-[#0199c7] text-white px-3 py-2 rounded text-xs font-semibold transition"
                                                >
                                                    <span>🎬</span> TMDB
                                                </a>
                                            )}
                                            {person.imdb_id && (
                                                <a
                                                    href={getImdbUrl(person.imdb_id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 bg-[#f5c518] hover:bg-[#e0b00f] text-black px-3 py-2 rounded text-xs font-semibold transition"
                                                >
                                                    <span>⭐</span> IMDB
                                                </a>
                                            )}
                                            {person.wikipedia_url && (
                                                <a
                                                    href={getWikipediaUrl(person.wikipedia_url)}
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

                                {/* All Also Known As Names */}
                                {person.also_known_as && person.also_known_as.length > 1 && (
                                    <div className="mt-6">
                                        <button
                                            onClick={() => setShowAllAkas(!showAllAkas)}
                                            className="text-gray-400 font-bold text-xs uppercase mb-2 hover:text-white transition flex items-center gap-2"
                                        >
                                            Also Known As {showAllAkas ? '▼' : '▶'}
                                        </button>
                                        {showAllAkas && (
                                            <div className="space-y-1">
                                                {person.also_known_as.map((name, i) => (
                                                    <p key={i} className="text-sm text-gray-300">{name}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 pb-20">
                <div className="grid grid-cols-1 gap-10">
                    <div className="col-span-1 md:col-span-2">
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold mb-4 border-b border-gray-800 pb-2">Biography</h2>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                                {person.biography || 'No biography available.'}
                            </p>
                            {person.bio_source && (
                                <p className="text-xs text-gray-500 mt-3 italic">
                                    Biography source: {person.bio_source}
                                </p>
                            )}
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-6 border-b border-gray-800 pb-2">Filmography</h2>
                            {worksLoading ? (
                                <div className="text-gray-500">Loading works...</div>
                            ) : works.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {works.map(content => (
                                        <DramaCard key={content.id} drama={content} onClick={handleDrama} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No content found in our database for this person yet.</p>
                            )}
                        </section>

                        {/* Photo Gallery */}
                        {person.images && Array.isArray(person.images.profiles) && person.images.profiles.length > 0 && (
                            <section className="mt-12">
                                <h2 className="text-2xl font-bold mb-6 border-b border-gray-800 pb-2">Photo Gallery</h2>
                                <ImageGallery images={person.images || {}} type="person" />
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonDetail;
