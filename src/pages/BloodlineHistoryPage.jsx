import { useState, useEffect } from 'react';
import { getUserBloodlines, deleteBloodline } from '../services/firestoreService';

function BloodlineHistoryPage({ userId, navigate, onViewDetails, onAddNew, onSummary, onLogout }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('table'); // table or grid
    const [bloodlineData, setBloodlineData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        if (userId) {
            fetchBloodlines();
        }
    }, [userId]);

    useEffect(() => {
        filterAndSortBloodlines();
    }, [searchQuery, filterType, sortBy, bloodlineData]);

    const fetchBloodlines = async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await getUserBloodlines(userId);
            if (result.success) {
                setBloodlineData(result.data);
            } else {
                setError(result.error || 'Failed to fetch bloodlines');
            }
        } catch (err) {
            console.error('Error fetching bloodlines:', err);
            setError('An error occurred while fetching bloodlines');
        } finally {
            setIsLoading(false);
        }
    };

    const filterAndSortBloodlines = () => {
        let filtered = [...bloodlineData];

        // Filter by search query
        if (searchQuery.trim()) {
            filtered = filtered.filter(item =>
                item.wingbandNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.breed?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.sire?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.dam?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by type
        if (filterType !== 'All') {
            filtered = filtered.filter(item => item.typeOrCross === filterType);
        }

        // Sort
        switch (sortBy) {
            case 'newest':
                filtered.reverse();
                break;
            case 'oldest':
                break;
            case 'wingband':
                filtered.sort((a, b) => (a.wingbandNumber || '').localeCompare(b.wingbandNumber || ''));
                break;
            case 'winrate':
                filtered.sort((a, b) => {
                    const rateA = parseInt(a.winsLossesWinRate?.split('/')[2]) || 0;
                    const rateB = parseInt(b.winsLossesWinRate?.split('/')[2]) || 0;
                    return rateB - rateA;
                });
                break;
            case 'breed':
                filtered.sort((a, b) => (a.breed || '').localeCompare(b.breed || ''));
                break;
        }

        setFilteredData(filtered);
    };

    const handleExport = () => {
        if (filteredData.length === 0) {
            alert('No data to export');
            return;
        }

        const csvContent = [
            ['Wingband Number', 'Category', 'Breed', 'Sire', 'Dam', 'Type/Cross', 'Origin/Farm', 'Win Rate', 'Color', 'Comb Type'],
            ...filteredData.map(row => [
                row.wingbandNumber || '',
                row.categoryName || '',
                row.breed || '',
                row.sire || '',
                row.dam || '',
                row.typeOrCross || '',
                row.origin || '',
                row.winsLossesWinRate || '',
                row.color || '',
                row.combType || ''
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `bloodline_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleView = (bloodline) => {
        if (onViewDetails) onViewDetails(bloodline);
    };

    const handleDelete = async (wingbandNumber) => {
        try {
            const result = await deleteBloodline(userId, wingbandNumber);
            if (result.success) {
                setBloodlineData(prev => prev.filter(b => b.wingbandNumber !== wingbandNumber));
                alert('Bloodline deleted successfully');
            } else {
                alert('Failed to delete bloodline: ' + result.error);
            }
        } catch (err) {
            console.error('Error deleting bloodline:', err);
            alert('An error occurred while deleting');
        }
        setDeleteConfirm(null);
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Cross': return 'bg-violet-100 text-violet-700';
            case 'Purebred': return 'bg-blue-100 text-blue-700';
            case 'Hybrid': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getWinRateColor = (rate) => {
        const numRate = parseInt(rate);
        if (numRate >= 70) return 'text-emerald-600';
        if (numRate >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-1 sm:mb-2">Bloodline History</h1>
                        <p className="text-slate-600 text-xs sm:text-sm lg:text-base">
                            {filteredData.length} {filteredData.length === 1 ? 'bloodline' : 'bloodlines'} found
                        </p>
                    </div>
                    <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg sm:rounded-xl border border-red-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm text-sm sm:text-base">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="hidden xs:inline">Logout</span>
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Search and Filter Bar */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input type="text" placeholder="Search by wingband, breed, category, sire, or dam..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2.5 sm:pl-12 sm:pr-4 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
                        </div>

                        {/* Filters & Actions */}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center justify-between">
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="flex-1 min-w-[120px] px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer">
                                    <option value="All">All Types</option>
                                    <option value="Cross">Cross</option>
                                    <option value="Purebred">Purebred</option>
                                    <option value="Hybrid">Hybrid</option>
                                </select>

                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-1 min-w-[140px] px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer">
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="wingband">By Wingband</option>
                                    <option value="winrate">By Win Rate</option>
                                    <option value="breed">By Breed</option>
                                </select>

                                <div className="flex bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl overflow-hidden">
                                    <button onClick={() => setViewMode('table')} className={`px-3 py-2 sm:px-4 sm:py-2.5 transition-all ${viewMode === 'table' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => setViewMode('grid')} className={`px-3 py-2 sm:px-4 sm:py-2.5 transition-all ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 sm:gap-3">
                                <button onClick={onSummary} className="flex-1 sm:flex-none px-4 py-2 sm:px-6 sm:py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <span className="hidden xs:inline">Summary</span>
                                </button>

                                <button onClick={handleExport} disabled={filteredData.length === 0} className="flex-1 sm:flex-none px-4 py-2 sm:px-6 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="hidden xs:inline">Export</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-violet-600 border-t-transparent"></div>
                        <p className="text-slate-600 mt-4 font-semibold text-sm sm:text-base">Loading bloodlines...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    /* Empty State */
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center mb-4 sm:mb-6">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Bloodlines Found</h3>
                        <p className="text-slate-600 mb-4 sm:mb-6 text-xs sm:text-sm">
                            {searchQuery || filterType !== 'All'
                                ? 'Try adjusting your search or filter criteria'
                                : 'Get started by adding your first bloodline'}
                        </p>
                    </div>
                ) : viewMode === 'table' ? (
                    /* Table View */
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4 sm:mb-6">
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200">
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Wingband</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Breed</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Sire</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Dam</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Win Rate</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredData.map((row, index) => (
                                        <tr key={row.id || index} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                                                <span className="font-semibold text-slate-900 text-xs sm:text-sm">{row.wingbandNumber}</span>
                                            </td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.categoryName || '-'}</td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4">
                                                <span className="font-medium text-violet-700 text-xs sm:text-sm">{row.breed || '-'}</span>
                                            </td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.sire || '-'}</td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.dam || '-'}</td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(row.typeOrCross)}`}>
                                                    {row.typeOrCross || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4">
                                                <span className={`font-semibold text-xs sm:text-sm ${getWinRateColor(row.winsLossesWinRate?.split('/')[2])}`}>
                                                    {row.winsLossesWinRate || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4">
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <button onClick={() => handleView(row)} className="p-1.5 sm:p-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-all transform hover:scale-110" title="View Details">
                                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(row)} className="p-1.5 sm:p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all transform hover:scale-110" title="Delete">
                                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
                        {filteredData.map((item, index) => (
                            <div key={item.id || index} className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all transform hover:scale-105">
                                <div className="relative h-40 sm:h-48 bg-gradient-to-br from-violet-500 to-purple-600 overflow-hidden">
                                    <img src={item.image || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80'} alt={item.wingbandNumber} className="w-full h-full object-cover opacity-80" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80'; }} />
                                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.typeOrCross)}`}>
                                            {item.typeOrCross || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">{item.wingbandNumber}</h3>
                                    <p className="text-violet-600 font-semibold mb-2 sm:mb-3 text-sm sm:text-base">{item.breed || 'Unknown Breed'}</p>
                                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                                        <div className="flex justify-between text-xs sm:text-sm">
                                            <span className="text-slate-600">Category:</span>
                                            <span className="font-medium text-slate-900">{item.categoryName || '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs sm:text-sm">
                                            <span className="text-slate-600">Sire:</span>
                                            <span className="font-medium text-slate-900">{item.sire || '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs sm:text-sm">
                                            <span className="text-slate-600">Dam:</span>
                                            <span className="font-medium text-slate-900">{item.dam || '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs sm:text-sm pt-1.5 sm:pt-2 border-t border-slate-200">
                                            <span className="text-slate-600">Win Rate:</span>
                                            <span className={`font-bold ${getWinRateColor(item.winsLossesWinRate?.split('/')[2])}`}>
                                                {item.winsLossesWinRate?.split('/')[2]?.trim() || '0%'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleView(item)} className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-all text-xs sm:text-sm">
                                            View Details
                                        </button>
                                        <button onClick={() => setDeleteConfirm(item)} className="px-3 py-2 sm:px-4 sm:py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-all">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add New Button */}
                <div className="flex justify-center">
                    <button onClick={onAddNew} className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-lg sm:rounded-xl shadow-lg hover:shadow-violet-500/50 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden xs:inline">Add New Bloodline</span>
                        <span className="xs:hidden">Add New</span>
                    </button>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setDeleteConfirm(null)}>
                        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                            <div className="text-center mb-4 sm:mb-6">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Delete Bloodline?</h3>
                                <p className="text-slate-600 text-sm sm:text-base">Are you sure you want to delete <span className="font-bold text-slate-900">{deleteConfirm.wingbandNumber}</span>? This action cannot be undone.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base">
                                    Cancel
                                </button>
                                <button onClick={() => handleDelete(deleteConfirm.wingbandNumber)} className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all text-sm sm:text-base">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes scale-in {
                    from {
                        transform: scale(0.9);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                .animate-scale-in {
                    animation: scale-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}

export default BloodlineHistoryPage;