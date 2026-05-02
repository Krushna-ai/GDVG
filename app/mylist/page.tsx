import type { Metadata } from 'next';
import MyListClient from './MyListClient';

export const metadata: Metadata = {
  title: 'My List',
  description: 'Your personal watchlist on Global Drama Verse Guide',
};

export default function MyListPage() {
  return <MyListClient />;
}
