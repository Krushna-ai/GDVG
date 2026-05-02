'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PersonDetail from '@/components/PersonDetail';
import type { Content, Person } from '@/types';
import { getContentUrl } from '@/lib/urlHelper';

interface PersonDetailClientProps {
  person: Person;
}

export default function PersonDetailClient({ person }: PersonDetailClientProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleDrama = (content: Content) => {
    router.push(getContentUrl(content));
  };

  return (
    <PersonDetail
      person={person}
      onBack={handleBack}
      onDrama={handleDrama}
    />
  );
}
