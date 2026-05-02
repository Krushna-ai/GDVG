'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PeoplePage from '@/components/PeoplePage';
import type { Person } from '@/types';
import { getPersonUrl } from '@/lib/urlHelper';

export default function PeopleCatalogClient() {
  const router = useRouter();

  const handlePersonClick = (person: Person) => {
    router.push(getPersonUrl(person));
  };

  return <PeoplePage onPersonClick={handlePersonClick} />;
}
