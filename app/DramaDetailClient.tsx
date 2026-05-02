'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DramaDetail from '@/components/DramaDetail';
import { useApp } from './AppContext';
import type { Content, Person } from '@/types';
import { getContentUrl, getPersonUrl } from '@/lib/urlHelper';


interface DramaDetailClientProps {
  initialDrama: Content;
}

export default function DramaDetailClient({ initialDrama }: DramaDetailClientProps) {
  const router = useRouter();
  const { session, myListIds, toggleMyList, openAuthModal, refreshMyList, playVideo } = useApp();
  const [drama, setDrama] = useState<Content>(initialDrama);

  // Refetch related data when drama changes (e.g., if client-side navigation occurs)
  useEffect(() => {
    setDrama(initialDrama);
  }, [initialDrama]);

  const handleBack = () => {
    router.back();
  };

  const handlePlay = (content: Content) => {
    const videos = (content as any).videos as { key: string; site: string; type: string }[] | undefined;
    const trailer = videos?.find(v => v.site === 'YouTube' && v.type === 'Trailer')
      ?? videos?.find(v => v.site === 'YouTube');
    if (trailer?.key) {
      playVideo(trailer.key);
    }
  };

  const handlePersonClick = (person: Person) => {
    router.push(getPersonUrl(person));
  };

  const handleGenreClick = (genre: string) => {
    router.push(`/series?genre=${encodeURIComponent(genre)}`);
  };

  const handleDramaClick = (d: Content) => {
    router.push(getContentUrl(d));
  };

  return (
    <DramaDetail
      drama={drama}
      session={session}
      onBack={handleBack}
      onPlay={handlePlay}
      isMyList={myListIds.includes(drama.id)}
      onToggleMyList={toggleMyList}
      onOpenAuth={openAuthModal}
      onPersonClick={handlePersonClick}
      onGenreClick={handleGenreClick}
      onDramaClick={handleDramaClick}
      onRefreshList={refreshMyList}
    />
  );
}
