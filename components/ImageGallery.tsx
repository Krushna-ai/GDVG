import React, { useState } from 'react';

interface ImageItem {
    file_path: string;
    width?: number;
    height?: number;
    iso_639_1?: string;
    vote_average?: number;
    aspect_ratio?: number;
}

interface ImageGalleryProps {
    images: {
        posters?: ImageItem[];
        backdrops?: ImageItem[];
        logos?: ImageItem[];
        profiles?: ImageItem[];
    };
    type: 'content' | 'person';
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, type }) => {
    const [activeTab, setActiveTab] = useState<'posters' | 'backdrops' | 'logos' | 'profiles'>(
        type === 'person' ? 'profiles' : 'posters'
    );
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<ImageItem | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Get images for current tab
    const currentImages = images[activeTab] || [];

    // Get tabs based on type
    const tabs = type === 'person'
        ? ['profiles'] as const
        : ['posters', 'backdrops', 'logos'] as const;

    // Filter out empty tabs
    const availableTabs = tabs.filter(tab => {
        const imgs = images[tab];
        return Array.isArray(imgs) && imgs.length > 0;
    });

    if (availableTabs.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>No images available</p>
            </div>
        );
    }

    const openLightbox = (image: ImageItem, index: number) => {
        setLightboxImage(image);
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
        setLightboxImage(null);
    };

    const navigateLightbox = (direction: 'prev' | 'next') => {
        const newIndex = direction === 'next'
            ? (lightboxIndex + 1) % currentImages.length
            : (lightboxIndex - 1 + currentImages.length) % currentImages.length;
        setLightboxIndex(newIndex);
        setLightboxImage(currentImages[newIndex]);
    };

    // Handle keyboard navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!lightboxOpen) return;

            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigateLightbox('prev');
            if (e.key === 'ArrowRight') navigateLightbox('next');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, lightboxIndex, currentImages]);

    const getImageUrl = (path: string, size: string) => {
        return `${TMDB_IMAGE_BASE}/${size}${path}`;
    };

    const getLanguageName = (code: string) => {
        const languages: Record<string, string> = {
            'en': 'English',
            'ko': 'Korean',
            'ja': 'Japanese',
            'zh': 'Chinese',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'hi': 'Hindi',
            'th': 'Thai',
            'vi': 'Vietnamese'
        };
        return languages[code] || code.toUpperCase();
    };

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            {availableTabs.length > 1 && (
                <div className="flex gap-4 border-b border-gray-800">
                    {availableTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-bold uppercase text-sm tracking-wide capitalize border-b-2 transition ${activeTab === tab
                                    ? 'border-red-600 text-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {tab} ({images[tab]?.length || 0})
                        </button>
                    ))}
                </div>
            )}

            {/* Image Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentImages.map((image, index) => (
                    <div
                        key={index}
                        className="relative group cursor-pointer overflow-hidden rounded-lg bg-gray-900 aspect-[2/3]"
                        onClick={() => openLightbox(image, index)}
                    >
                        <img
                            src={getImageUrl(image.file_path, 'w342')}
                            alt={`${activeTab} ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                        />

                        {/* Overlay Info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                                {image.iso_639_1 && (
                                    <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                        {getLanguageName(image.iso_639_1)}
                                    </span>
                                )}
                                {image.vote_average && image.vote_average > 0 && (
                                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                        <span>⭐</span>
                                        <span>{image.vote_average.toFixed(1)}</span>
                                    </div>
                                )}
                                {image.width && image.height && (
                                    <p className="text-xs text-gray-400">
                                        {image.width} × {image.height}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Click to Expand Indicator */}
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            🔍 Click to enlarge
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox Modal */}
            {lightboxOpen && lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onClick={closeLightbox}
                >
                    {/* Close Button */}
                    <button
                        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-400 transition z-10"
                        onClick={closeLightbox}
                    >
                        ×
                    </button>

                    {/* Navigation Arrows */}
                    {currentImages.length > 1 && (
                        <>
                            <button
                                className="absolute left-4 text-white text-6xl hover:text-gray-400 transition z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigateLightbox('prev');
                                }}
                            >
                                ‹
                            </button>
                            <button
                                className="absolute right-4 text-white text-6xl hover:text-gray-400 transition z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigateLightbox('next');
                                }}
                            >
                                ›
                            </button>
                        </>
                    )}

                    {/* Image Counter */}
                    <div className="absolute top-4 left-4 text-white text-sm bg-black/60 px-3 py-2 rounded z-10">
                        {lightboxIndex + 1} / {currentImages.length}
                    </div>

                    {/* Image */}
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={getImageUrl(lightboxImage.file_path, 'original')}
                            alt="Full size"
                            className="max-w-full max-h-[90vh] object-contain"
                        />

                        {/* Image Info */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4 space-y-2">
                            <div className="flex flex-wrap gap-3 items-center">
                                {lightboxImage.iso_639_1 && (
                                    <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded">
                                        {getLanguageName(lightboxImage.iso_639_1)}
                                    </span>
                                )}
                                {lightboxImage.vote_average && lightboxImage.vote_average > 0 && (
                                    <div className="flex items-center gap-1 text-yellow-400">
                                        <span>⭐</span>
                                        <span>{lightboxImage.vote_average.toFixed(1)} Rating</span>
                                    </div>
                                )}
                                {lightboxImage.width && lightboxImage.height && (
                                    <span className="text-gray-400 text-sm">
                                        {lightboxImage.width} × {lightboxImage.height}px
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGallery;
