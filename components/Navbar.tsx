
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon, BellIcon, UserCircleIcon, MenuIcon, XIcon } from './icons';
import type { Session } from '@supabase/supabase-js';
import { ADMIN_EMAIL } from '../lib/constants';
import { getUserProfile } from '../services/userService';

interface NavbarProps {
  onSearchClick: () => void;
  onNavigate: (view: 'home' | 'mylist' | 'admin' | 'series' | 'films' | 'people_catalog' | 'account') => void;
  currentView: 'home' | 'mylist' | 'detail' | 'person' | 'admin' | 'series' | 'films' | 'people_catalog' | 'account';
  session: Session | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onSurpriseClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  onSearchClick,
  onNavigate,
  currentView,
  session,
  onOpenAuth,
  onSignOut,
  onSurpriseClick
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch profile avatar when session changes
  useEffect(() => {
    if (session) {
      getUserProfile(session.user.id).then(profile => {
        if (profile?.avatarUrl) setAvatarUrl(profile.avatarUrl);
      });
    } else {
      setAvatarUrl(null);
    }
  }, [session, currentView]);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinkClass = (view: 'home' | 'mylist' | 'series' | 'films' | 'people_catalog') =>
    `text-sm md:text-base font-medium transition cursor-pointer ${currentView === view ? 'text-white font-bold' : 'text-gray-300 hover:text-white'
    }`;

  const mobileLinkClass = (view: 'home' | 'mylist' | 'series' | 'films' | 'people_catalog') =>
    `text-xl font-medium transition cursor-pointer block py-2 ${currentView === view ? 'text-red-600 font-bold' : 'text-gray-300 hover:text-white'
    }`;

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-[#0b0b0b] shadow-lg py-3' : 'bg-gradient-to-b from-black/80 to-transparent py-5'}`}>
      <div className="container mx-auto px-4 md:px-12 flex justify-between items-center">
        <div className="flex items-center space-x-4 md:space-x-8">
          {/* Mobile Menu Button */}
          <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(true)}>
            <MenuIcon />
          </button>

          <h1
            className="text-2xl md:text-3xl font-bold text-red-600 tracking-wider cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            GDVG
          </h1>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className={navLinkClass('home')}>Home</Link>
            <Link to="/series" onClick={(e) => { e.preventDefault(); onNavigate('series'); }} className={navLinkClass('series')}>Series</Link>
            <Link to="/movies" onClick={(e) => { e.preventDefault(); onNavigate('films'); }} className={navLinkClass('films')}>Films</Link>
            <Link to="/people" onClick={(e) => { e.preventDefault(); onNavigate('people_catalog'); }} className={navLinkClass('people_catalog')}>Celebs</Link>
            <Link to="/mylist" onClick={(e) => { e.preventDefault(); onNavigate('mylist'); }} className={navLinkClass('mylist')}>My List</Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4 md:space-x-6">
          <button
            onClick={onSurpriseClick}
            className="hidden sm:flex items-center space-x-1 text-sm font-bold bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded transition border border-gray-600"
          >
            <span>🎲</span> <span>Shuffle</span>
          </button>
          <button onClick={onSearchClick} className="text-gray-300 hover:text-white transition">
            <SearchIcon />
          </button>
          <button className="text-gray-300 hover:text-white transition hidden sm:block">
            <BellIcon />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center focus:outline-none hover:scale-105 transition rounded"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-8 h-8 rounded border border-gray-600" />
              ) : (
                <UserCircleIcon />
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-black border border-gray-800 rounded shadow-xl overflow-hidden animate-fadeIn z-50">
                {session ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-xs text-gray-500 uppercase">Signed in as</p>
                      <p className="text-sm text-white truncate">{session.user.email}</p>
                    </div>
                    <div
                      className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300 transition"
                      onClick={() => { onNavigate('mylist'); setIsDropdownOpen(false); }}
                    >
                      My List
                    </div>

                    {isAdmin && (
                      <div
                        className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-red-400 transition font-semibold"
                        onClick={() => { onNavigate('admin'); setIsDropdownOpen(false); }}
                      >
                        Admin Dashboard
                      </div>
                    )}

                    <div
                      className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300 transition"
                      onClick={() => { onNavigate('account'); setIsDropdownOpen(false); }}
                    >
                      Account & Profile
                    </div>
                    <div className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-300 transition">Help Center</div>
                    <div
                      className="px-4 py-3 hover:bg-gray-800 cursor-pointer text-sm text-white border-t border-gray-800 transition"
                      onClick={() => { onSignOut(); setIsDropdownOpen(false); }}
                    >
                      Sign out of GDVG
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-3 text-sm text-gray-300 text-center">
                      Experience more with an account.
                    </div>
                    <div
                      className="block bg-red-600 text-white text-center font-bold py-2 mx-4 mb-3 rounded hover:bg-red-700 transition cursor-pointer"
                      onClick={() => { onOpenAuth(); setIsDropdownOpen(false); }}
                    >
                      Sign In
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Side Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fadeIn md:hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-2xl font-bold text-red-600">Menu</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-white p-2">
              <XIcon />
            </button>
          </div>
          <nav className="flex-grow flex flex-col p-8 space-y-4">
            <Link to="/" onClick={(e) => { e.preventDefault(); onNavigate('home'); setIsMobileMenuOpen(false); }} className={mobileLinkClass('home')}>Home</Link>
            <Link to="/series" onClick={(e) => { e.preventDefault(); onNavigate('series'); setIsMobileMenuOpen(false); }} className={mobileLinkClass('series')}>Series</Link>
            <Link to="/movies" onClick={(e) => { e.preventDefault(); onNavigate('films'); setIsMobileMenuOpen(false); }} className={mobileLinkClass('films')}>Films</Link>
            <Link to="/people" onClick={(e) => { e.preventDefault(); onNavigate('people_catalog'); setIsMobileMenuOpen(false); }} className={mobileLinkClass('people_catalog')}>Celebs</Link>
            <Link to="/mylist" onClick={(e) => { e.preventDefault(); onNavigate('mylist'); setIsMobileMenuOpen(false); }} className={mobileLinkClass('mylist')}>My List</Link>
            <button onClick={() => { onSurpriseClick(); setIsMobileMenuOpen(false); }} className="text-xl font-medium text-yellow-500 py-2">🎲 Shuffle Pick</button>
            {session && (
              <button onClick={() => { onNavigate('account'); setIsMobileMenuOpen(false); }} className="text-xl font-medium text-gray-300 py-2">Account</button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
