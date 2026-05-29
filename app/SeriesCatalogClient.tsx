'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CatalogPage from '@/components/CatalogPage';
import type { Content } from '@/types';
import { getContentUrl } from '@/lib/urlHelper';

interface Props {
  dramas: Content[];
  initialGenre: string | null;
  type?: string;
  contentTypeParam: string;
  // 'tv,drama' or 'movie' or 'anime'
  totalCount?: number;
}

export default function SeriesCatalogClient({
  dramas, initialGenre, type = 'Dramas',
  contentTypeParam, totalCount
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(dramas);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(
    dramas.length === 24
  );
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    const nextPage = page + 1;
    const res = await fetch(
      `/api/catalog?type=${contentTypeParam}&page=${nextPage}`
    );
    const json = await res.json();
    setItems(prev => [...prev, ...json.data]);
    setPage(nextPage);
    setHasMore(json.hasMore);
    setLoading(false);
  };

  const handleDramaClick = (drama: Content) => {
    router.push(getContentUrl(drama));
  };

  return (
    <>
      <CatalogPage
        type={type}
        dramas={items}
        onDramaClick={handleDramaClick}
        initialGenre={initialGenre}
        totalCount={totalCount}
      />
      {hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700
              text-white rounded-lg font-medium transition
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </>
  );
}
