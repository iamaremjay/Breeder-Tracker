import { useState, useEffect } from 'react';
import { getBloodline, deleteBloodline, getUserBloodlines } from '../services/firestoreService';

function BloodlineDetailsPage({ bloodline, userId, onBack, onEdit, onLogout }) {
    const [bloodlineDetails, setBloodlineDetails] = useState(null);
    const [relatedBloodlines, setRelatedBloodlines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        const fetchBloodlineData = async () => {
            if (bloodline && bloodline.wingbandNumber) {
                setBloodlineDetails(bloodline);
                setIsLoading(false);
                return;
            }

            if (userId && bloodline?.wingbandNumber) {
                setIsLoading(true);
                setError('');
                try {
                    const result = await getBloodline(userId, bloodline.wingbandNumber);
                    if (result.success) {
                        setBloodlineDetails(result.data);
                    } else {
                        setError(result.error || 'Failed to fetch bloodline details');
                    }
                } catch (err) {
                    console.error('Error fetching bloodline:', err);
                    setError('An error occurred while fetching bloodline details');
                } finally {
                    setIsLoading(false);
                }
            } else {
                setError('Invalid bloodline or user data');
                setIsLoading(false);
            }
        };

        fetchBloodlineData();
    }, [bloodline, userId]);

    useEffect(() => {
        const fetchRelatedBloodlines = async () => {
            if (!bloodlineDetails || !userId) return;

            try {
                const result = await getUserBloodlines(userId);
                if (result.success) {
                    const related = result.data.filter(b =>
                        b.wingbandNumber !== bloodlineDetails.wingbandNumber &&
                        (b.sire === bloodlineDetails.sire ||
                            b.dam === bloodlineDetails.dam ||
                            b.wingbandNumber === bloodlineDetails.sireDamWingbands?.split('/')[0]?.trim() ||
                            b.wingbandNumber === bloodlineDetails.sireDamWingbands?.split('/')[1]?.trim())
                    );
                    setRelatedBloodlines(related);
                }
            } catch (err) {
                console.error('Error fetching related bloodlines:', err);
            }
        };

        fetchRelatedBloodlines();
    }, [bloodlineDetails, userId]);

    const handleBack = () => {
        if (onBack) onBack();
    };

    const handleEdit = () => {
        if (onEdit && bloodlineDetails) onEdit(bloodlineDetails);
    };

    const handleDelete = async () => {
        if (!bloodlineDetails || !userId) return;

        try {
            const result = await deleteBloodline(userId, bloodlineDetails.wingbandNumber);
            if (result.success) {
                alert('Bloodline deleted successfully');
                handleBack();
            } else {
                alert('Failed to delete bloodline: ' + result.error);
            }
        } catch (err) {
            console.error('Error deleting bloodline:', err);
            alert('An error occurred while deleting');
        }
        setShowDeleteConfirm(false);
    };

    const handleLogout = () => {
        if (onLogout) onLogout();
    };

    const parseWinRate = (winsLossesWinRate) => {
        if (!winsLossesWinRate) return { wins: 0, losses: 0, rate: 0 };
        const parts = winsLossesWinRate.split('/').map(p => p.trim());
        return {
            wins: parseInt(parts[0]) || 0,
            losses: parseInt(parts[1]) || 0,
            rate: parseInt(parts[2]) || 0
        };
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Cross': return 'bg-violet-100 text-violet-700';
            case 'Pure': return 'bg-blue-100 text-blue-700';
            case 'Hybrid': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const InfoRow = ({ label, value }) => (
        <div className="flex justify-between py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-600">{label}</span>
            <span className="text-sm font-semibold text-slate-900">{value || 'N/A'}</span>
        </div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-violet-600 border-t-transparent"></div>
                    <p className="text-slate-600 mt-4 font-semibold text-sm sm:text-base">Loading bloodline details...</p>
                </div>
            </div>
        );
    }

    if (error || !bloodlineDetails) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 text-xs sm:text-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error || 'Bloodline not found'}</span>
                    </div>
                    <button onClick={handleBack} className="flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg sm:rounded-xl border-2 border-slate-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm text-sm sm:text-base">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to History
                    </button>
                </div>
            </div>
        );
    }

    const stats = parseWinRate(bloodlineDetails.winsLossesWinRate);
    const totalFights = stats.wins + stats.losses;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2.5 sm:px-6 sm:py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg sm:rounded-xl border-2 border-slate-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm text-xs sm:text-base">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="hidden xs:inline">Back to History</span>
                        <span className="xs:hidden">Back</span>
                    </button>

                    <button onClick={handleLogout} className="px-4 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-md text-xs sm:text-sm whitespace-nowrap">
                        Logout
                    </button>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4 sm:mb-6">
                    {/* Header Section with Image */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        {/* Image */}
                        <div className="relative h-64 sm:h-80 md:h-full bg-gradient-to-br from-violet-500 to-purple-600">
                            <img
                                src={bloodlineDetails.image || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80'}
                                alt={bloodlineDetails.wingbandNumber}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80'; }}
                            />
                        </div>

                        {/* Title and Badges */}
                        <div className="p-4 sm:p-6 lg:p-8">
                            <div className="mb-4">
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Leg Band / Wing Band</p>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3">{bloodlineDetails.wingbandNumber}</h1>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {bloodlineDetails.typeOrCross && (
                                        <span className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold ${getTypeColor(bloodlineDetails.typeOrCross)}`}>
                                            {bloodlineDetails.typeOrCross}
                                        </span>
                                    )}
                                    {bloodlineDetails.breed && (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs sm:text-sm font-semibold">
                                            {bloodlineDetails.breed}
                                        </span>
                                    )}
                                    {bloodlineDetails.categoryName && (
                                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold">
                                            {bloodlineDetails.categoryName}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Performance Stats */}
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 border border-emerald-200">
                                    <p className="text-xs font-semibold text-emerald-600 mb-1">Wins</p>
                                    <p className="text-xl sm:text-2xl font-bold text-emerald-700">{stats.wins}</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
                                    <p className="text-xs font-semibold text-red-600 mb-1">Losses</p>
                                    <p className="text-xl sm:text-2xl font-bold text-red-700">{stats.losses}</p>
                                </div>
                                <div className="bg-violet-50 rounded-lg p-3 sm:p-4 border border-violet-200">
                                    <p className="text-xs font-semibold text-violet-600 mb-1">Win Rate</p>
                                    <p className="text-xl sm:text-2xl font-bold text-violet-700">{stats.rate}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Basic Information</h2>
                        <div className="space-y-0">
                            <InfoRow label="Category" value={bloodlineDetails.categoryName} />
                            <InfoRow label="Breed" value={bloodlineDetails.breed} />
                            <InfoRow label="Type / Cross" value={bloodlineDetails.typeOrCross} />
                            <InfoRow label="Hatch Date" value={bloodlineDetails.hatchDate ? new Date(bloodlineDetails.hatchDate).toLocaleDateString() : 'N/A'} />
                            <InfoRow label="Origin / Farm" value={bloodlineDetails.origin} />
                            <InfoRow label="Pen No." value={bloodlineDetails.penNo} />
                            <InfoRow label="Markings" value={bloodlineDetails.markings} />
                            <InfoRow label="Batch No." value={bloodlineDetails.batchNo} />
                            <InfoRow label="Batch Count" value={bloodlineDetails.batchCount} />
                        </div>
                    </div>

                    {/* Lineage Section */}
                    <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Lineage</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Brood Stag (Sire)</p>
                                <p className="text-base sm:text-lg font-bold text-slate-900">{bloodlineDetails.sire || 'Unknown'}</p>
                                {bloodlineDetails.sireDamWingbands?.split('/')[0]?.trim() && (
                                    <p className="text-xs text-slate-600 mt-1">WB: {bloodlineDetails.sireDamWingbands.split('/')[0].trim()}</p>
                                )}
                            </div>

                            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                                <p className="text-xs font-semibold text-pink-600 uppercase mb-2">Brood Hen (Dam)</p>
                                <p className="text-base sm:text-lg font-bold text-slate-900">{bloodlineDetails.dam || 'Unknown'}</p>
                                {bloodlineDetails.sireDamWingbands?.split('/')[1]?.trim() && (
                                    <p className="text-xs text-slate-600 mt-1">WB: {bloodlineDetails.sireDamWingbands.split('/')[1].trim()}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Physical Characteristics */}
                    <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Physical Characteristics</h2>
                        <div className="space-y-0">
                            <InfoRow label="Color" value={bloodlineDetails.color} />
                            <InfoRow label="Comb Type" value={bloodlineDetails.combType} />
                            <InfoRow label="Fighting Style" value={bloodlineDetails.fightingStyle} />
                        </div>
                    </div>

                    {/* Description */}
                    {bloodlineDetails.description && (
                        <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">Description</h2>
                            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{bloodlineDetails.description}</p>
                        </div>
                    )}

                    {/* Casualty */}
                    {bloodlineDetails.casualty && (
                        <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200 bg-red-50">
                            <h2 className="text-lg sm:text-xl font-bold text-red-900 mb-2">Casualty Information</h2>
                            <p className="text-sm sm:text-base text-red-700">{bloodlineDetails.casualty}</p>
                        </div>
                    )}

                    {/* Related Bloodlines */}
                    {relatedBloodlines.length > 0 && (
                        <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Related Bloodlines ({relatedBloodlines.length})</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {relatedBloodlines.map((related, idx) => (
                                    <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-violet-300 hover:bg-slate-100 transition-all">
                                        <p className="font-bold text-violet-600 mb-1 text-sm">{related.wingbandNumber}</p>
                                        <p className="text-xs text-slate-600">{related.breed || 'Unknown'}</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {related.sire === bloodlineDetails.sire && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Same Stag</span>
                                            )}
                                            {related.dam === bloodlineDetails.dam && (
                                                <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-semibold">Same Hen</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                    <button onClick={handleEdit} className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg sm:rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Details
                    </button>

                    <button onClick={() => setShowDeleteConfirm(true)} className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg sm:rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDeleteConfirm(false)}>
                        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="text-center mb-4 sm:mb-6">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Delete Bloodline?</h3>
                                <p className="text-slate-600 text-sm sm:text-base">Are you sure you want to delete <span className="font-bold text-slate-900">{bloodlineDetails.wingbandNumber}</span>? This action cannot be undone.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base">
                                    Cancel
                                </button>
                                <button onClick={handleDelete} className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BloodlineDetailsPage;