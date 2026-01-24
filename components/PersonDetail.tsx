
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Person, Content } from '../types';
import { getFilmographyByPersonId, getPersonByName } from '../services/personService';
import DramaCard from './DramaCard';
import { ArrowLeftIcon } from './icons';
import SEOHead from './SEO/SEOHead';
import { getProfileUrl, PLACEHOLDER_PROFILE } from '../lib/tmdbImages';

interface PersonDetailProps {
    person?: Person;
    onBack?: () => void;
    onDramaClick?: (drama: Content) => void;
}

// Helper to get gender display
const getGenderDisplay = (gender?: number) => {
    if (gender === 1) return 'Female';
    if (gender === 2) return 'Male';
    if (gender === 3) return 'Non-binary';
    return null;
};

const PersonDetail: React.FC<PersonDetailProps> = ({
    person: propPerson,
    onBack,
    onDramaClick
}) => {
    const { name: paramName } = useParams<{ name: string }>();
    const navigate = useNavigate();

    const [activePerson, setActivePerson] = useState<Person | null>(propPerson || null);
    const [works, setWorks] = useState<Content[]>([]);
    const [loading, setLoading] = useState(!propPerson);
    const [worksLoading, setWorksLoading] = useState(true);

    // Fallback handlers
    const handleBack = onBack || (() => navigate(-1));
    const handleDrama = onDramaClick || ((d) => navigate(`/title/${d.id}`));

    useEffect(() => {
        const fetchPerson = async () => {
            if (propPerson) {
                setActivePerson(propPerson);
                setLoading(false);
                return;
            }

            if (paramName) {
                setLoading(true);
                const decodedName = decodeURIComponent(paramName);
                const fetched = await getPersonByName(decodedName);
                if (fetched) {
                    setActivePerson(fetched);
                } else {
                    console.error("Person not found:", decodedName);
                }
                setLoading(false);
            }
        };
        fetchPerson();
    }, [paramName, propPerson]);

    const person = activePerson;

    useEffect(() => {
        if (!person) return;

        const fetchWorks = async () => {
            setWorksLoading(true);
            const content = await getFilmographyByPersonId(person.id);
            setWorks(content);
            setWorksLoading(false);
        };
        fetchWorks();
    }, [person]);

    if (loading) return <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center text-white">Loading Profile...</div>;
    if (!person) return <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center text-white">Person not found</div>;

    const profileImageUrl = getProfileUrl(person.profile_path, 'h632') || PLACEHOLDER_PROFILE;
    const genderDisplay = getGenderDisplay(person.gender);

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white animate-fadeIn pt-24 px-4 md:px-12 pb-20">
            <SEOHead
                title={`${person.name} - Profile & Works`}
                description={person.biography || `Discover content featuring ${person.name}.`}
                image={profileImageUrl}
                type="article"
            />

            <button
                onClick={handleBack}
                className="mb-8 flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full transition"
            >
                <ArrowLeftIcon />
                <span className="font-bold">Back</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Profile Sidebar */}
                <div className="col-span-1">
                    <div className="rounded-lg overflow-hidden shadow-2xl border border-gray-800">
                        <img src={profileImageUrl} alt={person.name} className="w-full h-auto object-cover" />
                    </div>
                    <div className="mt-6 space-y-4">
                        <h1 className="text-3xl md:text-4xl font-bold">{person.name}</h1>
                        {person.also_known_as && person.also_known_as.length > 0 && (
                            <p className="text-xl text-gray-400">{person.also_known_as[0]}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                            {person.known_for_department && (
                                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded uppercase">
                                    {person.known_for_department}
                                </span>
                            )}
                            {genderDisplay && (
                                <span className="bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded uppercase">
                                    {genderDisplay}
                                </span>
                            )}
                        </div>

                        <div className="bg-[#1a1a1a] p-4 rounded border border-gray-800 mt-4">
                            <h3 className="text-gray-500 uppercase text-xs font-bold mb-3">Personal Info</h3>
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
                        </div>
                    </div>
                </div>

                {/* Bio and Filmography */}
                <div className="col-span-1 md:col-span-2">
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold mb-4 border-b border-gray-800 pb-2">Biography</h2>
                        <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                            {person.biography || 'No biography available.'}
                        </p>
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
                </div>
            </div>
        </div>
    );
};

export default PersonDetail;
