'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import MyListPage from '@/components/MyListPage';
import { useApp } from '../AppContext';
import { getContentUrl } from '@/lib/urlHelper';

export default function MyListClient() {
  const router = useRouter();
  const { session } = useApp();

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
      dramas={[]}
      onDramaClick={(d) => router.push(getContentUrl(d))}
      isLoading={false}
    />
  );
}
