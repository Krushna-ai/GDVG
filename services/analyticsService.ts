
import { supabase } from '../lib/supabase';

export interface AnalyticsData {
    totalDramas: number;
    totalMovies: number;
    totalSeries: number;
    totalPeople: number;
    totalReviews: number;
    totalUsers: number;
    recentReviews: any[];
}

export const fetchAnalytics = async (): Promise<AnalyticsData> => {
    // Fetch counts in parallel
    const [
        { count: totalDramas },
        { count: totalMovies },
        { count: totalSeries },
        { count: totalPeople },
        { count: totalReviews },
        { count: totalUsers },
        { data: recentReviews }
    ] = await Promise.all([
        supabase.from('dramas').select('*', { count: 'exact', head: true }),
        supabase.from('dramas').select('*', { count: 'exact', head: true }).eq('category', 'Movie'),
        supabase.from('dramas').select('*', { count: 'exact', head: true }).eq('category', 'Series'),
        supabase.from('people').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*, dramas(title)').order('created_at', { ascending: false }).limit(5)
    ]);

    return {
        totalDramas: totalDramas || 0,
        totalMovies: totalMovies || 0,
        totalSeries: totalSeries || 0,
        totalPeople: totalPeople || 0,
        totalReviews: totalReviews || 0,
        totalUsers: totalUsers || 0,
        recentReviews: recentReviews || []
    };
};
