import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center text-white px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-8">Page Not Found</p>
        <a href="/" className="text-red-500 hover:underline font-bold">
          Go back home
        </a>
      </div>
    </div>
  );
}
