import { useState, useEffect } from 'react';
import { getBloodline, deleteBloodline, getUserBloodlines } from '../services/firestoreService';

function BloodlineDetailsPage({ bloodline, userId, onBack, onEdit, onLogout }) {
    const [bloodlineDetails, setBloodlineDetails] = useState(null);
    const [relatedBloodlines, setRelatedBloodlines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState('details'); // details, lineage, stats

    // Fetch bloodline data and related bloodlines
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

    // Fetch related bloodlines (same sire or dam)
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

    const handleExport = () => {
        if (!bloodlineDetails) return;

        const headers = ['Wingband Number', 'Category', 'Breed', 'Sire', 'Dam', 'Type/Cross', 'Hatch Date', 'Origin', 'Color', 'Comb Type', 'Wins/Losses/Win Rate', 'Fighting Style', 'Sire/Dam Wingbands', 'Description'];
        const values = [
            bloodlineDetails.wingbandNumber,
            bloodlineDetails.categoryName,
            bloodlineDetails.breed,
            bloodlineDetails.sire,
            bloodlineDetails.dam,
            bloodlineDetails.typeOrCross,
            bloodlineDetails.hatchDate,
            bloodlineDetails.origin,
            bloodlineDetails.color,
            bloodlineDetails.combType,
            bloodlineDetails.winsLossesWinRate,
            bloodlineDetails.fightingStyle,
            bloodlineDetails.sireDamWingbands,
            bloodlineDetails.description
        ];

        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            values.map(v => `"${v || ''}"`).join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `bloodline_${bloodlineDetails.wingbandNumber}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
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

    const DetailItem = ({ icon, label, value }) => (
        <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm sm:text-base font-medium text-slate-900 break-words">{value || 'N/A'}</p>
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
                    <p className="text-slate-600 mt-4 font-semibold">Loading bloodline details...</p>
                </div>
            </div>
        );
    }

    if (error || !bloodlineDetails) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 mb-6">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error || 'Bloodline not found'}</span>
                    </div>
                    <button onClick={handleBack} className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                </div>
            </div>
        );
    }

    const stats = parseWinRate(bloodlineDetails.winsLossesWinRate);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={handleBack} className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl border border-red-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export
                        </button>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    {/* Hero Section */}
                    <div className="relative h-48 sm:h-64 bg-gradient-to-br from-violet-600 to-purple-600 overflow-hidden">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute bottom-6 left-6 right-6">
                            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{bloodlineDetails.wingbandNumber}</h1>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                                    {bloodlineDetails.typeOrCross || 'N/A'}
                                </span>
                                <span className="px-3 py-1 bg-emerald-500/80 backdrop-blur-sm rounded-full text-white text-sm font-bold">
                                    {stats.rate}% Win Rate
                                </span>
                                <span className="px-3 py-1 bg-blue-500/80 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                                    {bloodlineDetails.breed}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="border-b border-slate-200 bg-slate-50">
                        <div className="px-6 flex gap-2 overflow-x-auto">
                            <button onClick={() => setActiveTab('details')} className={`px-6 py-4 font-semibold transition-all border-b-2 ${activeTab === 'details' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
                                Details
                            </button>
                            <button onClick={() => setActiveTab('lineage')} className={`px-6 py-4 font-semibold transition-all border-b-2 ${activeTab === 'lineage' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
                                Lineage
                            </button>
                            <button onClick={() => setActiveTab('stats')} className={`px-6 py-4 font-semibold transition-all border-b-2 ${activeTab === 'stats' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
                                Statistics
                            </button>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
                        {/* Details Tab */}
                        {activeTab === 'details' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    <div className="sticky top-6">
                                        <img src={bloodlineDetails.image || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80'} alt="Rooster" className="w-full aspect-square object-cover rounded-2xl shadow-lg" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80'; }} />
                                    </div>
                                </div>

                                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} label="Wingband Number" value={bloodlineDetails.wingbandNumber} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} label="Category" value={bloodlineDetails.categoryName} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>} label="Breed" value={bloodlineDetails.breed} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} label="Sire (Father's Breed)" value={bloodlineDetails.sire} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} label="Dam (Mother's Breed)" value={bloodlineDetails.dam} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} label="Type / Cross" value={bloodlineDetails.typeOrCross} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} label="Hatch Date" value={bloodlineDetails.hatchDate} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} label="Origin" value={bloodlineDetails.origin} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>} label="Color" value={bloodlineDetails.color} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} label="Comb Type" value={bloodlineDetails.combType} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>} label="Win/Loss/Rate" value={bloodlineDetails.winsLossesWinRate} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Fighting Style" value={bloodlineDetails.fightingStyle} />
                                    <DetailItem icon={<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} label="Sire/Dam Wingbands" value={bloodlineDetails.sireDamWingbands} />
                                </div>

                                {bloodlineDetails.description && (
                                    <div className="lg:col-span-3 mt-4 pt-8 border-t border-slate-200">
                                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Description
                                        </h2>
                                        <p className="text-slate-600 leading-relaxed">{bloodlineDetails.description}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Lineage Tab */}
                        {activeTab === 'lineage' && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-8 border-2 border-violet-200">
                                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                        </svg>
                                        Family Tree
                                    </h3>
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                                            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-blue-200">
                                                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Sire (Father)</p>
                                                <p className="text-lg font-bold text-slate-900">{bloodlineDetails.sire || 'N/A'}</p>
                                                {bloodlineDetails.sireDamWingbands?.split('/')[0]?.trim() && (
                                                    <p className="text-sm text-slate-600 mt-1">WB: {bloodlineDetails.sireDamWingbands.split('/')[0].trim()}</p>
                                                )}
                                            </div>
                                            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-pink-200">
                                                <p className="text-xs font-semibold text-pink-600 uppercase mb-2">Dam (Mother)</p>
                                                <p className="text-lg font-bold text-slate-900">{bloodlineDetails.dam || 'N/A'}</p>
                                                {bloodlineDetails.sireDamWingbands?.split('/')[1]?.trim() && (
                                                    <p className="text-sm text-slate-600 mt-1">WB: {bloodlineDetails.sireDamWingbands.split('/')[1].trim()}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </div>
                                        <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl p-6 shadow-lg border-2 border-violet-400 w-full max-w-md">
                                            <p className="text-xs font-semibold text-violet-200 uppercase mb-2">Current Bloodline</p>
                                            <p className="text-2xl font-bold text-white">{bloodlineDetails.wingbandNumber}</p>
                                            <p className="text-sm text-violet-100 mt-1">{bloodlineDetails.breed}</p>
                                        </div>
                                    </div>
                                </div>

                                {relatedBloodlines.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            Related Bloodlines ({relatedBloodlines.length})
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {relatedBloodlines.map((related, idx) => (
                                                <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all">
                                                    <p className="font-bold text-violet-600 mb-1">{related.wingbandNumber}</p>
                                                    <p className="text-sm text-slate-700 mb-2">{related.breed}</p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        {related.sire === bloodlineDetails.sire && (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Same Sire</span>
                                                        )}
                                                        {related.dam === bloodlineDetails.dam && (
                                                            <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded">Same Dam</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Statistics Tab */}
                        {activeTab === 'stats' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                                        <p className="text-emerald-100 text-sm font-semibold mb-2">Total Wins</p>
                                        <p className="text-5xl font-bold">{stats.wins}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg">
                                        <p className="text-red-100 text-sm font-semibold mb-2">Total Losses</p>
                                        <p className="text-5xl font-bold">{stats.losses}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                                        <p className="text-violet-100 text-sm font-semibold mb-2">Win Rate</p>
                                        <p className="text-5xl font-bold">{stats.rate}%</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-6 border border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Visualization</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700">Wins</span>
                                                <span className="text-sm font-bold text-emerald-600">{stats.wins} / {stats.wins + stats.losses}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                                                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500" style={{ width: `${stats.rate}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700">Losses</span>
                                                <span className="text-sm font-bold text-red-600">{stats.losses} / {stats.wins + stats.losses}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                                                <div className="bg-gradient-to-r from-red-500 to-rose-500 h-full transition-all duration-500" style={{ width: `${100 - stats.rate}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                                        <h4 className="font-bold text-slate-900 mb-3">Performance Rating</h4>
                                        <div className="text-center">
                                            {stats.rate >= 80 && <div className="text-6xl mb-2">🏆</div>}
                                            {stats.rate >= 60 && stats.rate < 80 && <div className="text-6xl mb-2">⭐</div>}
                                            {stats.rate >= 40 && stats.rate < 60 && <div className="text-6xl mb-2">📊</div>}
                                            {stats.rate < 40 && <div className="text-6xl mb-2">📈</div>}
                                            <p className="text-lg font-bold text-slate-700">
                                                {stats.rate >= 80 ? 'Elite Champion' :
                                                    stats.rate >= 60 ? 'Strong Performer' :
                                                        stats.rate >= 40 ? 'Average Fighter' :
                                                            'Developing'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                                        <h4 className="font-bold text-slate-900 mb-3">Fight Summary</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Total Fights:</span>
                                                <span className="font-bold text-slate-900">{stats.wins + stats.losses}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Win Streak Potential:</span>
                                                <span className="font-bold text-violet-600">{Math.floor(stats.rate / 10)}/10</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Experience Level:</span>
                                                <span className="font-bold text-blue-600">
                                                    {stats.wins + stats.losses >= 20 ? 'Veteran' :
                                                        stats.wins + stats.losses >= 10 ? 'Experienced' :
                                                            'Novice'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={handleEdit} className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-violet-500/50 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Details
                    </button>

                    <button onClick={() => setShowDeleteConfirm(true)} className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-red-500/50 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDeleteConfirm(false)}>
                        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Bloodline?</h3>
                                <p className="text-slate-600">Are you sure you want to delete <span className="font-bold text-slate-900">{bloodlineDetails.wingbandNumber}</span>? This action cannot be undone.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleDelete} className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all">
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