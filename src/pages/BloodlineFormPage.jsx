import { useState } from 'react';

function BloodlineFormPage({ bloodline, onBack, onSave, onLogout, userId }) {
    const [formData, setFormData] = useState(bloodline || {
        wingBandLegBand: '',
        broodHenBand: '',
        broodStagBand: '',
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
    const [success, setSuccess] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [isDragging, setIsDragging] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const validateForm = () => {
        const errors = {};

        if (!formData.wingBandLegBand.trim()) {
            errors.wingBandLegBand = 'Wing Band / Leg Band is required';
        }
        if (formData.wingBandLegBand.length > 50) {
            errors.wingBandLegBand = 'Wing Band / Leg Band is too long';
        }

        if (formData.batchCount && (isNaN(formData.batchCount) || Number(formData.batchCount) < 0)) {
            errors.batchCount = 'Batch count must be a positive number';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasUnsavedChanges(true);
        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: '' }));
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
        setHasUnsavedChanges(true);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleBack = () => {
        if (hasUnsavedChanges) {
            const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
            if (!confirmLeave) return;
        }
        if (onBack) onBack();
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setError('');
        setSuccess('');

        if (!userId) {
            setError('User not authenticated');
            return;
        }

        setIsSaving(true);

        try {
            // Use the base64 image data directly - no external storage needed
            const imageUrl = imagePreview || formData.image || '';

            const bloodlineData = {
                wingBandLegBand: formData.wingBandLegBand.trim(),
                broodHenBand: formData.broodHenBand.trim(),
                broodStagBand: formData.broodStagBand.trim(),
                penNo: formData.penNo.trim(),
                markings: formData.markings,
                batchNo: formData.batchNo.trim(),
                batchCount: formData.batchCount,
                casualty: formData.casualty.trim(),
                image: imageUrl,
                imageName: fileName || ''
            };

            if (onSave) {
                await onSave(bloodlineData);
            }

            setSuccess('Bloodline saved successfully!');
            setHasUnsavedChanges(false);
            setIsSaving(false);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        } catch (err) {
            console.error('Exception caught:', err);
            setError('Failed to save bloodline. Please try again.');
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        if (onLogout) onLogout();
    };

    const inputClass = "w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all disabled:opacity-50 disabled:bg-slate-50";
    const labelClass = "block text-sm font-bold text-slate-800 mb-2 tracking-wide";
    const errorClass = "text-red-600 text-sm mt-2 font-medium";

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 mb-8 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 via-purple-600/5 to-pink-600/5"></div>

                    <div className="relative flex items-center justify-center">
                        <button
                            onClick={handleBack}
                            disabled={isSaving}
                            className="absolute left-0 p-3 hover:bg-violet-50 text-slate-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            title="Back"
                        >
                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>

                        <div className="text-center">
                            <h1 className="text-lg sm:text-2xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600">
                                {bloodline ? 'Edit Bloodline' : 'Add New Bloodline'}
                            </h1>
                        </div>

                        <button
                            onClick={handleLogout}
                            disabled={isSaving}
                            className="absolute right-0 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-lg animate-pulse">
                        <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-lg">
                        <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold">{success}</span>
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 lg:p-10 mb-8">
                    {/* Image Upload Section */}
                    <div className="mb-10">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black text-slate-800 inline-block relative">
                                Upload Image
                                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 rounded-full"></div>
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {/* Combined Upload Area */}
                            <label className="block cursor-pointer group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={isSaving}
                                    className="hidden"
                                />
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`relative w-full bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 rounded-2xl overflow-hidden border-3 border-dashed transition-all h-64 sm:h-80 lg:h-96 ${isDragging ? 'border-violet-500 bg-violet-100 scale-105' : 'border-slate-300 group-hover:border-violet-400 group-hover:shadow-xl'}`}
                                >
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-slate-900" />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setImagePreview(null);
                                                    setImageFile(null);
                                                    setFileName('');
                                                    setHasUnsavedChanges(true);
                                                }}
                                                disabled={isSaving}
                                                className="absolute top-4 right-4 p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-xl disabled:opacity-50 z-10 hover:scale-110 active:scale-95"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-8">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform flex-shrink-0">
                                                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                            </div>
                                            <h3 className="font-bold text-lg sm:text-xl text-slate-700 mb-2 text-center">Drop your image here</h3>
                                            <p className="text-sm sm:text-base text-slate-500 mb-4 sm:mb-6 text-center">or click to browse from your device</p>
                                            <div className="px-6 sm:px-8 py-2.5 sm:py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg group-hover:shadow-2xl group-hover:scale-105 transition-all text-sm sm:text-base">
                                                Choose File
                                            </div>
                                            <p className="text-xs text-slate-400 mt-4 sm:mt-6 font-medium">JPG, PNG, WebP • Max 5MB</p>
                                        </div>
                                    )}
                                </div>
                            </label>

                            {/* File Name Display */}
                            {fileName && (
                                <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl text-sm text-violet-900 flex items-center gap-3 shadow-lg">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <span className="truncate font-bold flex-1">{fileName}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 inline-block relative">
                                Bloodline Information
                                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 rounded-full"></div>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Wing Band / Leg Band */}
                            <div>
                                <label className={labelClass}>
                                    <span className="flex items-center gap-2">
                                        WING BAND / LEG BAND
                                        <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="wingBandLegBand"
                                    value={formData.wingBandLegBand}
                                    onChange={handleInputChange}
                                    placeholder="e.g., WB-000001"
                                    className={inputClass}
                                    disabled={isSaving || !!bloodline}
                                    required
                                />
                                {validationErrors.wingBandLegBand && <p className={errorClass}>⚠️ {validationErrors.wingBandLegBand}</p>}
                            </div>

                            {/* Brood Hen */}
                            <div>
                                <label className={labelClass}>BROOD HEN</label>
                                <input
                                    type="text"
                                    name="broodHenBand"
                                    value={formData.broodHenBand}
                                    onChange={handleInputChange}
                                    placeholder="e.g., WB-000020"
                                    className={inputClass}
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Brood Stag */}
                            <div>
                                <label className={labelClass}>BROOD STAG</label>
                                <input
                                    type="text"
                                    name="broodStagBand"
                                    value={formData.broodStagBand}
                                    onChange={handleInputChange}
                                    placeholder="e.g., WB-000010"
                                    className={inputClass}
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Pen No */}
                            <div>
                                <label className={labelClass}>PEN NO.</label>
                                <input
                                    type="text"
                                    name="penNo"
                                    value={formData.penNo}
                                    onChange={handleInputChange}
                                    placeholder="e.g., P-01"
                                    className={inputClass}
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Markings */}
                            <div>
                                <label className={labelClass}>MARKINGS</label>
                                <select
                                    name="markings"
                                    value={formData.markings}
                                    onChange={handleInputChange}
                                    className={inputClass}
                                    disabled={isSaving}
                                >
                                    <option value="">Select marking</option>
                                    <option value="ROC">ROC</option>
                                    <option value="RIC">RIC</option>
                                    <option value="RIP">RIP</option>
                                </select>
                            </div>

                            {/* Batch No */}
                            <div>
                                <label className={labelClass}>BATCH NO.</label>
                                <input
                                    type="text"
                                    name="batchNo"
                                    value={formData.batchNo}
                                    onChange={handleInputChange}
                                    placeholder="e.g., B-2025-01"
                                    className={inputClass}
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Batch Count */}
                            <div>
                                <label className={labelClass}>BATCH COUNT</label>
                                <input
                                    type="number"
                                    name="batchCount"
                                    value={formData.batchCount}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 1"
                                    className={inputClass}
                                    disabled={isSaving}
                                    min="0"
                                />
                                {validationErrors.batchCount && <p className={errorClass}>⚠️ {validationErrors.batchCount}</p>}
                            </div>

                            {/* Casualty */}
                            <div>
                                <label className={labelClass}>CASUALTY</label>
                                <input
                                    type="text"
                                    name="casualty"
                                    value={formData.casualty}
                                    onChange={handleInputChange}
                                    placeholder="Casualty information"
                                    className={inputClass}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-center mt-10">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-12 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-black text-lg rounded-xl shadow-2xl shadow-emerald-500/50 hover:shadow-emerald-500/70 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed min-w-[220px]"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>SAVING...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>SAVE BLOODLINE</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BloodlineFormPage;