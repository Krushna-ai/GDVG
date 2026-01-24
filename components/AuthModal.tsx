
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { XIcon, GoogleIcon } from './icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  showNotification: (type: 'success' | 'error', message: string) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, showNotification }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        showNotification('success', 'Sign up successful! You are logged in.');
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        showNotification('success', 'Welcome back!');
        onClose();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      showNotification('error', err.message || 'Google Sign-In failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      <div className="relative bg-black/90 border border-gray-800 rounded-lg w-full max-w-md p-8 md:p-12 shadow-2xl animate-fadeIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <XIcon />
        </button>

        <h2 className="text-3xl font-bold text-white mb-8">
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </h2>

        <div className="space-y-6">
          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-gray-800 font-bold py-3.5 rounded flex items-center justify-center hover:bg-gray-100 transition"
          >
            <div className="mr-3"><GoogleIcon /></div>
            Continue with Google
          </button>

          <div className="flex items-center justify-between">
            <hr className="w-full border-gray-700" />
            <span className="px-3 text-gray-500 text-sm uppercase">Or</span>
            <hr className="w-full border-gray-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Email or phone number"
                className="w-full bg-[#333] text-white rounded px-4 py-3.5 focus:outline-none focus:bg-[#444] transition border-transparent focus:border-gray-500 placeholder-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-[#333] text-white rounded px-4 py-3.5 focus:outline-none focus:bg-[#444] transition border-transparent focus:border-gray-500 placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white font-bold py-3.5 rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>

            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <label className="flex items-center cursor-pointer hover:text-gray-300">
                <input type="checkbox" className="mr-2 rounded bg-gray-700 border-transparent focus:ring-0" />
                Remember me
              </label>
              <a href="#" className="hover:underline hover:text-gray-300">Need help?</a>
            </div>
          </form>
        </div>

        <div className="mt-10 text-gray-400">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button 
                onClick={() => setIsSignUp(false)}
                className="text-white hover:underline ml-1"
              >
                Sign in now.
              </button>
            </p>
          ) : (
            <p>
              New to GDVG?{' '}
              <button 
                onClick={() => setIsSignUp(true)}
                className="text-white hover:underline ml-1"
              >
                Sign up now.
              </button>
            </p>
          )}
          <p className="text-xs text-gray-500 mt-4">
            This page is protected by Google reCAPTCHA to ensure you're not a bot.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
