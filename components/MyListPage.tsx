
import React, { useState, useMemo, useEffect } from 'react';
import DramaCard from './DramaCard';
import type { Content, WatchStatus, UserListEntry } from '../types';
import { fetchUserList } from '../services/listService';
import { supabase } from '../lib/supabase';
import { PlusIcon } from './icons';

interface MyListPageProps {
  dramas: Content[];
  onDramaClick: (drama: Content) => void;
  isLoading: boolean;
}

const MyListPage: React.FC<MyListPageProps> = ({ dramas, onDramaClick, isLoading }) => {
  const [userList, setUserList] = useState<UserListEntry[]>([]);
  const [activeTab, setActiveTab] = useState<WatchStatus | 'All'>('All');

  useEffect(() => {
    const loadStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const list = await fetchUserList(session.user.id);
        setUserList(list);
      }
    };
    loadStatus();
  }, [dramas]); // Reload when dramas changes (likely due to updates)

  const filteredDramas = useMemo(() => {
    if (activeTab === 'All') return dramas;

    const targetIds = userList
      .filter(entry => entry.status === activeTab)
      .map(entry => entry.dramaId);

    return dramas.filter(d => targetIds.includes(d.id));
  }, [dramas, userList, activeTab]);

  const getEntry = (dramaId: string) => userList.find(e => e.dramaId === dramaId);

  const tabs: (WatchStatus | 'All')[] = ['All', 'Watching', 'Completed', 'Plan to Watch', 'On Hold', 'Dropped'];

  return (
    <div className="min-h-screen bg-[#0b0b0b] px-4 md:px-12 pt-24 md:pt-28 pb-20 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end mb-8 border-b border-gray-800 pb-4 justify-between">
        <div className="flex items-baseline">
          <h1 className="text-3xl md:text-5xl font-bold text-white">My List</h1>
          <span className="ml-4 text-gray-400 text-lg mb-1">{filteredDramas.length} Titles</span>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${activeTab === tab
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredDramas.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-12">
          {filteredDramas.map((drama) => {
            const entry = getEntry(drama.id);
            const totalEpisodes = drama.number_of_episodes || 0;
            return (
              <div key={drama.id} className="flex flex-col relative group">
                <DramaCard drama={drama} onClick={onDramaClick} />

                {/* Mini Progress Bar for Watching */}
                {entry && entry.status === 'Watching' && totalEpisodes > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Ep {entry.progress} of {totalEpisodes}</span>
                      <span>{Math.round((entry.progress / totalEpisodes) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-red-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, (entry.progress / totalEpisodes) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Score Badge */}
                {entry && entry.score > 0 && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition">
                    ★ {entry.score}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <div className="bg-gray-800/50 p-6 rounded-full mb-6">
            <PlusIcon />
          </div>
          <h3 className="text-xl font-bold text-gray-200 mb-2">No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} items found</h3>
          <p className="text-gray-500 max-w-md">
            Start tracking your journey by adding shows from the explore page.
          </p>
        </div>
      )}
    </div>
  );
};

export default MyListPage;
