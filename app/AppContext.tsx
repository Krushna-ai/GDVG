'use client';

import React, { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { NotificationType } from '@/components/Notification';

interface AppContextType {
  session: Session | null;
  myListIds: string[];
  isLoadingList: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  showNotification: (type: NotificationType, message: string) => void;
  playVideo: (videoId: string) => void;
  closeVideo: () => void;
  toggleMyList: (contentId: string) => Promise<void>;
  refreshMyList: () => Promise<void>;
  signOut: () => Promise<void>;
  isOnboardingOpen: boolean;
  closeOnboarding: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppShell');
  }
  return context;
}

export function AppProvider({ children, value }: { children: React.ReactNode; value: AppContextType }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
