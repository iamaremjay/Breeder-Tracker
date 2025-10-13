import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { saveBloodline } from '../services/firestoreService';

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
        description: ''
    });

    const [imagePreview, setImagePreview] = useState(bloodline?.image || null);
    const [imageFile, setImageFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        calculateWinRate();
    }, [formData.wins, formData.losses]);

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
                errors.wingbandNumber = 'Wingband number is required';
            }
            if (formData.wingbandNumber.length > 50) {
                errors.wingbandNumber = 'Wingband number is too long';
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

    const processImageFile = (file) => {
        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image size must be less than 5MB');
            return;
        }

        setFileName(file.name);
        setImageFile(file);
        setError('');

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleBack = () => {
        if (onBack) onBack();
    };

    const uploadImage = async (file, wingbandNumber) => {
        try {
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
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

            // Upload image if there's a new one
            if (imageFile) {
                console.log('📤 Uploading image...');
                try {
                    imageUrl = await uploadImage(imageFile, formData.wingbandNumber);
                    console.log('✅ Image uploaded successfully:', imageUrl);
                } catch (uploadError) {
                    console.error('❌ Image upload failed (CORS issue):', uploadError);
                    // Show warning but continue saving without image
                    setError('⚠️ Image upload failed due to CORS. Saving without image...');
                    imageUrl = '';
                    // Clear error after 3 seconds
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
                image: imageUrl
            };

            console.log('💾 Saving bloodline to Firestore...', bloodlineData);

            const result = await saveBloodline(userId, bloodlineData);

            console.log('📦 Firestore result:', result);

            if (result.success) {
                console.log('✅ Bloodline saved successfully!');
                setIsSaving(false);

                // Call onSave callback
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
            console.error('Error details:', {
                message: err.message,
                code: err.code,
                stack: err.stack
            });

            // Show user-friendly error message
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
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">
                            {bloodline ? 'Edit Bloodline' : 'Add New Bloodline'}
                        </h1>
                        <p className="text-xs sm:text-sm lg:text-base text-slate-600">Step {currentStep} of 3</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <button onClick={handleBack} disabled={isSaving} className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg sm:rounded-xl border border-slate-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="hidden xs:inline">Back</span>
                        </button>
                        <button onClick={handleLogout} disabled={isSaving} className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg sm:rounded-xl border border-red-200 transition-all transform hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="hidden xs:inline">Logout</span>
                        </button>
                    </div>
                </div>

                {/* Progress Steps - Mobile Optimized */}
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
                                    <label className={labelClass}>Wingband Number *</label>
                                    <input type="text" name="wingbandNumber" value={formData.wingbandNumber} onChange={handleInputChange} placeholder="e.g., WD-000001" className={inputClass} disabled={isSaving || !!bloodline} required />
                                    {validationErrors.wingbandNumber && <p className={errorClass}>{validationErrors.wingbandNumber}</p>}
                                </div>

                                <div>
                                    <label className={labelClass}>Category Name</label>
                                    <input type="text" name="categoryName" value={formData.categoryName} onChange={handleInputChange} placeholder="e.g., Broadstag, Pullet, Stag" className={inputClass} disabled={isSaving} />
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
                                        <option value="Purebred">Purebred</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Hatch Date</label>
                                    <input type="date" name="hatchDate" value={formData.hatchDate} onChange={handleInputChange} className={inputClass} disabled={isSaving} />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Origin / Farm</label>
                                    <input type="text" name="origin" value={formData.origin} onChange={handleInputChange} placeholder="Farm or breeder name" className={inputClass} disabled={isSaving} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Bloodline Details */}
                    {currentStep === 2 && (
                        <div className="space-y-4 sm:space-y-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Bloodline Details</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label className={labelClass}>Sire (Father's Breed)</label>
                                    <input type="text" name="sire" value={formData.sire} onChange={handleInputChange} placeholder="e.g., Kelso" className={inputClass} disabled={isSaving} />
                                </div>

                                <div>
                                    <label className={labelClass}>Dam (Mother's Breed)</label>
                                    <input type="text" name="dam" value={formData.dam} onChange={handleInputChange} placeholder="e.g., Roundhead" className={inputClass} disabled={isSaving} />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Sire / Dam Wingbands</label>
                                    <input type="text" name="sireDamWingbands" value={formData.sireDamWingbands} onChange={handleInputChange} placeholder="e.g., WD-000010 / WD-000020" className={inputClass} disabled={isSaving} />
                                    <p className="text-xs text-slate-500 mt-1">Format: Sire Wingband / Dam Wingband</p>
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
                                        <div className="w-full px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg sm:rounded-xl text-center cursor-pointer transition-all transform hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center gap-2 text-sm sm:text-base">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Browse Files
                                        </div>
                                    </label>
                                    <p className="text-xs text-slate-500 text-center mt-2">Max size: 5MB • Formats: JPG, PNG, WebP</p>
                                </div>

                                {/* Performance Stats */}
                                <div className="space-y-4 sm:space-y-6">
                                    <div>
                                        <label className={labelClass}>Wins</label>
                                        <div className="relative">
                                            <input type="text" name="wins" value={formData.wins} onChange={handleNumberInput} placeholder="0" className={inputClass} disabled={isSaving} />
                                            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-emerald-100 rounded-lg">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Losses</label>
                                        <div className="relative">
                                            <input type="text" name="losses" value={formData.losses} onChange={handleNumberInput} placeholder="0" className={inputClass} disabled={isSaving} />
                                            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-red-100 rounded-lg">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Win / Loss / Win Rate (Auto-calculated)</label>
                                        <div className="relative">
                                            <div className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-lg sm:rounded-xl font-semibold text-slate-900 flex items-center justify-between text-xs sm:text-sm">
                                                <span className="truncate">{formData.winsLossesWinRate || 'Enter wins and losses'}</span>
                                                {formData.winsLossesWinRate && (
                                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                        {parseInt(formData.winsLossesWinRate.split('/')[2]) >= 70 ? (
                                                            <span className="text-xl sm:text-2xl">🏆</span>
                                                        ) : parseInt(formData.winsLossesWinRate.split('/')[2]) >= 50 ? (
                                                            <span className="text-xl sm:text-2xl">⭐</span>
                                                        ) : (
                                                            <span className="text-xl sm:text-2xl">📊</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {formData.winsLossesWinRate && (
                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                                            <h4 className="font-bold text-slate-700 mb-2 sm:mb-3 text-xs sm:text-sm">Performance Preview</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-slate-600">Win Rate</span>
                                                        <span className="font-bold text-violet-600">{formData.winsLossesWinRate.split('/')[2]?.trim() || '0%'}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-violet-500 to-purple-500 h-full transition-all duration-500" style={{ width: formData.winsLossesWinRate.split('/')[2]?.trim() || '0%' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center">
                    {currentStep > 1 ? (
                        <button onClick={handlePrevStep} disabled={isSaving} className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="hidden xs:inline">Previous</span>
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {currentStep < 3 ? (
                        <button onClick={handleNextStep} disabled={isSaving} className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-lg sm:rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                            <span className="hidden xs:inline">Next</span>
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ) : (
                        <button onClick={handleSave} disabled={isSaving} className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg sm:rounded-xl shadow-lg hover:shadow-emerald-500/50 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] sm:min-w-[180px] text-sm sm:text-base">
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="hidden xs:inline">Saving...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="hidden xs:inline">Save Bloodline</span>
                                    <span className="xs:hidden">Save</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BloodlineFormPage;