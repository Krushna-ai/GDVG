import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const ReviewManagement = ({ darkTheme }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const handleEdit = (review) => {
    setEditingReview(review);
    setIsEditModalOpen(true);
  };

  const handleUpdateReview = async (updatedReview) => {
    try {
      const token = localStorage.getItem('admin_token');
      const updateData = { review_text: updatedReview.review_text };
      await axios.put(`${API}/admin/reviews/${updatedReview.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(reviews.map(r => r.id === updatedReview.id ? updatedReview : r));
      setIsEditModalOpen(false);
      setEditingReview(null);
    } catch (err) {
      console.error('Failed to update review', err);
      setError('Failed to update review.');
    }
  };

  const handleDelete = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        const token = localStorage.getItem('admin_token');
        await axios.delete(`${API}/admin/reviews/${reviewId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReviews(reviews.filter(r => r.id !== reviewId));
        setTotal(total - 1);
      } catch (err) {
        console.error('Failed to delete review', err);
        setError('Failed to delete review.');
      }
    }
  };

  const handleFeature = async (review) => {
    try {
      const token = localStorage.getItem('admin_token');
      const updatedReviewData = { is_featured: !review.is_featured };
      await axios.put(`${API}/admin/reviews/${review.id}`, updatedReviewData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(reviews.map(r => r.id === review.id ? { ...r, is_featured: !r.is_featured } : r));
    } catch (err) {
      console.error('Failed to feature review', err);
      setError('Failed to update review status.');
    }
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('admin_token');
        const params = new URLSearchParams({ page, limit, search });
        const response = await axios.get(`${API}/admin/reviews?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReviews(response.data.reviews);
        setTotal(response.data.total);
        setError(null);
      } catch (err) {
        setError('Failed to fetch reviews.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [page, limit, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    // The useEffect will trigger the fetch
  };

  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${darkTheme ? 'text-white' : 'text-gray-900'}`}>
      <h2 className="text-3xl font-bold mb-6">Review Management</h2>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search reviews by title or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full px-4 py-2 pl-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 ${
              darkTheme
                ? 'bg-gray-900 border-gray-700'
                : 'bg-white border-gray-300'
            }`}
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
      </form>

      {loading ? (
        <div className="text-center">Loading reviews...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${darkTheme ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={`${darkTheme ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Content</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Review</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Rating</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Featured</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkTheme ? 'bg-gray-900 divide-gray-800' : 'bg-white divide-gray-200'}`}>
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{review.user?.username || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{review.content?.title || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm max-w-sm truncate">{review.review_text}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">{review.rating.toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        review.is_featured
                          ? 'bg-green-100 text-green-800'
                          : darkTheme ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'
                      }`}>
                        {review.is_featured ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleFeature(review)} className="text-indigo-600 hover:text-indigo-900">
                        {review.is_featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button onClick={() => handleEdit(review)} className="ml-4 text-yellow-600 hover:text-yellow-900">Edit</button>
                      <button onClick={() => handleDelete(review.id)} className="ml-4 text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <div>
              <p className={`text-sm ${darkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> results
              </p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className={`px-4 py-2 text-sm font-medium rounded-md ${darkTheme ? 'text-white bg-gray-800' : 'text-gray-700 bg-gray-200'} disabled:opacity-50`}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                className={`px-4 py-2 text-sm font-medium rounded-md ${darkTheme ? 'text-white bg-gray-800' : 'text-gray-700 bg-gray-200'} disabled:opacity-50`}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {isEditModalOpen && (
        <EditReviewModal
          review={editingReview}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleUpdateReview}
          darkTheme={darkTheme}
        />
      )}
    </div>
  );
};

const EditReviewModal = ({ review, isOpen, onClose, onSave, darkTheme }) => {
  const [text, setText] = useState(review?.review_text || '');

  useEffect(() => {
    setText(review?.review_text || '');
  }, [review]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ ...review, review_text: text });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`rounded-lg shadow-xl p-6 w-full max-w-lg ${darkTheme ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
        <h3 className="text-xl font-bold mb-4">Edit Review</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows="6"
          className={`w-full p-2 rounded-md border ${darkTheme ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'}`}
        ></textarea>
        <div className="mt-4 flex justify-end space-x-4">
          <button onClick={onClose} className={`px-4 py-2 rounded-md ${darkTheme ? 'bg-gray-700' : 'bg-gray-200'}`}>Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-md bg-red-600 text-white">Save</button>
        </div>
      </div>
    </div>
  );
};

export default ReviewManagement;
