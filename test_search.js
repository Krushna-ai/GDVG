import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase
        .from('content')
        .select('id, gdvg_id, title, poster_path, backdrop_path, content_type, category, release_date, first_air_date, vote_average, origin_country, genres')
        .eq('status', 'published')
        .ilike('title', `%squid%`)
        .limit(10);

    if (error) {
        console.error("ERROR:", error);
    } else {
        console.log("RESULTS:", data);
    }
}
test();
