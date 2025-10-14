import { useState, useEffect } from 'react';
import { getUserBloodlines, deleteBloodline, saveBloodline } from '../services/firestoreService';

function BloodlineHistoryPage({ userId, navigate, onViewDetails, onAddNew, onSummary, onLogout }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState('All');
    const [viewMode, setViewMode] = useState('grid');
    const [bloodlineData, setBloodlineData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [importError, setImportError] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12); // 2 rows of 6 cards for grid, or 12 table rows

    useEffect(() => {
        if (userId) {
            fetchBloodlines();
        }
    }, [userId]);

    useEffect(() => {
        filterAndSortBloodlines();
        setCurrentPage(1); // Reset to page 1 when search changes
    }, [searchQuery, searchField, bloodlineData]);

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();

            if (searchField === 'All') {
                filtered = filtered.filter(item =>
                    item.wingbandNumber?.toLowerCase().includes(query) ||
                    item.breed?.toLowerCase().includes(query) ||
                    item.categoryName?.toLowerCase().includes(query) ||
                    item.sire?.toLowerCase().includes(query) ||
                    item.dam?.toLowerCase().includes(query) ||
                    item.penNo?.toLowerCase().includes(query) ||
                    item.batchNo?.toLowerCase().includes(query) ||
                    item.markings?.toLowerCase().includes(query) ||
                    item.batchCount?.toString().toLowerCase().includes(query)
                );
            } else {
                filtered = filtered.filter(item => {
                    let fieldValue = '';
                    switch (searchField) {
                        case 'Leg Band / Wing Band':
                            fieldValue = item.wingbandNumber || '';
                            break;
                        case 'Brood Hen':
                            fieldValue = item.dam || '';
                            break;
                        case 'Brood Stag':
                            fieldValue = item.sire || '';
                            break;
                        case 'Pen No.':
                            fieldValue = item.penNo || '';
                            break;
                        case 'Markings':
                            fieldValue = item.markings || '';
                            break;
                        case 'Batch No.':
                            fieldValue = item.batchNo || '';
                            break;
                        case 'Batch Count':
                            fieldValue = item.batchCount?.toString() || '';
                            break;
                        default:
                            fieldValue = '';
                    }
                    return fieldValue.toLowerCase().includes(query);
                });
            }
        }

        setFilteredData(filtered);
    };

    const handleExport = () => {
        if (filteredData.length === 0) {
            alert('No data to export');
            return;
        }

        const csvContent = [
            ['Leg Band / Wing Band', 'Brood Hen', 'Brood Stag', 'Pen No.', 'Markings', 'Batch No.', 'Batch Count', 'Casualty'],
            ...filteredData.map(row => [
                row.wingbandNumber || '',
                row.dam || '',
                row.sire || '',
                row.penNo || '',
                row.markings || '',
                row.batchNo || '',
                row.batchCount || '',
                row.casualty || ''
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

    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setImportError('Please select a CSV file');
            return;
        }

        setImportFile(file);
        setImportError('');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n').map(row => {
                    const cells = [];
                    let current = '';
                    let inQuotes = false;

                    for (let i = 0; i < row.length; i++) {
                        const char = row[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            cells.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    cells.push(current.trim());
                    return cells;
                });

                const dataRows = rows.slice(1).filter(row => row.some(cell => cell));

                const preview = dataRows.slice(0, 5).map(row => ({
                    wingbandNumber: row[0] || '',
                    dam: row[1] || '',
                    sire: row[2] || '',
                    penNo: row[3] || '',
                    markings: row[4] || '',
                    batchNo: row[5] || '',
                    batchCount: row[6] || '',
                    casualty: row[7] || ''
                }));

                setImportPreview(preview);
            } catch (err) {
                setImportError('Error reading CSV file');
                console.error('CSV parse error:', err);
            }
        };
        reader.readAsText(file);
    };

    const handleImportConfirm = async () => {
        if (!importFile) return;

        setImportError('Importing... Please wait.');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n').map(row => {
                    const cells = [];
                    let current = '';
                    let inQuotes = false;

                    for (let i = 0; i < row.length; i++) {
                        const char = row[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            cells.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    cells.push(current.trim());
                    return cells;
                });

                const dataRows = rows.slice(1).filter(row => row.some(cell => cell));

                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                for (const row of dataRows) {
                    const bloodlineData = {
                        wingbandNumber: row[0] || '',
                        dam: row[1] || '',
                        sire: row[2] || '',
                        penNo: row[3] || '',
                        markings: row[4] || '',
                        batchNo: row[5] || '',
                        batchCount: row[6] || '',
                        casualty: row[7] || ''
                    };

                    if (!bloodlineData.wingbandNumber) {
                        errorCount++;
                        errors.push('Row skipped: Missing Wing Band Number');
                        continue;
                    }

                    try {
                        const result = await saveBloodline(userId, bloodlineData);
                        if (result.success) {
                            successCount++;
                        } else {
                            errorCount++;
                            errors.push(`${bloodlineData.wingbandNumber}: ${result.error}`);
                        }
                    } catch (err) {
                        errorCount++;
                        errors.push(`${bloodlineData.wingbandNumber}: ${err.message}`);
                        console.error('Error importing bloodline:', err);
                    }
                }

                let message = `Import complete!\n\nSuccessfully imported: ${successCount}\nFailed: ${errorCount}`;
                if (errors.length > 0 && errors.length <= 5) {
                    message += '\n\nErrors:\n' + errors.join('\n');
                } else if (errors.length > 5) {
                    message += '\n\nShowing first 5 errors:\n' + errors.slice(0, 5).join('\n');
                }

                alert(message);
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
                setImportError('');
                fetchBloodlines();
            } catch (err) {
                setImportError('Error processing CSV file: ' + err.message);
                console.error('Import error:', err);
            }
        };
        reader.readAsText(importFile);
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
            case 'Pure': return 'bg-blue-100 text-blue-700';
            case 'Hybrid': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-4 sm:mb-6 lg:mb-8 flex justify-between items-start gap-3 sm:gap-4">
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-1 sm:mb-2">Bloodline History</h1>
                        <p className="text-slate-600 text-xs sm:text-sm lg:text-base">
                            {filteredData.length} {filteredData.length === 1 ? 'bloodline' : 'bloodlines'} found
                            {filteredData.length > 0 && ` • Showing ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredData.length)} of ${filteredData.length}`}
                        </p>
                    </div>
                    <button onClick={onLogout} className="px-4 sm:px-8 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-md text-xs sm:text-base whitespace-nowrap">
                        Logout
                    </button>
                </div>

                {error && (
                    <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <select
                                value={searchField}
                                onChange={(e) => setSearchField(e.target.value)}
                                className="w-full sm:w-56 px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
                            >
                                <option value="All">All Fields</option>
                                <option value="Leg Band / Wing Band">Leg Band / Wing Band</option>
                                <option value="Brood Hen">Brood Hen</option>
                                <option value="Brood Stag">Brood Stag</option>
                                <option value="Pen No.">Pen No.</option>
                                <option value="Markings">Markings</option>
                                <option value="Batch No.">Batch No.</option>
                                <option value="Batch Count">Batch Count</option>
                            </select>

                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder={searchField === 'All' ? "Search across all fields..." : `Search by ${searchField}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 sm:pl-12 sm:pr-4 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center justify-between">
                            <div className="flex bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl overflow-hidden">
                                <button onClick={() => setViewMode('table')} className={`px-4 py-2 sm:px-6 sm:py-2.5 transition-all font-semibold text-xs sm:text-sm ${viewMode === 'table' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    Table View
                                </button>
                                <button onClick={() => setViewMode('grid')} className={`px-4 py-2 sm:px-6 sm:py-2.5 transition-all font-semibold text-xs sm:text-sm ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    Grid View
                                </button>
                            </div>

                            <div className="flex gap-2 sm:gap-3">
                                <button onClick={onSummary} className="flex-1 sm:flex-none px-4 py-2 sm:px-6 sm:py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <span>Summary</span>
                                </button>

                                <button onClick={handleExport} disabled={filteredData.length === 0} className="flex-1 sm:flex-none px-4 py-2 sm:px-6 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Export CSV</span>
                                </button>

                                <button onClick={() => setShowImportModal(true)} className="flex-1 sm:flex-none px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span>Import CSV</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-violet-600 border-t-transparent"></div>
                        <p className="text-slate-600 mt-4 font-semibold text-sm sm:text-base">Loading bloodlines...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center mb-4 sm:mb-6">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Bloodlines Found</h3>
                        <p className="text-slate-600 mb-4 sm:mb-6 text-xs sm:text-sm">
                            {searchQuery
                                ? 'Try adjusting your search criteria'
                                : 'Get started by adding your first bloodline'}
                        </p>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4 sm:mb-6">
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ minWidth: '1000px' }}>
                                <thead>
                                    <tr className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200">
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Leg Band / Wing Band</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Brood Hen</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Brood Stag</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Pen No.</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Markings</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Batch No.</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Batch Count</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Casualty</th>
                                        <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentItems.map((row, index) => (
                                        <tr key={row.id || index} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                                                <span className="font-semibold text-slate-900 text-xs sm:text-sm">{row.wingbandNumber}</span>
                                            </td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.dam || '-'}</td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.sire || '-'}</td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.penNo || '-'}</td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.markings || '-'}</td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.batchNo || '-'}</td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.batchCount || '-'}</td>
                                            <td className="px-3 py-3 sm:px-6 sm:py-4 text-slate-700 text-xs sm:text-sm">{row.casualty || '-'}</td>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        {currentItems.map((item, index) => (
                            <div key={item.id || index} className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all transform hover:scale-105">
                                <div className="relative h-32 sm:h-40 bg-gradient-to-br from-violet-500 to-purple-600 overflow-hidden">
                                    <img src={item.image || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80'} alt={item.wingbandNumber} className="w-full h-full object-cover opacity-80" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80'; }} />
                                    {item.typeOrCross && (
                                        <div className="absolute top-2 right-2">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.typeOrCross)}`}>
                                                {item.typeOrCross}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 sm:p-4">
                                    <div className="mb-2">
                                        <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Leg Band / Wing Band</p>
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{item.wingbandNumber}</h3>
                                    </div>
                                    <div className="mb-3">
                                        <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Breed</p>
                                        <p className="text-violet-600 font-semibold text-xs sm:text-sm truncate">{item.breed || 'Unknown Breed'}</p>
                                    </div>
                                    <div className="space-y-1 mb-3 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-900">Pen:</span>
                                            <span className="font-medium text-slate-900">{item.penNo || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-900">Batch:</span>
                                            <span className="font-medium text-slate-900">{item.batchNo || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-900">Count:</span>
                                            <span className="font-medium text-slate-900">{item.batchCount || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-900">Markings:</span>
                                            <span className="font-medium text-slate-900">{item.markings || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleView(item)} className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-all text-xs">
                                            View
                                        </button>
                                        <button onClick={() => setDeleteConfirm(item)} className="px-2 py-1.5 sm:px-3 sm:py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* PAGINATION CONTROLS */}
                {filteredData.length > 0 && totalPages > 1 && (
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Page Info */}
                            <div className="text-sm text-slate-600">
                                Showing <span className="font-semibold text-slate-900">{indexOfFirstItem + 1}</span> to{' '}
                                <span className="font-semibold text-slate-900">{Math.min(indexOfLastItem, filteredData.length)}</span> of{' '}
                                <span className="font-semibold text-slate-900">{filteredData.length}</span> results
                            </div>

                            {/* Pagination Buttons */}
                            <div className="flex items-center gap-2">
                                {/* Previous Button */}
                                <button
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 sm:px-4 sm:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                {/* Page Numbers */}
                                <div className="flex items-center gap-1 sm:gap-2">
                                    {getPageNumbers().map((page, index) => (
                                        page === '...' ? (
                                            <span key={`ellipsis-${index}`} className="px-3 py-2 text-slate-400 text-sm">...</span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => paginate(page)}
                                                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium transition-all text-sm ${
                                                    currentPage === page
                                                        ? 'bg-violet-600 text-white shadow-md'
                                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}
                                </div>

                                {/* Next Button */}
                                <button
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 sm:px-4 sm:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-center">
                    <button onClick={onAddNew} className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-lg sm:rounded-xl shadow-lg hover:shadow-violet-500/50 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add New Bloodline</span>
                    </button>
                </div>

                {/* DELETE CONFIRMATION MODAL */}
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

                {/* IMPORT MODAL - (keeping your original import modal code here) */}
                {showImportModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); setImportError(''); }}>
                        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-bold text-slate-900">Import Bloodlines from CSV</h3>
                                    <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); setImportError(''); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-slate-600 text-sm mb-4">
                                    Upload a CSV file with the following columns in order:
                                </p>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                                    <code className="text-xs text-slate-700 break-all">
                                        Leg Band/Wing Band, Brood Hen, Brood Stag, Pen No., Markings, Batch No., Batch Count, Casualty
                                    </code>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block w-full">
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleImportFile}
                                            className="hidden"
                                        />
                                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-slate-700 font-semibold mb-1">Click to select CSV file</p>
                                        <p className="text-slate-500 text-sm">or drag and drop</p>
                                        {importFile && (
                                            <p className="text-blue-600 font-semibold mt-3">Selected: {importFile.name}</p>
                                        )}
                                    </div>
                                </label>
                            </div>

                            {importError && (
                                <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                                    {importError}
                                </div>
                            )}

                            {importPreview.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-lg font-bold text-slate-900 mb-3">Preview (First 5 rows)</h4>
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-900">Wing Band</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-900">Brood Hen</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-900">Brood Stag</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-900">Pen No.</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-900">Markings</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-900">Batch No.</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-900">Count</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-900">Casualty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {importPreview.map((row, index) => (
                                                    <tr key={index} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2 text-slate-900 font-medium">{row.wingbandNumber || '-'}</td>
                                                        <td className="px-3 py-2 text-slate-700">{row.dam || '-'}</td>
                                                        <td className="px-3 py-2 text-slate-700">{row.sire || '-'}</td>
                                                        <td className="px-3 py-2 text-slate-700">{row.penNo || '-'}</td>
                                                        <td className="px-3 py-2 text-slate-700">{row.markings || '-'}</td>
                                                        <td className="px-3 py-2 text-slate-700">{row.batchNo || '-'}</td>
                                                        <td className="px-3 py-2 text-slate-700">{row.batchCount || '-'}</td>
                                                        <td className="px-3 py-2 text-slate-700">{row.casualty || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); setImportError(''); }}
                                    className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImportConfirm}
                                    disabled={!importFile || importPreview.length === 0}
                                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Import All Data
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