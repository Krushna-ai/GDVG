'use client';

import React, { useState } from 'react';
import SafeImage from './SafeImage';

interface Provider {
    logo_path: string;
    provider_id: number;
    provider_name: string;
    display_priority: number;
}

interface RegionalData {
    link?: string;
    flatrate?: Provider[];
    rent?: Provider[];
    buy?: Provider[];
}

interface WatchProviders {
    results?: {
        [countryCode: string]: RegionalData;
    };
}

interface WatchProvidersRegionalProps {
    watchProviders: WatchProviders;
    defaultRegion?: string;
}

const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/original';

// Popular regions with flags
const REGIONS = [
    { code: 'US', name: '🇺🇸 United States', flag: '🇺🇸' },
    { code: 'KR', name: '🇰🇷 South Korea', flag: '🇰🇷' },
    { code: 'GB', name: '🇬🇧 United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: '🇨🇦 Canada', flag: '🇨🇦' },
    { code: 'AU', name: '🇦🇺 Australia', flag: '🇦🇺' },
    { code: 'JP', name: '🇯🇵 Japan', flag: '🇯🇵' },
    { code: 'IN', name: '🇮🇳 India', flag: '🇮🇳' },
    { code: 'DE', name: '🇩🇪 Germany', flag: '🇩🇪' },
    { code: 'FR', name: '🇫🇷 France', flag: '🇫🇷' },
    { code: 'ES', name: '🇪🇸 Spain', flag: '🇪🇸' },
    { code: 'IT', name: '🇮🇹 Italy', flag: '🇮🇹' },
    { code: 'BR', name: '🇧🇷 Brazil', flag: '🇧🇷' },
    { code: 'MX', name: '🇲🇽 Mexico', flag: '🇲🇽' },
    { code: 'NL', name: '🇳🇱 Netherlands', flag: '🇳🇱' },
    { code: 'SE', name: '🇸🇪 Sweden', flag: '🇸🇪' },
    { code: 'NO', name: '🇳🇴 Norway', flag: '🇳🇴' },
    { code: 'DK', name: '🇩🇰 Denmark', flag: '🇩🇰' },
    { code: 'FI', name: '🇫🇮 Finland', flag: '🇫🇮' },
    { code: 'PL', name: '🇵🇱 Poland', flag: '🇵🇱' },
    { code: 'TH', name: '🇹🇭 Thailand', flag: '🇹🇭' },
    { code: 'SG', name: '🇸🇬 Singapore', flag: '🇸🇬' },
    { code: 'MY', name: '🇲🇾 Malaysia', flag: '🇲🇾' },
    { code: 'PH', name: '🇵🇭 Philippines', flag: '🇵🇭' },
    { code: 'ID', name: '🇮🇩 Indonesia', flag: '🇮🇩' },
    { code: 'VN', name: '🇻🇳 Vietnam', flag: '🇻🇳' },
];

const WatchProvidersRegional: React.FC<WatchProvidersRegionalProps> = ({
    watchProviders,
    defaultRegion = 'US'
}) => {
    const [selectedRegion, setSelectedRegion] = useState(defaultRegion);

    // Get available regions from data
    const availableRegions = watchProviders?.results
        ? Object.keys(watchProviders.results)
        : [];

    // Filter REGIONS to only show those with data
    const regionsWithData = REGIONS.filter(r => availableRegions.includes(r.code));

    if (!watchProviders?.results || availableRegions.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>No streaming information available</p>
            </div>
        );
    }

    const regionalData = watchProviders.results[selectedRegion];

    if (!regionalData) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>No streaming information available for this region</p>
            </div>
        );
    }

    const renderProviders = (providers: Provider[] | undefined, type: string) => {
        if (!providers || providers.length === 0) return null;

        return (
            <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">
                    {type === 'flatrate' ? '📺 Stream' : type === 'rent' ? '💰 Rent' : '🛒 Buy'}
                </h4>
                <div className="flex flex-wrap gap-4">
                    {providers.map((provider) => (
                        <div
                            key={provider.provider_id}
                            className="flex flex-col items-center gap-2 group cursor-pointer"
                            title={provider.provider_name}
                        >
                            <div className="relative">
                                <SafeImage
                                    src={`${TMDB_LOGO_BASE}${provider.logo_path}`}
                                    alt={provider.provider_name}
                                    width={64}
                                    height={64}
                                    className="rounded-lg object-cover shadow-lg group-hover:scale-110 transition-transform"
                                />
                            </div>
                            <span className="text-xs text-gray-400 text-center max-w-[80px] truncate">
                                {provider.provider_name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Region Selector */}
            <div>
                <label className="block text-sm font-bold text-gray-400 uppercase mb-3">
                    Select Region
                </label>
                <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full md:w-auto bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-600 focus:outline-none cursor-pointer"
                >
                    {regionsWithData.map((region) => (
                        <option key={region.code} value={region.code}>
                            {region.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Providers Display */}
            <div className="bg-gray-900/50 rounded-lg p-6 space-y-6">
                {renderProviders(regionalData.flatrate, 'flatrate')}
                {renderProviders(regionalData.rent, 'rent')}
                {renderProviders(regionalData.buy, 'buy')}

                {!regionalData.flatrate && !regionalData.rent && !regionalData.buy && (
                    <p className="text-center text-gray-500 py-4">
                        No streaming options available for this region
                    </p>
                )}

                {/* JustWatch Attribution */}
                {regionalData.link && (
                    <div className="pt-4 border-t border-gray-800">
                        <a
                            href={regionalData.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-gray-400 transition flex items-center gap-2"
                        >
                            <span>View more options on JustWatch</span>
                            <span>↗</span>
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WatchProvidersRegional;
