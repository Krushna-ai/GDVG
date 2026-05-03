'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MyListPage from '@/components/MyListPage';
import { useApp } from '../AppContext';
import { getContentUrl } from '@/lib/urlHelper';
import { getSupabaseClient } from '@/lib/supabase';
import { normalizeContentArray } from '@/lib/contentNormalizer';
import type { Content } from '@/types';

export default function MyListClient() {
  const router = useRouter();
  const { session, myListIds, isLoadingList } = useApp();
  const [dramas, setDramas] = useState<Content[]>([]);
  const [isFetchingContent, setIsFetchingContent] = useState(false);

  useEffect(() => {
    if (!session || myListIds.length === 0) {
      setDramas([]);
      return;
    }

    const fetchListContent = async () => {
      setIsFetchingContent(true);
      try {
        const { data, error } = await getSupabaseClient()
          .from('content')
          .select('*')
          .in('id', myListIds)
          .eq('status', 'published');

        if (!error && data) {
          setDramas(normalizeContentArray(data));
        }
      } catch (err) {
        console.error('Failed to fetch list content:', err);
      } finally {
        setIsFetchingContent(false);
      }
    };

    fetchListContent();
  }, [session, myListIds]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Please sign in to view your list</p>
          <button
            onClick={() => router.push('/')}
            className="text-red-600 hover:underline font-bold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <MyListPage
      dramas={dramas}
      onDramaClick={(d) => router.push(getContentUrl(d))}
      isLoading={isLoadingList || isFetchingContent}
    />
  );
}
