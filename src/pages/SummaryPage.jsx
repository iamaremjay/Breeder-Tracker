import { useState, useEffect } from 'react';
import { getUserBloodlines } from '../services/firestoreService';

function SummaryPage({ userId, onBack, onLogout }) {
    const [summaryData, setSummaryData] = useState({
        totalBloodlines: 0,
        averageWinRate: '0%',
        totalWins: 0,
        totalLosses: 0,
        totalFights: 0,
        topBreeds: [],
        breedCounts: {},
        typeBreakdown: {
            Cross: 0,
            Pure: 0,
            Hybrid: 0
        },
        genderBreakdown: {
            'Brood Stag': 0,
            'Brood Hen': 0
        },
        performanceTiers: {
            elite: 0,
            strong: 0,
            average: 0,
            developing: 0
        }
    });
    const [allBloodlines, setAllBloodlines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (userId) {
            fetchAndCalculateStats();
        }
    }, [userId]);

    const fetchAndCalculateStats = async () => {
        setIsLoading(true);
        setError('');

        try {
            const result = await getUserBloodlines(userId);

            if (result.success) {
                const bloodlines = result.data;
                setAllBloodlines(bloodlines);
                calculateStatistics(bloodlines);
            } else {
                setError(result.error || 'Failed to fetch bloodlines');
            }
        } catch (err) {
            console.error('Error fetching bloodlines:', err);
            setError('An error occurred while fetching data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportAllBloodlines = () => {
        if (allBloodlines.length === 0) {
            alert('No bloodlines to export');
            return;
        }

        const headers = ['Wingband Number', 'Category', 'Breed', 'Sire', 'Dam', 'Type/Cross', 'Hatch Date', 'Origin', 'Color', 'Comb Type', 'Wins/Losses/Win Rate', 'Fighting Style', 'Sire/Dam Wingbands', 'Description', 'Pen No.', 'Markings', 'Batch No.', 'Batch Count', 'Casualty'];

        const rows = allBloodlines.map(row => [
            row.wingbandNumber,
            row.categoryName,
            row.breed,
            row.sire,
            row.dam,
            row.typeOrCross,
            row.hatchDate,
            row.origin,
            row.color,
            row.combType,
            row.winsLossesWinRate,
            row.fightingStyle,
            row.sireDamWingbands,
            row.description,
            row.penNo,
            row.markings,
            row.batchNo,
            row.batchCount,
            row.casualty
        ].map(v => `"${v || ''}"`).join(','));

        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...rows
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `all_bloodlines_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const calculateStatistics = (bloodlines) => {
        if (!bloodlines || bloodlines.length === 0) {
            setSummaryData({
                totalBloodlines: 0,
                averageWinRate: '0%',
                totalWins: 0,
                totalLosses: 0,
                totalFights: 0,
                topBreeds: [],
                breedCounts: {},
                typeBreakdown: { Cross: 0, Pure: 0, Hybrid: 0 },
                genderBreakdown: { 'Brood Stag': 0, 'Brood Hen': 0 },
                performanceTiers: { elite: 0, strong: 0, average: 0, developing: 0 }
            });
            return;
        }

        let totalWins = 0;
        let totalLosses = 0;
        let totalFights = 0;
        const breedCounts = {};
        const typeBreakdown = { Cross: 0, Pure: 0, Hybrid: 0 };
        const genderBreakdown = { 'Brood Stag': 0, 'Brood Hen': 0 };
        const performanceTiers = { elite: 0, strong: 0, average: 0, developing: 0 };

        bloodlines.forEach(bloodline => {
            if (bloodline.winsLossesWinRate) {
                const parts = bloodline.winsLossesWinRate.split('/').map(p => p.trim());
                const wins = parseInt(parts[0]) || 0;
                const losses = parseInt(parts[1]) || 0;
                const rate = parseInt(parts[2]) || 0;

                totalWins += wins;
                totalLosses += losses;
                totalFights += wins + losses;

                if (rate >= 70) performanceTiers.elite++;
                else if (rate >= 50) performanceTiers.strong++;
                else if (rate >= 30) performanceTiers.average++;
                else performanceTiers.developing++;
            }

            if (bloodline.breed) {
                breedCounts[bloodline.breed] = (breedCounts[bloodline.breed] || 0) + 1;
            }

            if (bloodline.typeOrCross && typeBreakdown.hasOwnProperty(bloodline.typeOrCross)) {
                typeBreakdown[bloodline.typeOrCross]++;
            }

            if (bloodline.categoryName && genderBreakdown.hasOwnProperty(bloodline.categoryName)) {
                genderBreakdown[bloodline.categoryName]++;
            }
        });

        const averageWinRate = totalFights > 0
            ? Math.round((totalWins / totalFights) * 100)
            : 0;

        const topBreeds = Object.entries(breedCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([breed, count]) => ({ breed, count }));

        setSummaryData({
            totalBloodlines: bloodlines.length,
            averageWinRate: `${averageWinRate}%`,
            totalWins,
            totalLosses,
            totalFights,
            topBreeds,
            breedCounts,
            typeBreakdown,
            genderBreakdown,
            performanceTiers
        });
    };

    const StatCard = ({ icon, title, value, subtitle, gradient }) => (
        <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 sm:w-24 sm:h-24 opacity-10">
                {icon}
            </div>
            <div className="relative">
                <p className="text-white/80 text-xs sm:text-sm font-semibold mb-1 uppercase tracking-wide">{title}</p>
                <p className="text-white text-3xl sm:text-4xl lg:text-5xl font-bold mb-1">
                    {value}
                </p>
                {subtitle && <p className="text-white/70 text-xs sm:text-sm">{subtitle}</p>}
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-violet-600 border-t-transparent"></div>
                    <p className="text-slate-600 mt-4 font-semibold text-sm sm:text-base">Loading summary...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col gap-3 sm:gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-1 sm:mb-2">Summary Overview</h1>
                            <p className="text-slate-600 text-xs sm:text-sm lg:text-base">Quick overview of your bloodline collection</p>
                        </div>
                        <button onClick={onLogout} className="px-4 sm:px-8 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-md text-xs sm:text-base whitespace-nowrap">
                            Logout
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        <button onClick={onBack} className="flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg sm:rounded-xl border-2 border-slate-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm text-xs sm:text-sm">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to History
                        </button>
                        <button onClick={handleExportAllBloodlines} className="flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-sm text-xs sm:text-sm">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export All Data
                        </button>
                    </div>
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

                {/* Main Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
                    <StatCard
                        icon={<svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>}
                        title="Total Bloodlines"
                        value={summaryData.totalBloodlines}
                        gradient="from-blue-500 to-blue-600"
                    />
                    <StatCard
                        icon={<svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                        title="Wins"
                        value={summaryData.totalWins}
                        subtitle={`${summaryData.totalFights} total fights`}
                        gradient="from-emerald-500 to-emerald-600"
                    />
                    <StatCard
                        icon={<svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>}
                        title="Losses"
                        value={summaryData.totalLosses}
                        subtitle={`${summaryData.totalFights} total fights`}
                        gradient="from-red-500 to-red-600"
                    />
                    <StatCard
                        icon={<svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>}
                        title="Win Rate"
                        value={summaryData.averageWinRate}
                        subtitle="Average across all"
                        gradient="from-violet-500 to-purple-600"
                    />
                </div>

                {/* Performance Breakdown */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Performance Breakdown</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg sm:rounded-xl p-4 border-2 border-emerald-200">
                            <div className="text-3xl sm:text-4xl mb-2">🏆</div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1">Elite (70%+)</p>
                            <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{summaryData.performanceTiers.elite}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-4 border-2 border-blue-200">
                            <div className="text-3xl sm:text-4xl mb-2">⭐</div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1">Strong (50-69%)</p>
                            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{summaryData.performanceTiers.strong}</p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl p-4 border-2 border-yellow-200">
                            <div className="text-3xl sm:text-4xl mb-2">📊</div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1">Average (30-49%)</p>
                            <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{summaryData.performanceTiers.average}</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg sm:rounded-xl p-4 border-2 border-red-200">
                            <div className="text-3xl sm:text-4xl mb-2">📈</div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1">Developing (&lt;30%)</p>
                            <p className="text-2xl sm:text-3xl font-bold text-red-600">{summaryData.performanceTiers.developing}</p>
                        </div>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                    {/* Types */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">By Type</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg">
                                <span className="font-semibold text-slate-700">Cross</span>
                                <span className="text-2xl font-bold text-violet-600">{summaryData.typeBreakdown.Cross}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <span className="font-semibold text-slate-700">Pure</span>
                                <span className="text-2xl font-bold text-blue-600">{summaryData.typeBreakdown.Pure}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                <span className="font-semibold text-slate-700">Hybrid</span>
                                <span className="text-2xl font-bold text-purple-600">{summaryData.typeBreakdown.Hybrid}</span>
                            </div>
                        </div>
                    </div>

                    {/* Gender */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">By Gender</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">♂</span>
                                    <span className="font-semibold text-slate-700">Brood Stag</span>
                                </div>
                                <span className="text-2xl font-bold text-blue-600">{summaryData.genderBreakdown['Brood Stag']}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">♀</span>
                                    <span className="font-semibold text-slate-700">Brood Hen</span>
                                </div>
                                <span className="text-2xl font-bold text-pink-600">{summaryData.genderBreakdown['Brood Hen']}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Breeds */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Top 5 Breeds</h2>
                    {summaryData.topBreeds.length > 0 ? (
                        <div className="space-y-3">
                            {summaryData.topBreeds.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-violet-50 hover:to-purple-50 rounded-lg sm:rounded-xl transition-all">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold rounded-lg shadow-sm text-sm sm:text-base">
                                            {index + 1}
                                        </div>
                                        <span className="text-base sm:text-lg font-semibold text-slate-900">{item.breed}</span>
                                    </div>
                                    <span className="text-xl sm:text-2xl font-bold text-violet-600">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <p className="text-sm">No breed data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SummaryPage;