/**
 * GDVG Main App - Type Definitions
 * Aligned with TMDB-based Supabase schema
 */

// ============ Content Types ============

export type ContentType = 'movie' | 'tv' | 'drama' | 'anime' | 'variety' | 'documentary';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path?: string | null;
  origin_country?: string;
}

export interface Network {
  id: number;
  name: string;
  logo_path?: string | null;
  origin_country?: string;
}

export interface Video {
  key: string;           // YouTube video ID
  name: string;          // Video title
  type: string;          // 'Trailer', 'Teaser', 'Clip', etc.
  site: string;          // 'YouTube', 'Vimeo'
  official?: boolean;
}

export interface Keyword {
  id: number;
  name: string;
}

export interface Content {
  id: string;
  tmdb_id: number;
  imdb_id?: string | null;
  content_type: ContentType;
  title: string;
  original_title?: string | null;
  overview?: string | null;
  tagline?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;       // Movies
  first_air_date?: string | null;     // TV
  last_air_date?: string | null;      // TV
  status: ContentStatus;
  original_language?: string | null;
  origin_country?: string[];
  genres?: Genre[];
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  runtime?: number | null;            // Movies (minutes)
  number_of_seasons?: number | null;  // TV
  number_of_episodes?: number | null; // TV
  networks?: Network[];
  production_companies?: ProductionCompany[];
  homepage?: string | null;
  budget?: number | null;
  revenue?: number | null;
  in_production?: boolean;
  tmdb_status?: string;               // 'Ended', 'Returning Series', etc.
  videos?: Video[];                   // Trailers and clips
  keywords?: Keyword[];               // Content keywords/tags
  content_rating?: string;            // e.g., 'TV-MA', '15+'
  created_at?: string;
  updated_at?: string;
}

// Backward compatibility alias
export type Drama = Content;

// ============ People Types ============

export interface Person {
  id: string;
  tmdb_id: number;
  imdb_id?: string | null;
  name: string;
  biography?: string | null;
  birthday?: string | null;
  deathday?: string | null;
  gender?: number;                // 0=not set, 1=female, 2=male, 3=non-binary
  known_for_department?: string | null;
  place_of_birth?: string | null;
  profile_path?: string | null;
  popularity?: number;
  also_known_as?: string[];
  homepage?: string | null;
  external_ids?: {                // NEW: Backend enrichment
    imdb_id?: string;
    wikidata_id?: string;
    facebook_id?: string;
    instagram_id?: string;
    twitter_id?: string;
  };
  social_ids?: {                  // NEW: Backend enrichment
    instagram?: string;
    twitter?: string;
    facebook?: string;
    tiktok?: string;
  };
  combined_credits_count?: number; // NEW: Total filmography size for sorting
  created_at?: string;
  updated_at?: string;
}

// ============ Cast & Crew Types ============

export type RoleType = 'main' | 'support' | 'guest';

export interface CastMember {
  id: string;
  content_id: string;
  person_id: string;
  character_name?: string;
  order_index?: number;
  role_type?: RoleType;              // 'main', 'support', 'guest'
  person?: Person;
}

export interface CrewMember {
  id: string;
  content_id: string;
  person_id: string;
  job: string;
  department?: string;
  person?: Person;
}

export interface WatchLink {
  id: string;
  content_id: string;
  platform_name: string;             // 'Netflix', 'Viki', etc.
  region: string;                    // 'IN', 'US', 'KR', 'ALL'
  link_url: string;                  // Streaming URL
  is_affiliate?: boolean;            // Is this an affiliate link?
  logo_url?: string;                 // Platform logo
  priority?: number;                 // Display order
}

// ============ User Types ============

export type WatchStatus = 'Watching' | 'Completed' | 'Plan to Watch' | 'On Hold' | 'Dropped';

export interface UserListEntry {
  id: string;
  dramaId: string;
  userId: string;
  status: WatchStatus;
  progress: number;
  score: number;
}

export interface Review {
  id: string;
  dramaId: string;
  userId: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
  userProfile?: UserProfile;
}

export interface Discussion {
  id: string;
  dramaId: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  userProfile?: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  updatedAt: string;
}

// ============ Country Reference ============

export const COUNTRY_CODES: Record<string, string> = {
  KR: 'South Korea',
  JP: 'Japan',
  CN: 'China',
  TW: 'Taiwan',
  TH: 'Thailand',
  TR: 'Turkey',
  IN: 'India',
  US: 'USA',
  UK: 'United Kingdom',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  movie: 'Movie',
  tv: 'TV Series',
  drama: 'Drama',
  anime: 'Anime',
  variety: 'Variety Show',
  documentary: 'Documentary',
};
