
import React, { useState, useEffect } from 'react';
import type { Person } from '../types';
import { fetchAllPeople } from '../services/personService';
import { ChevronDownIcon } from './icons';
import { getProfileUrl, PLACEHOLDER_PROFILE } from '../lib/tmdbImages';

interface PeoplePageProps {
  onPersonClick: (person: Person) => void;
}

const PeoplePage: React.FC<PeoplePageProps> = ({ onPersonClick }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPeople, setTotalPeople] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'popularity' | 'credits'>('popularity'); // NEW: Sort option
  const [isSortOpen, setIsSortOpen] = useState(false);

  const pageSize = 200;
  const totalPages = Math.ceil(totalPeople / pageSize);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { people: data, total } = await fetchAllPeople(currentPage, pageSize, sortBy);
        setPeople(data);
        setTotalPeople(total);
      } catch (e) {
        console.error("Failed to load people", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentPage, sortBy]); // Re-fetch when sort changes

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Filter by known_for_department (client-side on current page)
  const filteredPeople = roleFilter
    ? people.filter(p => p.known_for_department?.toLowerCase() === roleFilter.toLowerCase())
    : people;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalPeople);

  return (
    <div className="min-h-screen bg-[#0b0b0b] pt-24 px-4 md:px-12 pb-20 animate-fadeIn">
      <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold text-white">Celebs</h1>
          <p className="text-gray-400 mt-2">
            {loading ? 'Loading...' : `Showing ${startIndex}-${endIndex} of ${totalPeople.toLocaleString()}`}
          </p>
        </div>

        {/* Sort and Filter Controls */}
        <div className="flex items-center space-x-3">
          {/* Sort By */}
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center space-x-2 bg-black border border-gray-600 px-4 py-2 rounded hover:bg-gray-900 transition text-sm font-bold text-white"
            >
              <span>{sortBy === 'popularity' ? 'Most Popular' : 'Most Prolific'}</span>
              <ChevronDownIcon />
            </button>
            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-black/95 border border-gray-700 rounded shadow-xl z-10">
                <div
                  onClick={() => { setSortBy('popularity'); setIsSortOpen(false); }}
                  className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300"
                >
                  Most Popular
                </div>
                <div
                  onClick={() => { setSortBy('credits'); setIsSortOpen(false); }}
                  className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300"
                >
                  Most Prolific
                </div>
              </div>
            )}
          </div>

          {/* Role Filter */}
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
      </div>

      {loading ? (
        <div className="flex justify-center h-64 items-center text-white">Loading database...</div>
      ) : (
        <>
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
                  onClick={() => onPersonClick(person)}
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

          {/* Pagination Controls */}
          <div className="flex flex-col items-center mt-12 space-y-4">
            {/* Page Info */}
            <div className="text-gray-400 text-sm">
              Page {currentPage} of {totalPages}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-6 py-2 bg-gray-800 text-white rounded font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition"
              >
                ← Previous
              </button>

              <div className="flex items-center space-x-2">
                {/* First page */}
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => handlePageChange(1)}
                      className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
                    >
                      1
                    </button>
                    {currentPage > 4 && <span className="text-gray-500">...</span>}
                  </>
                )}

                {/* Page numbers around current */}
                {[currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
                  .filter(p => p > 0 && p <= totalPages)
                  .map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded transition ${pageNum === currentPage
                        ? 'bg-red-600 text-white font-bold'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                        }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                {/* Last page */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="text-gray-500">...</span>}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-6 py-2 bg-gray-800 text-white rounded font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PeoplePage;
