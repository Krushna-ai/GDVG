'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CatalogPage from '@/components/CatalogPage';
import type { Content } from '@/types';
import { getContentUrl } from '@/lib/urlHelper';

interface MoviesCatalogClientProps {
  dramas: Content[];
  initialGenre: string | null;
}

export default function MoviesCatalogClient({ dramas, initialGenre }: MoviesCatalogClientProps) {
  const router = useRouter();

  const handleDramaClick = (drama: Content) => {
    router.push(getContentUrl(drama));
  };

  return (
    <CatalogPage
      type="Movie"
      dramas={dramas}
      onDramaClick={handleDramaClick}
      initialGenre={initialGenre}
    />
  );
}
