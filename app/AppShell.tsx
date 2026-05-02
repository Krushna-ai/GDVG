'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { AppProvider } from './AppContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VideoPlayer from '@/components/VideoPlayer';
import AuthModal from '@/components/AuthModal';
import Notification, { NotificationMessage, NotificationType } from '@/components/Notification';
import GlobalSearch from '@/components/GlobalSearch';
import OnboardingModal from '@/components/OnboardingModal';
import { fetchUserList, updateUserListEntry, removeFromUserList } from '@/services/listService';
import { syncGoogleUserData, getUserProfile } from '@/services/userService';
import { fetchPublishedContent } from '@/services/contentService';
import { getContentUrl, getPersonUrl } from '@/lib/urlHelper';
import type { Content } from '@/types';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // -- Global Data State --
  const [allContent, setAllContent] = useState<Content[]>([]);
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
    try {
      const popular = await fetchPublishedContent(100);
      setAllContent(popular);
    } catch (error) {
      console.error("Failed to fetch content:", error);
      setAllContent([]);
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
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkProfile(session);
    });

    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
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
  }, []);

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
    await getSupabaseClient().auth.signOut();
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
    const videos = (content as any).videos as { key: string; site: string; type: string }[] | undefined;
    const trailer = videos?.find(v => v.site === 'YouTube' && v.type === 'Trailer')
      ?? videos?.find(v => v.site === 'YouTube');
    if (trailer?.key) {
      setPlayingVideoId(trailer.key);
    } else {
      showNotification('info', 'Trailer not available.');
    }
  };

  const handleSurpriseMe = () => {
    if (allContent.length > 0) {
      const random = allContent[Math.floor(Math.random() * allContent.length)];
      router.push(getContentUrl(random));
      showNotification('success', `Random Pick: ${random.title}`);
    }
  };

  const contextValue = {
    session,
    myListIds,
    isLoadingList,
    openAuthModal: () => setIsAuthModalOpen(true),
    closeAuthModal: () => setIsAuthModalOpen(false),
    openGlobalSearch: () => setIsGlobalSearchOpen(true),
    closeGlobalSearch: () => setIsGlobalSearchOpen(false),
    showNotification,
    playVideo: (videoId: string) => setPlayingVideoId(videoId),
    closeVideo: () => setPlayingVideoId(null),
    toggleMyList: handleSimpleListToggle,
    refreshMyList: loadMyList,
    signOut: handleSignOut,
    isOnboardingOpen,
    closeOnboarding: () => setIsOnboardingOpen(false),
  };

  return (
    <AppProvider value={contextValue}>
      <div className="bg-[#0b0b0b] text-white min-h-screen font-sans overflow-x-hidden flex flex-col">
        <Navbar
          session={session}
          currentView={'home'}
          onNavigate={(view) => {
            if (view === 'home') router.push('/');
            if (view === 'mylist') {
              if (!session) setIsAuthModalOpen(true);
              else router.push('/mylist');
            }
            if (view === 'series') router.push('/series');
            if (view === 'films') router.push('/movies');
            if (view === 'people_catalog') router.push('/people');
            if (view === 'account') router.push('/account');
          }}
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
            router.push(getContentUrl(d));
            setIsGlobalSearchOpen(false);
          }}
          onPersonClick={(person) => {
            router.push(getPersonUrl(person));
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
          {children}
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
    </AppProvider>
  );
}
