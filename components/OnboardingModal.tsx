
import React, { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { upsertUserProfile } from '../services/userService';
import { CheckIcon } from './icons';

interface OnboardingModalProps {
  session: Session;
  isOpen: boolean;
  onComplete: (success: boolean) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ session, isOpen, onComplete }) => {
  const [username, setUsername] = useState(session.user.email?.split('@')[0] || 'User');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const defaultAvatar = `https://api.dicebear.com/9.x/adventurer/svg?seed=${session.user.id}`;
        
        // Use actual email or a placeholder for phone-auth users to satisfy DB not-null constraints
        // (Ideally, run the SQL to make email optional, but this makes the frontend robust)
        const emailToSave = session.user.email || `user-${session.user.id.slice(0, 8)}@placeholder.com`;

        await upsertUserProfile(session.user.id, {
            username: username,
            avatarUrl: defaultAvatar,
            email: emailToSave
        });
        onComplete(true); // Success
    } catch (error) {
        console.error("Onboarding failed:", error);
        // Even if it fails (e.g. RLS or DB constraints), let them in to avoid blocking the user
        // but pass 'false' so we don't show a misleading success message.
        onComplete(false); 
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#1a1a1a] w-full max-w-md rounded-lg shadow-2xl border border-gray-700 p-8 animate-fadeIn text-center">
        
        <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
            <span className="text-3xl">👋</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Welcome to GDVG!</h2>
        <p className="text-gray-400 mb-8">Let's get you set up. What should we call you?</p>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-left text-xs font-bold text-gray-500 uppercase mb-2">Display Name</label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black border border-gray-600 rounded p-4 text-white text-lg focus:border-red-600 focus:outline-none placeholder-gray-600"
                    placeholder="e.g. DramaQueen123"
                    required
                    minLength={2}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded transition shadow-lg flex items-center justify-center disabled:opacity-50"
            >
                {loading ? (
                    <span className="animate-pulse">Setting up...</span>
                ) : (
                    <>
                        <CheckIcon />
                        <span className="ml-2">Start Watching</span>
                    </>
                )}
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
                You can change your avatar and details later in Account Settings.
            </p>
        </form>
      </div>
    </div>
  );
};

export default OnboardingModal;
