# GDVG Main App - Frontend Integration Guide

> **For:** AI Agent working on the main GDVG frontend application  
> **From:** Admin Console Agent  
> **Purpose:** Connect frontend to Supabase backend with rich content data

---

## 1. Supabase Connection

### Environment Variables (Already Set)
```env
NEXT_PUBLIC_SUPABASE_URL=https://hwbsjlzdutlmktklmqun.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
```

### Client Setup
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## 2. Database Schema Overview

### `content` Table (Main Content - Movies/TV/Drama)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tmdb_id` | INTEGER | TMDB identifier |
| `title` | TEXT | Display title |
| `original_title` | TEXT | Original language title |
| `content_type` | TEXT | `movie`, `tv`, `drama`, `anime` |
| `status` | TEXT | `draft`, `published`, `archived` |
| `overview` | TEXT | Synopsis/description |
| `tagline` | TEXT | Short tagline |
| `poster_path` | TEXT | TMDB image path (prepend `https://image.tmdb.org/t/p/w500`) |
| `backdrop_path` | TEXT | TMDB backdrop path |
| `release_date` | DATE | For movies |
| `first_air_date` | DATE | For TV shows |
| `vote_average` | DECIMAL | Rating 0-10 |
| `vote_count` | INTEGER | Number of votes |
| `popularity` | DECIMAL | TMDB popularity score |
| `genres` | JSONB | `[{id: 1, name: "Drama"}, ...]` |
| `keywords` | JSONB | `[{id: 1, name: "revenge"}, ...]` |
| `videos` | JSONB | `[{key: "youtubeId", name: "Trailer", type: "Trailer"}, ...]` |
| `watch_providers` | JSONB | TMDB watch provider data by region |
| `content_rating` | TEXT | e.g., "TV-MA", "15+" |
| `number_of_seasons` | INTEGER | For TV |
| `number_of_episodes` | INTEGER | For TV |
| `homepage` | TEXT | Official website |
| `imdb_id` | TEXT | IMDB identifier |
| `original_language` | TEXT | ISO code (en, ko, ja) |
| `origin_country` | JSONB | Array of country codes |

### `person` Table (Actors, Directors, Crew)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tmdb_id` | INTEGER | TMDB identifier |
| `name` | TEXT | Person's name |
| `biography` | TEXT | Bio text |
| `birthday` | DATE | Birth date |
| `profile_path` | TEXT | TMDB profile image path |
| `known_for_department` | TEXT | Acting, Directing, Writing, etc. |
| `imdb_id` | TEXT | IMDB identifier |

### `content_cast` Table (Links content to people)
| Column | Type | Description |
|--------|------|-------------|
| `content_id` | UUID | FK to content |
| `person_id` | UUID | FK to person |
| `character_name` | TEXT | Character played |
| `order_index` | INTEGER | Billing order |
| `role_type` | TEXT | `main`, `support`, `guest` |

### `content_watch_links` Table (Streaming Links with Affiliates)
| Column | Type | Description |
|--------|------|-------------|
| `content_id` | UUID | FK to content |
| `platform_name` | TEXT | Netflix, Viki, etc. |
| `region` | TEXT | IN, US, KR, ALL |
| `link_url` | TEXT | Streaming/affiliate URL |
| `is_affiliate` | BOOLEAN | Is this an affiliate link? |

---

## 3. Common Queries

### Fetch Published Content (Homepage/Listing)
```typescript
const { data: content } = await supabase
  .from('content')
  .select('*')
  .eq('status', 'published')
  .order('popularity', { ascending: false })
  .limit(20);
```

### Fetch Single Content with Full Details
```typescript
const { data: content } = await supabase
  .from('content')
  .select('*')
  .eq('id', contentId)
  .single();
```

### Fetch Cast for Content
```typescript
const { data: cast } = await supabase
  .from('content_cast')
  .select(`
    character_name,
    order_index,
    role_type,
    person:person_id (
      id, name, profile_path, known_for_department
    )
  `)
  .eq('content_id', contentId)
  .order('order_index');
```

### Fetch Watch Links (for "Where to Watch" section)
```typescript
const { data: watchLinks } = await supabase
  .from('content_watch_links')
  .select('*')
  .eq('content_id', contentId)
  .order('priority');
```

### Filter by Genre
```typescript
const { data } = await supabase
  .from('content')
  .select('*')
  .eq('status', 'published')
  .contains('genres', [{ name: 'Drama' }]);
```

### Search Content
```typescript
const { data } = await supabase
  .from('content')
  .select('*')
  .eq('status', 'published')
  .ilike('title', `%${searchQuery}%`);
```

### Korean Dramas Only
```typescript
const { data } = await supabase
  .from('content')
  .select('*')
  .eq('status', 'published')
  .contains('origin_country', ['KR'])
  .eq('content_type', 'tv');
```

---

## 4. Image URL Construction

TMDB images need a base URL prefix:

```typescript
const TMDB_IMAGE_BASE = {
  poster: 'https://image.tmdb.org/t/p/w500',
  backdrop: 'https://image.tmdb.org/t/p/original',
  profile: 'https://image.tmdb.org/t/p/w185',
};

// Usage
const posterUrl = content.poster_path 
  ? `${TMDB_IMAGE_BASE.poster}${content.poster_path}` 
  : '/placeholder-poster.jpg';
```

---

## 5. TypeScript Interfaces

```typescript
interface Content {
  id: string;
  tmdb_id: number;
  title: string;
  original_title?: string;
  content_type: 'movie' | 'tv' | 'drama' | 'anime';
  status: 'draft' | 'published' | 'archived';
  overview?: string;
  tagline?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genres?: Array<{ id: number; name: string }>;
  keywords?: Array<{ id: number; name: string }>;
  videos?: Array<{ key: string; name: string; type: string; site: string }>;
  content_rating?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  homepage?: string;
  imdb_id?: string;
  original_language?: string;
  origin_country?: string[];
}

interface Person {
  id: string;
  tmdb_id: number;
  name: string;
  biography?: string;
  birthday?: string;
  profile_path?: string;
  known_for_department?: string;
  imdb_id?: string;
}

interface CastMember {
  character_name: string;
  order_index: number;
  role_type: 'main' | 'support' | 'guest';
  person: Person;
}

interface WatchLink {
  platform_name: string;
  region: string;
  link_url: string;
  is_affiliate: boolean;
}
```

---

## 6. Feature Implementation Guide

### Content Detail Page
1. Fetch content by ID
2. Display poster, backdrop, title, overview
3. Show genres as tags
4. Display cast (filter by `role_type === 'main'` for lead actors)
5. Show trailers from `videos` array (filter `type === 'Trailer'`)
6. Display "Where to Watch" from `content_watch_links` table

### Homepage Carousels
- **Trending:** Order by `popularity DESC`
- **Top Rated:** Order by `vote_average DESC`
- **Recently Added:** Order by `created_at DESC`
- **By Genre:** Filter using `contains('genres', [...])`

### Person Profile Page
1. Fetch person by ID
2. Get their filmography via `content_cast` join
3. Display biography, birthday, birthplace

---

## 7. Important Notes

1. **RLS Enabled:** All tables have Row Level Security. Public read is allowed.
2. **Status Filter:** Always filter by `status = 'published'` for user-facing content.
3. **Affiliate Links:** Use `content_watch_links` for streaming links (supports affiliate monetization).
4. **Role Types:** Cast members have `role_type` of `main`, `support`, or `guest`.
5. **Videos:** The `videos` JSONB contains YouTube video IDs in the `key` field.

---

## 8. Quick Start Checklist

- [ ] Set up Supabase client with env vars
- [ ] Create TypeScript interfaces (above)
- [ ] Build utility for TMDB image URLs
- [ ] Implement content listing page with genre/status filters
- [ ] Build content detail page with cast, videos, watch links
- [ ] Add person profile pages
- [ ] Implement search functionality

---

*Guide prepared by Admin Console Agent. Last updated: January 24, 2026*
