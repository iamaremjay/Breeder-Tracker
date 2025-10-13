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
        breedStats: [],
        typeBreakdown: {
            Cross: 0,
            Purebred: 0,
            Hybrid: 0
        },
        categoryBreakdown: {},
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
    const [activeView, setActiveView] = useState('overview');

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

        const headers = ['Wingband Number', 'Category', 'Breed', 'Sire', 'Dam', 'Type/Cross', 'Hatch Date', 'Origin', 'Color', 'Comb Type', 'Wins/Losses/Win Rate', 'Fighting Style', 'Sire/Dam Wingbands', 'Description'];

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
            row.description
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
                breedStats: [],
                typeBreakdown: { Cross: 0, Purebred: 0, Hybrid: 0 },
                categoryBreakdown: {},
                performanceTiers: { elite: 0, strong: 0, average: 0, developing: 0 }
            });
            return;
        }

        let totalWins = 0;
        let totalLosses = 0;
        let totalFights = 0;
        const breedCounts = {};
        const breedWins = {};
        const breedTotal = {};
        const typeBreakdown = { Cross: 0, Purebred: 0, Hybrid: 0 };
        const categoryBreakdown = {};
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

                if (bloodline.breed) {
                    breedWins[bloodline.breed] = (breedWins[bloodline.breed] || 0) + wins;
                    breedTotal[bloodline.breed] = (breedTotal[bloodline.breed] || 0) + (wins + losses);
                }
            }

            if (bloodline.breed) {
                breedCounts[bloodline.breed] = (breedCounts[bloodline.breed] || 0) + 1;
            }

            if (bloodline.typeOrCross && typeBreakdown.hasOwnProperty(bloodline.typeOrCross)) {
                typeBreakdown[bloodline.typeOrCross]++;
            }

            if (bloodline.categoryName) {
                categoryBreakdown[bloodline.categoryName] = (categoryBreakdown[bloodline.categoryName] || 0) + 1;
            }
        });

        const averageWinRate = totalFights > 0
            ? Math.round((totalWins / totalFights) * 100)
            : 0;

        const topBreeds = Object.entries(breedCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([breed]) => breed);

        const breedStats = Object.entries(breedCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([breed, count]) => ({
                breed: breed.length > 15 ? breed.substring(0, 15) + '...' : breed,
                count,
                winRate: breedTotal[breed] ? Math.round((breedWins[breed] / breedTotal[breed]) * 100) : 0
            }));

        setSummaryData({
            totalBloodlines: bloodlines.length,
            averageWinRate: `${averageWinRate}%`,
            totalWins,
            totalLosses,
            totalFights,
            topBreeds,
            breedStats,
            typeBreakdown,
            categoryBreakdown,
            performanceTiers
        });
    };

    const StatCard = ({ icon, title, value, gradient }) => (
        <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 opacity-10">
                {icon}
            </div>
            <div className="relative">
                <p className="text-white/80 text-sm font-semibold mb-2 uppercase tracking-wide">{title}</p>
                <p className="text-white text-4xl sm:text-5xl font-bold">
                    {value}
                </p>
            </div>
        </div>
    );

    const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];

    const CustomPieChart = ({ data }) => {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = 0;

        return (
            <div className="relative w-64 h-64 mx-auto">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                    {data.map((item, index) => {
                        const angle = (item.value / total) * 360;
                        const startAngle = currentAngle;
                        currentAngle += angle;

                        const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                        const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                        const x2 = 100 + 80 * Math.cos((currentAngle - 90) * Math.PI / 180);
                        const y2 = 100 + 80 * Math.sin((currentAngle - 90) * Math.PI / 180);

                        const largeArc = angle > 180 ? 1 : 0;

                        return (
                            <path
                                key={index}
                                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={COLORS[index % COLORS.length]}
                                stroke="white"
                                strokeWidth="2"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-lg">
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{total}</p>
                            <p className="text-xs text-slate-600">Total</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const CustomBarChart = ({ data, dataKey }) => {
        const maxValue = Math.max(...data.map(item => item[dataKey]));

        return (
            <div className="space-y-3">
                {data.map((item, index) => (
                    <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700">{item.breed}</span>
                            <span className="font-bold text-violet-600">{item[dataKey]}{dataKey === 'winRate' ? '%' : ''}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-violet-500 to-purple-600 h-full transition-all duration-500 rounded-full"
                                style={{ width: `${(item[dataKey] / maxValue) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
                    <p className="text-slate-600 mt-4 font-semibold">Loading summary data...</p>
                </div>
            </div>
        );
    }

    const typeChartData = [
        { name: 'Cross', value: summaryData.typeBreakdown.Cross },
        { name: 'Purebred', value: summaryData.typeBreakdown.Purebred },
        { name: 'Hybrid', value: summaryData.typeBreakdown.Hybrid }
    ].filter(item => item.value > 0);

    const performanceChartData = [
        { name: 'Elite (70%+)', value: summaryData.performanceTiers.elite, fill: '#10b981' },
        { name: 'Strong (50-69%)', value: summaryData.performanceTiers.strong, fill: '#3b82f6' },
        { name: 'Average (30-49%)', value: summaryData.performanceTiers.average, fill: '#f59e0b' },
        { name: 'Developing (<30%)', value: summaryData.performanceTiers.developing, fill: '#ef4444' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-2">Summary Dashboard</h1>
                        <p className="text-slate-600">Complete overview of your bloodline statistics</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExportAllBloodlines} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export All
                        </button>
                        <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                        <button onClick={onLogout} className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl border border-red-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* View Tabs */}
                <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex gap-2">
                    <button onClick={() => setActiveView('overview')} className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${activeView === 'overview' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                        Overview
                    </button>
                    <button onClick={() => setActiveView('breeds')} className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${activeView === 'breeds' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                        Breeds
                    </button>
                    <button onClick={() => setActiveView('performance')} className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${activeView === 'performance' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                        Performance
                    </button>
                </div>

                {/* Overview Tab */}
                {activeView === 'overview' && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard icon={<svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>} title="Total Bloodlines" value={summaryData.totalBloodlines} gradient="from-blue-500 to-blue-600" />
                            <StatCard icon={<svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>} title="Average Win Rate" value={summaryData.averageWinRate} gradient="from-emerald-500 to-emerald-600" />
                            <StatCard icon={<svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} title="Total Fights" value={summaryData.totalFights} gradient="from-violet-500 to-purple-600" />
                            <StatCard icon={<svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>} title="Top Breeds" value={summaryData.topBreeds.length} gradient="from-pink-500 to-rose-600" />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Type Distribution */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Type Distribution</h3>
                                {typeChartData.length > 0 ? (
                                    <div>
                                        <CustomPieChart data={typeChartData} />
                                        <div className="mt-6 space-y-2">
                                            {typeChartData.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                                        <p>No data available</p>
                                    </div>
                                )}
                            </div>

                            {/* Performance Overview */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Performance Overview</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-600 mb-1">Total Wins</p>
                                            <p className="text-3xl font-bold text-emerald-600">{summaryData.totalWins}</p>
                                        </div>
                                        <div className="p-3 bg-emerald-100 rounded-lg">
                                            <svg className="w-8 h-8 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-600 mb-1">Total Losses</p>
                                            <p className="text-3xl font-bold text-red-600">{summaryData.totalLosses}</p>
                                        </div>
                                        <div className="p-3 bg-red-100 rounded-lg">
                                            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Type Breakdown Cards */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                            <h3 className="text-xl font-bold text-slate-900 mb-6">Bloodline Type Breakdown</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border-2 border-violet-200">
                                    <p className="text-sm font-semibold text-slate-600 mb-2">Cross</p>
                                    <p className="text-4xl font-bold text-violet-600">{summaryData.typeBreakdown.Cross}</p>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                                    <p className="text-sm font-semibold text-slate-600 mb-2">Purebred</p>
                                    <p className="text-4xl font-bold text-blue-600">{summaryData.typeBreakdown.Purebred}</p>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                                    <p className="text-sm font-semibold text-slate-600 mb-2">Hybrid</p>
                                    <p className="text-4xl font-bold text-purple-600">{summaryData.typeBreakdown.Hybrid}</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Breeds Tab */}
                {activeView === 'breeds' && (
                    <>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 mb-6">Breed Statistics</h3>
                            {summaryData.breedStats.length > 0 ? (
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-700 mb-4">Count by Breed</h4>
                                        <CustomBarChart data={summaryData.breedStats} dataKey="count" />
                                    </div>
                                    <div className="pt-6 border-t border-slate-200">
                                        <h4 className="text-lg font-semibold text-slate-700 mb-4">Win Rate by Breed</h4>
                                        <CustomBarChart data={summaryData.breedStats} dataKey="winRate" />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[400px] flex items-center justify-center text-slate-400">
                                    <p>No breed data available</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                                Top Performing Breeds
                            </h3>
                            {summaryData.topBreeds.length > 0 ? (
                                <div className="space-y-3">
                                    {summaryData.topBreeds.map((breed, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-violet-50 hover:to-purple-50 rounded-xl transition-all hover:shadow-md">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold rounded-lg shadow-sm">
                                                    {index + 1}
                                                </div>
                                                <span className="text-lg font-semibold text-slate-900">{breed}</span>
                                            </div>
                                            <svg className="w-6 h-6 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p className="font-medium">No breed data available</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Performance Tab */}
                {activeView === 'performance' && (
                    <>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 mb-6">Performance Tiers</h3>
                            <div className="space-y-4">
                                {performanceChartData.map((item, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700">{item.name}</span>
                                            <span className="text-2xl font-bold" style={{ color: item.fill }}>{item.value}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-500 rounded-full"
                                                style={{
                                                    width: `${summaryData.totalBloodlines > 0 ? (item.value / summaryData.totalBloodlines) * 100 : 0}%`,
                                                    backgroundColor: item.fill
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                                <div className="text-5xl mb-2">🏆</div>
                                <p className="text-emerald-100 text-sm font-semibold mb-2">Elite Champions</p>
                                <p className="text-4xl font-bold">{summaryData.performanceTiers.elite}</p>
                                <p className="text-emerald-200 text-sm mt-1">70%+ Win Rate</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                                <div className="text-5xl mb-2">⭐</div>
                                <p className="text-blue-100 text-sm font-semibold mb-2">Strong Performers</p>
                                <p className="text-4xl font-bold">{summaryData.performanceTiers.strong}</p>
                                <p className="text-blue-200 text-sm mt-1">50-69% Win Rate</p>
                            </div>
                            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                                <div className="text-5xl mb-2">📊</div>
                                <p className="text-yellow-100 text-sm font-semibold mb-2">Average Fighters</p>
                                <p className="text-4xl font-bold">{summaryData.performanceTiers.average}</p>
                                <p className="text-yellow-200 text-sm mt-1">30-49% Win Rate</p>
                            </div>
                            <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg">
                                <div className="text-5xl mb-2">📈</div>
                                <p className="text-red-100 text-sm font-semibold mb-2">Developing</p>
                                <p className="text-4xl font-bold">{summaryData.performanceTiers.developing}</p>
                                <p className="text-red-200 text-sm mt-1">&lt;30% Win Rate</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default SummaryPage;