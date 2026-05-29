'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CatalogPage from '@/components/CatalogPage';
import type { Content } from '@/types';
import { getContentUrl } from '@/lib/urlHelper';

interface Props {
  dramas: Content[];
  initialGenre: string | null;
  type?: string;
  contentTypeParam: string;
  totalCount?: number;
}

export default function SeriesCatalogClient({
  dramas,
  initialGenre,
  type = 'Dramas',
  contentTypeParam,
  totalCount,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(dramas);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(
    dramas.length === 24
  );
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(
        `/api/catalog?type=${contentTypeParam}&page=${nextPage}`
      );
      const json = await res.json();
      if (json.data?.length > 0) {
        setItems(prev => [...prev, ...json.data]);
        setPage(nextPage);
        setHasMore(json.hasMore);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, contentTypeParam]);

  // IntersectionObserver — triggers when sentinel
  // div enters the viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '0px 0px 50% 0px', // Start loading when sentinel is 50% into viewport
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  const handleDramaClick = (drama: Content) => {
    router.push(getContentUrl(drama));
  };

  return (
    <div>
      <CatalogPage
        type={type}
        dramas={items}
        onDramaClick={handleDramaClick}
        initialGenre={initialGenre}
        totalCount={totalCount}
      />
      {/* Sentinel div — invisible, watched by observer */}
      <div ref={sentinelRef} className="h-4" />
      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="flex space-x-2 items-center
            text-gray-500">
            <div className="w-2 h-2 bg-gray-500
              rounded-full animate-bounce
              [animation-delay:0ms]" />
            <div className="w-2 h-2 bg-gray-500
              rounded-full animate-bounce
              [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-gray-500
              rounded-full animate-bounce
              [animation-delay:300ms]" />
          </div>
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <p className="text-center text-gray-600
          text-sm py-8">
          All {totalCount?.toLocaleString()} titles loaded
        </p>
      )}
    </div>
  );
}
