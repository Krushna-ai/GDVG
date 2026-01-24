
import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { UserCircleIcon } from './icons';
import { getUserProfile, updateUserProfile } from '../services/userService';
import type { UserProfile } from '../types';

interface AccountPageProps {
  session: Session | null;
  onNavigate: (view: 'home') => void;
  onSignOut: () => void;
}

const AVATAR_PRESETS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Scooter',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Precious',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Bandit',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Misty',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Sassy',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Midnight'
];

const AccountPage: React.FC<AccountPageProps> = ({ session, onNavigate, onSignOut }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (session) {
      getUserProfile(session.user.id).then(data => {
        if (data) {
          setProfile(data);
          setUsername(data.username || '');
        }
      });
    }
  }, [session]);

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    setMessage(null);
    try {
      const updated = await updateUserProfile(session.user.id, { username });
      setProfile(updated);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (url: string) => {
    if (!session) return;
    try {
        const updated = await updateUserProfile(session.user.id, { avatarUrl: url });
        setProfile(updated);
    } catch (error) {
        console.error("Failed to update avatar", error);
    }
  };

  if (!session) {
      return (
          <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center">
              <div className="text-center">
                  <h1 className="text-2xl text-white mb-4">Please sign in to view your account</h1>
                  <button onClick={() => onNavigate('home')} className="text-red-600 hover:underline">Go Home</button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white pt-24 px-4 md:px-12 pb-20 animate-fadeIn">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 border-b border-gray-800 pb-4">Edit Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Avatar Selection */}
            <div className="col-span-1 flex flex-col items-center">
                <div className="w-40 h-40 rounded bg-gray-800 mb-4 overflow-hidden border-2 border-gray-700 relative group">
                    {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <UserCircleIcon />
                    )}
                </div>
                <p className="text-sm text-gray-400 mb-4">Choose an Avatar</p>
                <div className="grid grid-cols-4 gap-2">
                    {AVATAR_PRESETS.map((url, idx) => (
                        <img 
                            key={idx} 
                            src={url} 
                            alt="Preset" 
                            className="w-10 h-10 rounded-full cursor-pointer border border-transparent hover:border-white transition"
                            onClick={() => handleAvatarSelect(url)}
                        />
                    ))}
                </div>
            </div>

            {/* Profile Details */}
            <div className="col-span-2 space-y-6">
                <div>
                    <label className="block text-gray-400 text-sm font-bold mb-2">Email (Cannot be changed)</label>
                    <div className="bg-[#1a1a1a] p-3 rounded text-gray-500 border border-gray-800">
                        {session.user.email}
                    </div>
                </div>

                <div>
                    <label className="block text-gray-400 text-sm font-bold mb-2">Nickname</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-red-600 focus:outline-none"
                        placeholder="Enter a display name"
                    />
                </div>

                {message && (
                    <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                <div className="flex space-x-4 pt-4">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-8 rounded transition disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button 
                        onClick={() => onNavigate('home')}
                        className="bg-transparent border border-gray-600 text-white font-bold py-2 px-6 rounded hover:border-white transition"
                    >
                        Cancel
                    </button>
                </div>

                <hr className="border-gray-800 my-8" />
                
                <h3 className="text-xl font-bold mb-4">Account Actions</h3>
                <button 
                    onClick={onSignOut}
                    className="border border-gray-600 text-gray-300 px-6 py-2 rounded hover:border-white hover:text-white transition"
                >
                    Sign Out
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
