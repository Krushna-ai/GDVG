'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Home from '@/components/Home';
import { useApp } from './AppContext';
import type { Content } from '@/types';
import { getContentUrl } from '@/lib/urlHelper';

interface HomePageClientProps {
  dramas: Content[];
  topRated: Content[];
  recentlyAdded: Content[];
}

export default function HomePageClient({ dramas, topRated, recentlyAdded }: HomePageClientProps) {
  const router = useRouter();
  const { session, myListIds, playVideo, toggleMyList } = useApp();

  const handleDramaClick = (d: Content) => {
    router.push(getContentUrl(d));
  };

  const handlePlay = (drama: Content) => {
    const videos = (drama as any).videos as { key: string; site: string; type: string }[] | undefined;
    const trailer = videos?.find(v => v.site === 'YouTube' && v.type === 'Trailer')
      ?? videos?.find(v => v.site === 'YouTube');
    if (trailer?.key) {
      playVideo(trailer.key);
    }
  };

  return (
    <Home
      dramas={dramas}
      topRated={topRated}
      recentlyAdded={recentlyAdded}
      myListIds={myListIds}
      session={session}
      onPlay={handlePlay}
      onToggleMyList={toggleMyList}
      onDramaClick={handleDramaClick}
    />
  );
}
