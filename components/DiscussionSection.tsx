
import React, { useState, useEffect } from 'react';
import type { Discussion } from '../types';
import type { Session } from '@supabase/supabase-js';
import { fetchDiscussions, createDiscussion } from '../services/contentService';
import { getUserProfile } from '../services/userService';
import { UserIcon, PlusIcon } from './icons';

interface DiscussionSectionProps {
  dramaId: string; // Changed to string
  session: Session | null;
  onOpenAuth: () => void;
}

interface EnhancedDiscussion extends Discussion {
  userDisplayName?: string;
  userAvatar?: string;
}

const DiscussionSection: React.FC<DiscussionSectionProps> = ({ dramaId, session, onOpenAuth }) => {
  const [discussions, setDiscussions] = useState<EnhancedDiscussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  useEffect(() => {
    const loadDiscussions = async () => {
      try {
        const data = await fetchDiscussions(dramaId);
        const enriched = await Promise.all(data.map(async (d) => {
          const profile = await getUserProfile(d.userId);
          return {
            ...d,
            userDisplayName: profile?.username || 'Anonymous User',
            userAvatar: profile?.avatarUrl || undefined
          };
        }));
        setDiscussions(enriched);
      } catch (error) {
        console.error("Failed to load discussions:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDiscussions();
  }, [dramaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      const newDisc = await createDiscussion({
        dramaId,
        userId: session.user.id,
        title: newTitle,
        body: newBody
      });

      const profile = await getUserProfile(session.user.id);
      const enriched: EnhancedDiscussion = {
        ...newDisc,
        userDisplayName: profile?.username || 'Me',
        userAvatar: profile?.avatarUrl || undefined
      };

      setDiscussions([enriched, ...discussions]);
      setIsCreating(false);
      setNewTitle('');
      setNewBody('');
    } catch (error) {
      alert('Failed to create discussion');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white">Community Discussions</h3>
        <button
          onClick={() => session ? setIsCreating(!isCreating) : onOpenAuth()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center"
        >
          {isCreating ? 'Cancel' : <><PlusIcon /><span className="ml-2">New Topic</span></>}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] p-6 rounded mb-8 border border-gray-700">
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Topic Title</label>
            <input
              required
              className="w-full bg-black border border-gray-700 rounded p-3 text-white font-bold"
              placeholder="e.g. Theory about the ending..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
            <textarea
              required
              rows={4}
              className="w-full bg-black border border-gray-700 rounded p-3 text-white"
              placeholder="Write your thoughts here..."
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-white text-black font-bold px-6 py-2 rounded hover:bg-gray-200">Post Discussion</button>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500">Loading topics...</div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-800 rounded">
          <p className="text-gray-400">No discussions yet. Be the first to start a topic!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {discussions.map(disc => (
            <div key={disc.id} className="bg-[#141414] border border-gray-800 p-4 rounded hover:border-gray-600 transition cursor-pointer group">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {disc.userAvatar ? (
                    <img src={disc.userAvatar} alt="User" className="w-10 h-10 rounded-full border border-gray-700" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-500"><UserIcon /></div>
                  )}
                </div>
                <div className="flex-grow">
                  <h4 className="text-lg font-bold text-white group-hover:text-red-500 transition">{disc.title}</h4>
                  <p className="text-xs text-gray-500 mb-2">
                    Started by <span className="text-gray-300">{disc.userDisplayName}</span> • {new Date(disc.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-gray-400 text-sm line-clamp-2">{disc.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscussionSection;
