import { notFound } from 'next/navigation';
import { generateContentStaticParams } from '@/app/lib/staticParams';
import { getContentDetail, generateContentMetadata, renderContentJsonLd } from '@/app/lib/contentDetailHelpers';
import DramaDetailClient from '@/app/DramaDetailClient';
import type { Metadata } from 'next';

export const revalidate = 86400;

export async function generateStaticParams() {
  return generateContentStaticParams(['tv', 'drama', 'anime', 'variety', 'documentary'], 1000);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return generateContentMetadata(resolvedParams, 'series');
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const resolvedParams = await params;
  const content = await getContentDetail(resolvedParams);

  if (!content) {
    notFound();
  }

  return (
    <>
      {renderContentJsonLd(content)}
      <DramaDetailClient initialDrama={content} />
    </>
  );
}
