import { notFound } from 'next/navigation';
import { generatePeopleStaticParams } from '@/app/lib/staticParams';
import { getPersonDetail, generatePersonMetadata, renderPersonJsonLd } from '@/app/lib/personDetailHelpers';
import PersonDetailClient from '@/app/PersonDetailClient';
import type { Metadata } from 'next';

export const revalidate = 86400;

export async function generateStaticParams() {
  return generatePeopleStaticParams(1000);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return generatePersonMetadata(resolvedParams);
}

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const resolvedParams = await params;
  const person = await getPersonDetail(resolvedParams);

  if (!person) {
    notFound();
  }

  return (
    <>
      {renderPersonJsonLd(person)}
      <PersonDetailClient person={person} />
    </>
  );
}
