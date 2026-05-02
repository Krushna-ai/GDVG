'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CatalogPage from '@/components/CatalogPage';
import type { Content } from '@/types';
import { getContentUrl } from '@/lib/urlHelper';

interface SeriesCatalogClientProps {
  dramas: Content[];
  initialGenre: string | null;
}

export default function SeriesCatalogClient({ dramas, initialGenre }: SeriesCatalogClientProps) {
  const router = useRouter();

  const handleDramaClick = (drama: Content) => {
    router.push(getContentUrl(drama));
  };

  return (
    <CatalogPage
      type="Series"
      dramas={dramas}
      onDramaClick={handleDramaClick}
      initialGenre={initialGenre}
    />
  );
}
