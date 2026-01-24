
import React, { useState } from 'react';
import type { Content, WatchStatus } from '../types';
import { XIcon, CheckIcon } from './icons';

interface TrackModalProps {
    drama: Content;
    isOpen: boolean;
    onClose: () => void;
    currentStatus: WatchStatus | null;
    currentProgress: number;
    currentScore: number;
    onSave: (status: WatchStatus, progress: number, score: number) => void;
    onRemove: () => void;
}

const TrackModal: React.FC<TrackModalProps> = ({
    drama, isOpen, onClose, currentStatus, currentProgress, currentScore, onSave, onRemove
}) => {
    const [status, setStatus] = useState<WatchStatus>(currentStatus || 'Plan to Watch');
    const [progress, setProgress] = useState(currentProgress);
    const [score, setScore] = useState(currentScore);

    if (!isOpen) return null;

    const maxEpisodes = drama.number_of_episodes || 999;
    const displayEpisodes = drama.number_of_episodes || '?';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(status, progress, score);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] w-full max-w-md rounded-lg shadow-2xl border border-gray-700 relative animate-fadeIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <XIcon />
                </button>

                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">Edit List Entry</h2>
                    <p className="text-gray-400 text-sm">{drama.title}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                        <select
                            className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-red-600 outline-none"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as WatchStatus)}
                        >
                            <option value="Plan to Watch">Plan to Watch</option>
                            <option value="Watching">Currently Watching</option>
                            <option value="Completed">Completed</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Dropped">Dropped</option>
                        </select>
                    </div>

                    {/* Progress */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Episodes Watched ({progress}/{displayEpisodes})
                        </label>
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={() => setProgress(Math.max(0, progress - 1))}
                                className="w-10 h-10 bg-gray-800 rounded hover:bg-gray-700 text-white text-xl font-bold"
                            >-</button>
                            <input
                                type="number"
                                className="flex-1 bg-black border border-gray-700 rounded p-2 text-center text-white font-bold"
                                value={progress}
                                onChange={(e) => setProgress(Math.min(maxEpisodes, Math.max(0, parseInt(e.target.value) || 0)))}
                            />
                            <button
                                type="button"
                                onClick={() => setProgress(Math.min(maxEpisodes, progress + 1))}
                                className="w-10 h-10 bg-gray-800 rounded hover:bg-gray-700 text-white text-xl font-bold"
                            >+</button>
                        </div>
                    </div>

                    {/* Score */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Your Score (0-10)</label>
                        <div className="flex justify-between bg-black border border-gray-700 rounded p-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setScore(num)}
                                    className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center transition ${score >= num ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between pt-4">
                        <button
                            type="button"
                            onClick={() => { onRemove(); onClose(); }}
                            className="text-red-500 hover:text-red-400 text-sm font-bold px-4 py-2"
                        >
                            Remove from List
                        </button>
                        <button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold flex items-center"
                        >
                            <CheckIcon /> <span className="ml-2">Save</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TrackModal;
