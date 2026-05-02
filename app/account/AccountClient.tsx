'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AccountPage from '@/components/AccountPage';
import { useApp } from '../AppContext';

export default function AccountClient() {
  const router = useRouter();
  const { session, signOut } = useApp();

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Please sign in to view your account</p>
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
    <AccountPage
      session={session}
      onNavigate={() => router.push('/')}
      onSignOut={signOut}
    />
  );
}
