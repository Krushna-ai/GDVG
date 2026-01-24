
import React, { useState, useEffect } from 'react';
import type { Person } from '../types';
import { fetchAllPeople } from '../services/personService';
import { ChevronDownIcon } from './icons';
import { getProfileUrl, PLACEHOLDER_PROFILE } from '../lib/tmdbImages';

interface PeoplePageProps {
  onPersonClick: (name: string) => void;
}

const PeoplePage: React.FC<PeoplePageProps> = ({ onPersonClick }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAllPeople();
        setPeople(data);
      } catch (e) {
        console.error("Failed to load people", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter by known_for_department
  const filteredPeople = roleFilter
    ? people.filter(p => p.known_for_department?.toLowerCase() === roleFilter.toLowerCase())
    : people;

  return (
    <div className="min-h-screen bg-[#0b0b0b] pt-24 px-4 md:px-12 pb-20 animate-fadeIn">
      <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold text-white">Celebs</h1>
          <p className="text-gray-400 mt-2">Actors, Directors, and Writers from around the globe.</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2 bg-black border border-gray-600 px-4 py-2 rounded hover:bg-gray-900 transition text-sm font-bold text-white"
          >
            <span>{roleFilter || 'All Professions'}</span>
            <ChevronDownIcon />
          </button>
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-black/95 border border-gray-700 rounded shadow-xl z-10">
              <div onClick={() => { setRoleFilter(null); setIsFilterOpen(false); }} className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300">All</div>
              <div onClick={() => { setRoleFilter('Acting'); setIsFilterOpen(false); }} className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300">Actor</div>
              <div onClick={() => { setRoleFilter('Directing'); setIsFilterOpen(false); }} className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300">Director</div>
              <div onClick={() => { setRoleFilter('Writing'); setIsFilterOpen(false); }} className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300">Writer</div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-64 items-center text-white">Loading database...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredPeople.map(person => {
            const profileImage = person.profile_path
              ? getProfileUrl(person.profile_path, 'h632')
              : PLACEHOLDER_PROFILE;
            const altName = person.also_known_as?.[0] || '';

            return (
              <div
                key={person.id}
                className="group cursor-pointer"
                onClick={() => onPersonClick(person.name)}
              >
                <div className="rounded-lg overflow-hidden border-2 border-transparent group-hover:border-red-600 transition duration-300 relative aspect-[2/3]">
                  <img
                    src={profileImage}
                    alt={person.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => { e.currentTarget.src = PLACEHOLDER_PROFILE; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <p className="text-white font-bold text-lg">{person.name}</p>
                    {altName && <p className="text-gray-300 text-xs">{altName}</p>}
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-white font-bold truncate">{person.name}</h3>
                  <p className="text-gray-500 text-xs">{person.known_for_department || 'Unknown'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PeoplePage;
