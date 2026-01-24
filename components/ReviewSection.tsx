
import React, { useState, useEffect } from 'react';
import type { Review } from '../types';
import type { Session } from '@supabase/supabase-js';
import { fetchReviews, addReview } from '../services/contentService';
import { getUserProfile } from '../services/userService';
import { StarIcon, UserIcon } from './icons';

interface ReviewSectionProps {
  dramaId: string; // Changed to string
  session: Session | null;
  onOpenAuth: () => void;
}

interface EnhancedReview extends Review {
  userDisplayName?: string;
  userAvatar?: string;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ dramaId, session, onOpenAuth }) => {
  const [reviews, setReviews] = useState<EnhancedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const data = await fetchReviews(dramaId);

        const enriched = await Promise.all(data.map(async (r) => {
          const profile = await getUserProfile(r.userId);
          return {
            ...r,
            userDisplayName: profile?.username || r.userEmail.split('@')[0],
            userAvatar: profile?.avatarUrl || undefined
          };
        }));

        setReviews(enriched);
      } catch (error) {
        console.error("Failed to load reviews:", error);
      } finally {
        setLoading(false);
      }
    };
    loadReviews();
  }, [dramaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSubmitting(true);
    try {
      const newReview = await addReview({
        dramaId,
        userId: session.user.id,
        userEmail: session.user.email || 'Anonymous',
        rating,
        comment
      });

      const profile = await getUserProfile(session.user.id);

      const enrichedReview: EnhancedReview = {
        ...newReview,
        userDisplayName: profile?.username || session.user.email?.split('@')[0],
        userAvatar: profile?.avatarUrl || undefined
      };

      setReviews([enrichedReview, ...reviews]);
      setComment('');
      setRating(5);
    } catch (error) {
      console.error("Error posting review:", error);
      alert("Failed to post review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 border-t border-gray-800 pt-8">
      <h3 className="text-2xl font-bold text-white mb-6">Reviews & Ratings</h3>

      <div className="bg-[#141414] p-6 rounded-lg border border-gray-800 mb-8">
        {session ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Your Rating</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <StarIcon filled={star <= rating} />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Your Review</label>
              <textarea
                className="w-full bg-[#0b0b0b] text-white border border-gray-700 rounded p-3 focus:border-red-600 focus:outline-none transition"
                rows={3}
                placeholder="Share your thoughts about this drama..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 transition disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post Review'}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-400 mb-4">Sign in to rate and review this show.</p>
            <button
              onClick={onOpenAuth}
              className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 transition"
            >
              Sign In to Review
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 italic">No reviews yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-[#1a1a1a] p-5 rounded border border-gray-800/50 animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {review.userAvatar ? (
                    <img src={review.userAvatar} alt="User" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="bg-gray-700 p-1 rounded-full">
                      <UserIcon />
                    </div>
                  )}
                  <span className="text-sm font-bold text-red-500">
                    {review.userDisplayName}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex mb-2">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} filled={i < review.rating} />
                ))}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
