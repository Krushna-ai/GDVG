
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon } from './icons';

interface BreadcrumbsProps {
    dramaTitle?: string;
    personName?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ dramaTitle, personName }) => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    if (pathnames.length === 0) return null;

    return (
        <nav className="flex items-center text-sm text-gray-400 mb-4 animate-fadeIn">
            <Link to="/" className="hover:text-white hover:underline transition">Home</Link>

            {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;

                // Pretty names
                let displayName = value;
                if (value === 'title') displayName = 'Drama';
                if (value === 'browse') return null; // Skip "browse" level if generic
                if (value === 'series') displayName = 'Series';
                if (value === 'movies') displayName = 'Movies';
                if (value === 'person') displayName = 'People';

                // Dynamic overrides
                if (isLast && dramaTitle) displayName = dramaTitle;
                if (isLast && personName) displayName = personName;

                return (
                    <React.Fragment key={to}>
                        <span className="mx-2"><ChevronRightIcon className="w-4 h-4" /></span>
                        {isLast ? (
                            <span className="text-white font-bold truncate max-w-[200px]">{decodeURIComponent(displayName)}</span>
                        ) : (
                            <Link to={to} className="hover:text-white hover:underline transition capitalize">
                                {displayName}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default Breadcrumbs;
