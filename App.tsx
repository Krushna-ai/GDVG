
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import VideoPlayer from './components/VideoPlayer';
import AuthModal from './components/AuthModal';
import Notification, { NotificationMessage, NotificationType } from './components/Notification';
import GlobalSearch from './components/GlobalSearch';
import OnboardingModal from './components/OnboardingModal';

// Pages / Logic Components
import Home from './components/Home';
import DramaDetail from './components/DramaDetail';
import PersonDetail from './components/PersonDetail';
import CatalogPage from './components/CatalogPage';
import MyListPage from './components/MyListPage';

import AccountPage from './components/AccountPage';
import PeoplePage from './components/PeoplePage';

// Services
import { fetchPublishedContent, fetchTopRated, fetchRecentlyAdded } from './services/contentService';
import { fetchUserList, updateUserListEntry, removeFromUserList } from './services/listService';
import { syncGoogleUserData, getUserProfile } from './services/userService';
import { getContentUrl, getPersonUrl } from './lib/urlHelper';

import type { Content } from './types';

const App: React.FC = () => {
  const navigate = useNavigate();

  // -- Global Data State --
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [topRatedContent, setTopRatedContent] = useState<Content[]>([]);
  const [recentlyAddedContent, setRecentlyAddedContent] = useState<Content[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [myListIds, setMyListIds] = useState<string[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // -- UI State --
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // -- Helpers --
  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ id: Date.now().toString(), type, message });
  };

  // -- Data Fetching --
  const loadContent = useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const [popular, topRated, recent] = await Promise.all([
        fetchPublishedContent(100), // Limit to 100 most popular instead of all 10k+
        fetchTopRated(20),
        fetchRecentlyAdded(20)
      ]);
      setAllContent(popular);
      setTopRatedContent(topRated);
      setRecentlyAddedContent(recent);
    } catch (error) {
      console.error("Failed to fetch content:", error);
      setAllContent([]);
      setTopRatedContent([]);
      setRecentlyAddedContent([]);
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  const loadMyList = async () => {
    if (!session?.user) return;
    setIsLoadingList(true);
    try {
      const list = await fetchUserList(session.user.id);
      setMyListIds(list.map(l => l.dramaId));
    } catch (err) {
      console.error("Error fetching list:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    // Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkProfile(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setMyListIds([]);
      } else {
        checkProfile(session);
        if (session.user.app_metadata.provider === 'google') {
          syncGoogleUserData(session.user.id, session.user.user_metadata);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) loadMyList();
  }, [session]);

  const checkProfile = async (currentSession: Session | null) => {
    if (!currentSession) return;
    const profile = await getUserProfile(currentSession.user.id);
    if (!profile) setIsOnboardingOpen(true);
  };

  // -- Handlers --
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    showNotification('success', 'Signed out successfully.');
  };

  const handleSimpleListToggle = async (contentId: string) => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    const isRemoving = myListIds.includes(contentId);
    try {
      if (isRemoving) {
        await removeFromUserList(session.user.id, contentId);
        setMyListIds(prev => prev.filter(id => id !== contentId));
        showNotification('info', 'Removed from My List');
      } else {
        await updateUserListEntry(session.user.id, contentId, { status: 'Plan to Watch' });
        setMyListIds(prev => [...prev, contentId]);
        showNotification('success', 'Added to Plan to Watch');
      }
    } catch (error: any) {
      showNotification('error', 'Sync failed.');
    }
  };

  const handlePlay = (content: Content) => {
    // Content doesn't have videoUrl in TMDB schema, show info
    showNotification('info', 'Trailer playback coming soon.');
  };

  const handleSurpriseMe = () => {
    if (allContent.length > 0) {
      const random = allContent[Math.floor(Math.random() * allContent.length)];
      navigate(getContentUrl(random));
      showNotification('success', `Random Pick: ${random.title}`);
    }
  };

  // -- Navigation Adapter for Legacy Components --
  const handleLegacyNavigate = (view: string) => {
    if (view === 'home') navigate('/');
    if (view === 'mylist') {
      if (!session) setIsAuthModalOpen(true);
      else navigate('/mylist');
    }
    if (view === 'series') navigate('/browse/series');
    if (view === 'films') navigate('/browse/movies');
    if (view === 'people_catalog') navigate('/people');

    if (view === 'account') navigate('/account');
  };

  // Wrappers for Catalog to handle SearchParams
  const CatalogWrapper = ({ type }: { type: 'Series' | 'Movie' }) => {
    const [params] = useSearchParams();
    const genre = params.get('genre');
    return (
      <CatalogPage
        type={type}
        dramas={allContent}
        onDramaClick={(d) => navigate(getContentUrl(d))}
        initialGenre={genre || null}
      />
    );
  };



  if (isLoadingContent && allContent.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0b0b0b]">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0b0b] text-white min-h-screen font-sans overflow-x-hidden flex flex-col">
      <Navbar
        session={session}
        currentView={'home'}
        onNavigate={handleLegacyNavigate}
        onSearchClick={() => setIsGlobalSearchOpen(true)}
        onSurpriseClick={handleSurpriseMe}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <Notification notification={notification} onClose={() => setNotification(null)} />

      <GlobalSearch
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onDramaClick={(d) => {
          navigate(getContentUrl(d));
          setIsGlobalSearchOpen(false);
        }}
        onPersonClick={async (name) => {
          navigate(`/person/${encodeURIComponent(name)}`);
          setIsGlobalSearchOpen(false);
        }}
      />

      {session && (
        <OnboardingModal
          session={session}
          isOpen={isOnboardingOpen}
          onComplete={(success) => {
            setIsOnboardingOpen(false);
            if (success) showNotification('success', 'Profile setup complete!');
          }}
        />
      )}

      <main className="flex-grow relative">
        <div className="container mx-auto px-4 pt-20">
          {/* Breadcrumbs placeholder */}
        </div>
        <Routes>
          <Route path="/" element={
            <Home
              dramas={allContent}
              topRated={topRatedContent}
              recentlyAdded={recentlyAddedContent}
              myListIds={myListIds}
              session={session}
              onPlay={handlePlay}
              onToggleMyList={handleSimpleListToggle}
              onDramaClick={(d) => navigate(getContentUrl(d))}
            />
          } />

          {/* Content-type based routes for better SEO */}
          <Route path="/series/:id/:slug?" element={
            <DramaDetail
              session={session}
              onBack={() => navigate(-1)}
              onPlay={handlePlay}
              isMyList={false}
              onToggleMyList={handleSimpleListToggle}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onPersonClick={(name) => navigate(`/person/${encodeURIComponent(name)}`)}
              onGenreClick={(g) => navigate(`/browse/series?genre=${encodeURIComponent(g)}`)}
              onDramaClick={(d) => navigate(getContentUrl(d))}
              onRefreshList={loadMyList}
            />
          } />

          <Route path="/movies/:id/:slug?" element={
            <DramaDetail
              session={session}
              onBack={() => navigate(-1)}
              onPlay={handlePlay}
              isMyList={false}
              onToggleMyList={handleSimpleListToggle}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onPersonClick={(name) => navigate(`/person/${encodeURIComponent(name)}`)}
              onGenreClick={(g) => navigate(`/browse/series?genre=${encodeURIComponent(g)}`)}
              onDramaClick={(d) => navigate(getContentUrl(d))}
              onRefreshList={loadMyList}
            />
          } />

          <Route path="/drama/:id/:slug?" element={
            <DramaDetail
              session={session}
              onBack={() => navigate(-1)}
              onPlay={handlePlay}
              isMyList={false}
              onToggleMyList={handleSimpleListToggle}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onPersonClick={(name) => navigate(`/person/${encodeURIComponent(name)}`)}
              onGenreClick={(g) => navigate(`/browse/series?genre=${encodeURIComponent(g)}`)}
              onDramaClick={(d) => navigate(getContentUrl(d))}
              onRefreshList={loadMyList}
            />
          } />

          <Route path="/anime/:id/:slug?" element={
            <DramaDetail
              session={session}
              onBack={() => navigate(-1)}
              onPlay={handlePlay}
              isMyList={false}
              onToggleMyList={handleSimpleListToggle}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onPersonClick={(name) => navigate(`/person/${encodeURIComponent(name)}`)}
              onGenreClick={(g) => navigate(`/browse/series?genre=${encodeURIComponent(g)}`)}
              onDramaClick={(d) => navigate(getContentUrl(d))}
              onRefreshList={loadMyList}
            />
          } />

          <Route path="/people/:id/:slug?" element={
            <PersonDetail
              onBack={() => navigate(-1)}
              onDramaClick={(d) => navigate(getContentUrl(d))}
            />
          } />

          <Route path="/browse/series" element={<CatalogWrapper type="Series" />} />
          <Route path="/browse/movies" element={<CatalogWrapper type="Movie" />} />

          <Route path="/people" element={
            <PeoplePage onPersonClick={(name) => navigate(`/person/${encodeURIComponent(name)}`)} />
          } />

          <Route path="/mylist" element={
            session ? (
              <MyListPage
                dramas={allContent}
                onDramaClick={(d) => navigate(getContentUrl(d))}
                isLoading={isLoadingList}
              />
            ) : (
              <Navigate to="/" replace />
            )
          } />

          <Route path="/account" element={
            session ? (
              <AccountPage
                session={session}
                onNavigate={() => navigate('/')}
                onSignOut={handleSignOut}
              />
            ) : (
              <Navigate to="/" replace />
            )
          } />



          {/* Fallback */}
          <Route path="*" element={<div className="p-20 text-center text-gray-500">Page Not Found</div>} />
        </Routes>
      </main>

      <Footer />

      {playingVideoId && (
        <VideoPlayer videoId={playingVideoId} onClose={() => setPlayingVideoId(null)} />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        showNotification={showNotification}
      />
    </div>
  );
};

export default App;
