import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { saveBloodline, getUserBloodlines } from '../services/firestoreService';

function BloodlineFormPage({ bloodline, onBack, onSave, onLogout, userId }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState(bloodline || {
        wingbandNumber: '',
        categoryName: '',
        breed: '',
        sire: '',
        dam: '',
        typeOrCross: '',
        hatchDate: '',
        origin: '',
        color: '',
        combType: '',
        wins: '',
        losses: '',
        winsLossesWinRate: '',
        fightingStyle: '',
        sireDamWingbands: '',
        description: '',
        penNo: '',
        markings: '',
        batchNo: '',
        batchCount: '',
        casualty: ''
    });

    const [imagePreview, setImagePreview] = useState(bloodline?.image || null);
    const [imageFile, setImageFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [isDragging, setIsDragging] = useState(false);
    const [availableStags, setAvailableStags] = useState([]);
    const [availableHens, setAvailableHens] = useState([]);
    const [loadingParents, setLoadingParents] = useState(true);
    const [showSireDropdown, setShowSireDropdown] = useState(false);
    const [showDamDropdown, setShowDamDropdown] = useState(false);
    const [sireSearch, setSireSearch] = useState('');
    const [damSearch, setDamSearch] = useState('');

    useEffect(() => {
        calculateWinRate();
    }, [formData.wins, formData.losses]);

    useEffect(() => {
        loadParentBloodlines();
    }, [userId]);

    useEffect(() => {
        // Initialize search fields with existing values
        setSireSearch(formData.sire || '');
        setDamSearch(formData.dam || '');
    }, [formData.sire, formData.dam]);

    useEffect(() => {
        // Close dropdowns when clicking outside
        const handleClickOutside = (e) => {
            if (!e.target.closest('.sire-autocomplete')) {
                setShowSireDropdown(false);
            }
            if (!e.target.closest('.dam-autocomplete')) {
                setShowDamDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadParentBloodlines = async () => {
        if (!userId) return;

        setLoadingParents(true);
        try {
            const result = await getUserBloodlines(userId);
            // Changed from result.bloodlines to result.data
            if (result.success && result.data) {
                // Filter stags (males)
                const stags = result.data.filter(
                    b => b.categoryName === 'Brood Stag' && b.wingbandNumber
                );
                // Filter hens (females)
                const hens = result.data.filter(
                    b => b.categoryName === 'Brood Hen' && b.wingbandNumber
                );

                setAvailableStags(stags);
                setAvailableHens(hens);
            }
        } catch (error) {
            console.error('Error loading parent bloodlines:', error);
        } finally {
            setLoadingParents(false);
        }
    };

    const calculateWinRate = () => {
        const wins = parseInt(formData.wins) || 0;
        const losses = parseInt(formData.losses) || 0;
        const totalFights = wins + losses;

        if (totalFights === 0) {
            setFormData(prev => ({ ...prev, winsLossesWinRate: '' }));
            return;
        }

        const winRate = Math.round((wins / totalFights) * 100);
        const formattedWinRate = `${wins} / ${losses} / ${winRate}%`;

        setFormData(prev => ({ ...prev, winsLossesWinRate: formattedWinRate }));
    };

    const validateStep = (step) => {
        const errors = {};

        if (step === 1) {
            if (!formData.wingbandNumber.trim()) {
                errors.wingbandNumber = 'Leg Band / Wing Band is required';
            }
            if (formData.wingbandNumber.length > 50) {
                errors.wingbandNumber = 'Leg Band / Wing Band is too long';
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleNumberInput = (e) => {
        const { name, value } = e.target;
        if (value === '' || /^\d+$/.test(value)) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSireSelect = (wingband) => {
        setFormData(prev => ({ ...prev, sire: wingband }));
        setSireSearch(wingband);
        setShowSireDropdown(false);
    };

    const handleDamSelect = (wingband) => {
        setFormData(prev => ({ ...prev, dam: wingband }));
        setDamSearch(wingband);
        setShowDamDropdown(false);
    };

    const handleSireSearchChange = (e) => {
        const value = e.target.value;
        setSireSearch(value);
        setFormData(prev => ({ ...prev, sire: value }));
        setShowSireDropdown(true);
    };

    const handleDamSearchChange = (e) => {
        const value = e.target.value;
        setDamSearch(value);
        setFormData(prev => ({ ...prev, dam: value }));
        setShowDamDropdown(true);
    };

    const filteredStags = availableStags.filter(stag => {
        const searchLower = sireSearch.toLowerCase();
        return (
            stag.wingbandNumber.toLowerCase().includes(searchLower) ||
            (stag.breed && stag.breed.toLowerCase().includes(searchLower))
        );
    });

    const filteredHens = availableHens.filter(hen => {
        const searchLower = damSearch.toLowerCase();
        return (
            hen.wingbandNumber.toLowerCase().includes(searchLower) ||
            (hen.breed && hen.breed.toLowerCase().includes(searchLower))
        );
    });

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            processImageFile(file);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            processImageFile(file);
        }
    };

    const compressImage = (file, maxWidth = 1200, quality = 0.85) => {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Not an image file'));
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxWidth) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxWidth) / height);
                            height = maxWidth;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                resolve(compressedFile);
                            } else {
                                reject(new Error('Canvas to Blob conversion failed'));
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                img.onerror = () => reject(new Error('Image load failed'));
            };

            reader.onerror = () => reject(new Error('FileReader error'));
        });
    };

    const processImageFile = async (file) => {
        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('Image size must be less than 10MB');
            return;
        }

        setFileName(file.name);
        setError('Compressing image...');

        try {
            const compressedFile = await compressImage(file);

            const originalSizeKB = (file.size / 1024).toFixed(2);
            const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);

            console.log(`📦 Original: ${originalSizeKB}KB → Compressed: ${compressedSizeKB}KB`);

            setImageFile(compressedFile);
            setError('');

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(compressedFile);

        } catch (err) {
            console.error('❌ Compression failed:', err);
            setError('Failed to process image: ' + err.message);
        }
    };

    const handleBack = () => {
        if (onBack) onBack();
    };

    const uploadImage = async (file, wingbandNumber) => {
        try {
            const timestamp = Date.now();
            const fileExtension = 'jpg';
            const fileName = `bloodlines/${userId}/${wingbandNumber}_${timestamp}.${fileExtension}`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const handleSave = async () => {
        console.log('🚀 Save button clicked');

        if (!validateStep(1)) {
            console.log('❌ Validation failed');
            setCurrentStep(1);
            return;
        }

        setError('');

        if (!userId) {
            console.log('❌ No userId');
            setError('User not authenticated');
            return;
        }

        console.log('✅ Starting save process for userId:', userId);
        setIsSaving(true);

        try {
            let imageUrl = formData.image || '';

            if (imageFile) {
                console.log('📤 Uploading compressed image...');
                try {
                    imageUrl = await uploadImage(imageFile, formData.wingbandNumber);
                    console.log('✅ Image uploaded successfully:', imageUrl);
                } catch (uploadError) {
                    console.error('❌ Image upload failed:', uploadError);
                    setError('⚠️ Image upload failed. Saving without image...');
                    imageUrl = '';
                    setTimeout(() => setError(''), 3000);
                }
            }

            const bloodlineData = {
                wingbandNumber: formData.wingbandNumber.trim(),
                categoryName: formData.categoryName,
                breed: formData.breed,
                sire: formData.sire,
                dam: formData.dam,
                typeOrCross: formData.typeOrCross,
                hatchDate: formData.hatchDate,
                origin: formData.origin,
                color: formData.color,
                combType: formData.combType,
                winsLossesWinRate: formData.winsLossesWinRate,
                fightingStyle: formData.fightingStyle,
                sireDamWingbands: formData.sireDamWingbands,
                description: formData.description,
                penNo: formData.penNo,
                markings: formData.markings,
                batchNo: formData.batchNo,
                batchCount: formData.batchCount,
                casualty: formData.casualty,
                image: imageUrl,
                createdAt: bloodline?.createdAt || Date.now(),
                updatedAt: Date.now()
            };

            console.log('💾 Saving bloodline to Firestore...');

            const result = await saveBloodline(userId, bloodlineData);

            console.log('📦 Firestore result:', result);

            if (result.success) {
                console.log('✅ Bloodline saved successfully!');
                setIsSaving(false);

                if (onSave) {
                    console.log('📢 Calling onSave callback');
                    onSave(bloodlineData);
                } else {
                    console.warn('⚠️ No onSave callback provided');
                }
            } else {
                console.error('❌ Save failed:', result.error);
                setError(result.error || 'Failed to save bloodline');
                setIsSaving(false);
            }
        } catch (err) {
            console.error('❌ Exception caught:', err);

            let errorMessage = 'Failed to save bloodline. ';

            if (err.message.includes('permission')) {
                errorMessage += 'Permission denied. Please check your authentication.';
            } else if (err.message.includes('network')) {
                errorMessage += 'Network error. Please check your connection.';
            } else {
                errorMessage += err.message || 'Unknown error occurred.';
            }

            setError(errorMessage);
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        if (onLogout) onLogout();
    };

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 3));
        }
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const inputClass = "w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50";
    const labelClass = "block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2";
    const errorClass = "text-red-600 text-xs sm:text-sm mt-1";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-slate-900 flex-1 min-w-0">
                            {bloodline ? 'Edit Bloodline' : 'Add New Bloodline'}
                        </h1>
                        <button
                            onClick={handleLogout}
                            disabled={isSaving}
                            className="px-4 sm:px-8 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-base whitespace-nowrap"
                        >
                            Logout
                        </button>
                    </div>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-600 mt-1 sm:mt-2">Step {currentStep} of 3</p>
                </div>

                {/* Progress Steps */}
                <div className="mb-4 sm:mb-6 lg:mb-8 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[600px] sm:min-w-0">
                        <div className="flex-1 flex items-center">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 ${currentStep >= 1 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {currentStep > 1 ? '✓' : '1'}
                            </div>
                            <div className="flex-1 ml-2 sm:ml-4 min-w-0">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">Basic Info</p>
                                <p className="text-xs text-slate-500 hidden sm:block">Identification details</p>
                            </div>
                        </div>
                        <div className={`h-1 w-8 sm:w-12 lg:w-16 mx-1 sm:mx-2 flex-shrink-0 ${currentStep >= 2 ? 'bg-violet-600' : 'bg-slate-200'}`}></div>
                        <div className="flex-1 flex items-center">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 ${currentStep >= 2 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {currentStep > 2 ? '✓' : '2'}
                            </div>
                            <div className="flex-1 ml-2 sm:ml-4 min-w-0">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">Bloodline</p>
                                <p className="text-xs text-slate-500 hidden sm:block">Lineage & traits</p>
                            </div>
                        </div>
                        <div className={`h-1 w-8 sm:w-12 lg:w-16 mx-1 sm:mx-2 flex-shrink-0 ${currentStep >= 3 ? 'bg-violet-600' : 'bg-slate-200'}`}></div>
                        <div className="flex-1 flex items-center">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 ${currentStep >= 3 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                3
                            </div>
                            <div className="flex-1 ml-2 sm:ml-4 min-w-0">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">Performance</p>
                                <p className="text-xs text-slate-500 hidden sm:block">Stats & media</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-700 px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="space-y-4 sm:space-y-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Basic Information</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Leg Band / Wing Band *</label>
                                    <input type="text" name="wingbandNumber" value={formData.wingbandNumber} onChange={handleInputChange} placeholder="e.g., WB-000001" className={inputClass} disabled={isSaving || !!bloodline} required />
                                    {validationErrors.wingbandNumber && <p className={errorClass}>{validationErrors.wingbandNumber}</p>}
                                </div>

                                <div>
                                    <label className={labelClass}>Gender</label>
                                    <select name="categoryName" value={formData.categoryName} onChange={handleInputChange} className={inputClass} disabled={isSaving}>
                                        <option value="">Select gender</option>
                                        <option value="Brood Stag">Brood Stag (Male)</option>
                                        <option value="Brood Hen">Brood Hen (Female)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Breed</label>
                                    <input type="text" name="breed" value={formData.breed} onChange={handleInputChange} placeholder="e.g., Kelso, Hatch" className={inputClass} disabled={isSaving} />
                                </div>

                                <div>
                                    <label className={labelClass}>Type / Cross</label>
                                    <select name="typeOrCross" value={formData.typeOrCross} onChange={handleInputChange} className={inputClass} disabled={isSaving}>
                                        <option value="">Select type</option>
                                        <option value="Cross">Cross</option>
                                        <option value="Pure">Pure</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Hatch Date</label>
                                    <input
                                        type="date"
                                        name="hatchDate"
                                        value={formData.hatchDate}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                        disabled={isSaving}
                                        style={{ textAlign: 'left' }}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Origin / Farm</label>
                                    <input type="text" name="origin" value={formData.origin} onChange={handleInputChange} placeholder="Farm or breeder name" className={inputClass} disabled={isSaving} />
                                </div>

                                <div>
                                    <label className={labelClass}>Pen No.</label>
                                    <input type="text" name="penNo" value={formData.penNo} onChange={handleInputChange} placeholder="e.g., P-001" className={inputClass} disabled={isSaving} />
                                </div>

                                <div>
                                    <label className={labelClass}>Markings</label>
                                    <select name="markings" value={formData.markings} onChange={handleInputChange} className={inputClass} disabled={isSaving}>
                                        <option value="">Select markings</option>
                                        <option value="ROC">ROC</option>
                                        <option value="RIC">RIC</option>
                                        <option value="RIP">RIP</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Batch No.</label>
                                    <input type="text" name="batchNo" value={formData.batchNo} onChange={handleInputChange} placeholder="e.g., B-2024-01" className={inputClass} disabled={isSaving} />
                                </div>

                                <div>
                                    <label className={labelClass}>Batch Count</label>
                                    <input type="text" name="batchCount" value={formData.batchCount} onChange={handleNumberInput} placeholder="e.g., 50" className={inputClass} disabled={isSaving} />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Casualty</label>
                                    <input type="text" name="casualty" value={formData.casualty} onChange={handleInputChange} placeholder="Notes about casualties or losses" className={inputClass} disabled={isSaving} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Bloodline Details */}
                    {currentStep === 2 && (
                        <div className="space-y-4 sm:space-y-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Bloodline Details</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                {/* Brood Stag with Autocomplete */}
                                <div className="relative sire-autocomplete">
                                    <label className={labelClass}>Brood Stag (Father)</label>
                                    <input
                                        type="text"
                                        name="sire"
                                        value={sireSearch}
                                        onChange={handleSireSearchChange}
                                        onFocus={() => setShowSireDropdown(true)}
                                        placeholder={loadingParents ? "Loading..." : "Type wingband or select..."}
                                        className={inputClass}
                                        disabled={isSaving || loadingParents}
                                        autoComplete="off"
                                    />

                                    {showSireDropdown && filteredStags.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {filteredStags.map((stag) => (
                                                <button
                                                    key={stag.wingbandNumber}
                                                    type="button"
                                                    onClick={() => handleSireSelect(stag.wingbandNumber)}
                                                    className="w-full px-4 py-2 text-left hover:bg-violet-50 flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-slate-900 text-sm truncate">
                                                            {stag.wingbandNumber}
                                                        </div>
                                                        {stag.breed && (
                                                            <div className="text-xs text-slate-500 truncate">
                                                                {stag.breed}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex-shrink-0">
                                                        Stag
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-500 mt-1">
                                        {availableStags.length > 0 ? `${availableStags.length} stags available` : 'No stags found - you can type manually'}
                                    </p>
                                </div>

                                {/* Brood Hen with Autocomplete */}
                                <div className="relative dam-autocomplete">
                                    <label className={labelClass}>Brood Hen (Mother)</label>
                                    <input
                                        type="text"
                                        name="dam"
                                        value={damSearch}
                                        onChange={handleDamSearchChange}
                                        onFocus={() => setShowDamDropdown(true)}
                                        placeholder={loadingParents ? "Loading..." : "Type wingband or select..."}
                                        className={inputClass}
                                        disabled={isSaving || loadingParents}
                                        autoComplete="off"
                                    />

                                    {showDamDropdown && filteredHens.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {filteredHens.map((hen) => (
                                                <button
                                                    key={hen.wingbandNumber}
                                                    type="button"
                                                    onClick={() => handleDamSelect(hen.wingbandNumber)}
                                                    className="w-full px-4 py-2 text-left hover:bg-violet-50 flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-slate-900 text-sm truncate">
                                                            {hen.wingbandNumber}
                                                        </div>
                                                        {hen.breed && (
                                                            <div className="text-xs text-slate-500 truncate">
                                                                {hen.breed}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full flex-shrink-0">
                                                        Hen
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-500 mt-1">
                                        {availableHens.length > 0 ? `${availableHens.length} hens available` : 'No hens found - you can type manually'}
                                    </p>
                                </div>

                                <div>
                                    <label className={labelClass}>Color</label>
                                    <input type="text" name="color" value={formData.color} onChange={handleInputChange} placeholder="Feather color" className={inputClass} disabled={isSaving} />
                                </div>

                                <div>
                                    <label className={labelClass}>Comb Type</label>
                                    <select name="combType" value={formData.combType} onChange={handleInputChange} className={inputClass} disabled={isSaving}>
                                        <option value="">Select type</option>
                                        <option value="Pea Comb">Pea Comb</option>
                                        <option value="Straight Comb">Straight Comb</option>
                                        <option value="Walnut Comb">Walnut Comb</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Fighting Style</label>
                                    <input type="text" name="fightingStyle" value={formData.fightingStyle} onChange={handleInputChange} placeholder="e.g., Aggressive" className={inputClass} disabled={isSaving} />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Additional notes, traits, and information..." rows="4" className={inputClass} disabled={isSaving} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Performance & Media */}
                    {currentStep === 3 && (
                        <div className="space-y-4 sm:space-y-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Performance & Media</h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                                {/* Image Upload Section */}
                                <div>
                                    <label className={labelClass}>Rooster Image</label>
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`relative aspect-square w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-dashed transition-all ${isDragging ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-violet-400'}`}
                                    >
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                <button onClick={() => { setImagePreview(null); setImageFile(null); setFileName(''); }} disabled={isSaving} className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-lg disabled:opacity-50">
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 sm:p-6">
                                                <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <p className="font-medium text-center text-xs sm:text-sm">Drag & drop image here</p>
                                                <p className="text-xs text-center mt-1">or click to browse</p>
                                                <p className="text-xs text-center mt-1 text-violet-600 font-semibold">✨ Auto-compressed to save space</p>
                                            </div>
                                        )}
                                    </div>

                                    {fileName && (
                                        <div className="mt-3 px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-600 truncate flex items-center gap-2">
                                            <svg className="w-4 h-4 flex-shrink-0 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="truncate">{fileName}</span>
                                        </div>
                                    )}

                                    <label className="block mt-3">
                                        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isSaving} className="hidden" />
                                        <div className="w-full px-4 py-2.5 sm:px-6 sm:py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-sm text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                                            Choose Image
                                        </div>
                                    </label>
                                </div>

                                {/* Performance Stats Section */}
                                <div className="space-y-4 sm:space-y-6">
                                    <div>
                                        <label className={labelClass}>Wins</label>
                                        <input type="text" name="wins" value={formData.wins} onChange={handleNumberInput} placeholder="Number of wins" className={inputClass} disabled={isSaving} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Losses</label>
                                        <input type="text" name="losses" value={formData.losses} onChange={handleNumberInput} placeholder="Number of losses" className={inputClass} disabled={isSaving} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Win Rate (Auto-calculated)</label>
                                        <input type="text" name="winsLossesWinRate" value={formData.winsLossesWinRate} readOnly placeholder="Wins / Losses / Win%" className={`${inputClass} bg-slate-100 cursor-not-allowed`} disabled />
                                        <p className="text-xs text-slate-500 mt-1">Format: Wins / Losses / Win Rate %</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex gap-3 sm:gap-4">
                        {currentStep > 1 && (
                            <button onClick={handlePrevStep} disabled={isSaving} className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg sm:rounded-xl border-2 border-slate-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                                ← Previous
                            </button>
                        )}
                        <button onClick={handleBack} disabled={isSaving} className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg sm:rounded-xl border-2 border-slate-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                            ✕ Cancel
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 sm:flex-initial">
                        {currentStep < 3 ? (
                            <button onClick={handleNextStep} disabled={isSaving} className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                                Next →
                            </button>
                        ) : (
                            <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base">
                                {isSaving ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Save Bloodline</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BloodlineFormPage;