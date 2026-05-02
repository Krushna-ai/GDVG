import { Metadata } from 'next';
import PeopleCatalogClient from '../PeopleCatalogClient';

export const metadata: Metadata = {
  title: 'Celebs',
  description: 'Discover popular actors, directors, and celebrities on Global Drama Verse Guide.',
};

export default function PeopleCatalogPage() {
  return <PeopleCatalogClient />;
}
