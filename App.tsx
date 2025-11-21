import React, { useState, useEffect } from 'react';
import { Icons } from './constants';
import { extractInvoiceData, extractReceiptData } from './services/geminiService';
import { StorageService } from './services/storageService';
import { ExtractedInvoiceData, ReceiptData, ProcessingStatus, AppMode } from './types';
import InvoiceEditor from './components/InvoiceEditor';
import ReceiptForm from './components/ReceiptForm';
import HistoryView from './components/HistoryView';
import BatchProcessor from './components/BatchProcessor';
import ManagerDashboard from './components/ManagerDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';

// --- MAIN APP COMPONENT ---
const AppContent: React.FC = () => {
    const { role, logout } = useAuth();
    const [mode, setMode] = useState<AppMode>('field'); // Default to field for mobile
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [status, setStatus] = useState<ProcessingStatus>({ step: 'idle' });
    const [data, setData] = useState<ExtractedInvoiceData | ReceiptData | null>(null);
    const [view, setView] = useState<'upload' | 'history' | 'batch' | 'manager'>('upload');

    // Set initial mode based on role
    useEffect(() => {
        if (role === 'manager') {
            setView('manager');
            setMode('office');
        } else {
            setView('upload');
            setMode('field');
        }
    }, [role]);

    if (!role) return <Login />;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);

            // Case 1: Single File
            if (files.length === 1) {
                const selectedFile = files[0];
                setFile(selectedFile);
                setPreview(URL.createObjectURL(selectedFile));
                setStatus({ step: 'uploading', message: 'Analyzing document...' });

                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64String = reader.result as string;
                    const base64Data = base64String.split(',')[1];
                    const mimeType = selectedFile.type;

                    try {
                        setStatus({ step: 'analyzing', message: 'AI is extracting data...' });

                        let result;
                        if (mode === 'office') {
                            result = await extractInvoiceData(base64Data, mimeType);
                        } else {
                            result = await extractReceiptData(base64Data, mimeType);
                        }

                        // Check for duplicates
                        const isDuplicate = StorageService.checkForDuplicate(result);
                        if (isDuplicate) {
                            if (!confirm("Warning: This document appears to be a duplicate. Continue?")) {
                                setStatus({ step: 'idle' });
                                setFile(null);
                                setPreview(null);
                                return;
                            }
                        }

                        setData(result);
                        setStatus({ step: 'complete' });
                    } catch (error: any) {
                        console.error(error);
                        setStatus({ step: 'error', message: error.message || 'Extraction Failed' });
                    }
                };
                reader.readAsDataURL(selectedFile);
            }
            // Case 2: Multiple Files (Manual Queue - simplified for demo, usually BatchProcessor handles this)
            else {
                alert("Please use 'Batch Upload' mode for multiple files.");
            }
        }
    };

    const handleSave = (finalData: ExtractedInvoiceData | ReceiptData) => {
        // If we have a file, we can save the image. 
        // Note: localStorage has size limits (usually 5MB). 
        // Saving full images might exceed it quickly. 
        // For a real app, upload image to S3/Cloud Storage and save URL.
        // Here we will try to save a small thumbnail or just data if it's too big.

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Compress or just save data? We'll try saving data + base64 
                // but catch quota errors in storageService.
                StorageService.saveInvoice(finalData, file.name, base64String.split(',')[1], file.type);
                resetForm();
                setView('history');
            };
            reader.readAsDataURL(file);
        } else {
            // Saving edited data from history view (no new file)
            StorageService.saveInvoice(finalData, "Edited_Record", undefined, undefined);
            resetForm();
            setView('history');
        }
    };

    const resetForm = () => {
        setFile(null);
        setPreview(null);
        setData(null);
        setStatus({ step: 'idle' });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navigation Bar */}
            <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('upload'); resetForm(); }}>
                        <div className="bg-amix-blue p-1.5 rounded-lg">
                            <Icons.Boat />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Amix Marine</h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Expense Tracker</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Role Badge */}
                        <span className={`hidden md:inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${role === 'manager' ? 'bg-purple-500' : 'bg-green-600'}`}>
                            {role === 'manager' ? 'Manager' : 'Field Staff'}
                        </span>

                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button
                                onClick={() => setView('upload')}
                                className={`p-2 rounded-md transition ${view === 'upload' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                title="Upload"
                            >
                                <Icons.Upload />
                            </button>
                            <button
                                onClick={() => setView('history')}
                                className={`p-2 rounded-md transition ${view === 'history' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                title="History"
                            >
                                <Icons.History />
                            </button>
                            {role === 'manager' && (
                                <>
                                    <button
                                        onClick={() => setView('batch')}
                                        className={`p-2 rounded-md transition ${view === 'batch' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                        title="Batch Upload"
                                    >
                                        <Icons.Layers />
                                    </button>
                                    <button
                                        onClick={() => setView('manager')}
                                        className={`p-2 rounded-md transition ${view === 'manager' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                        title="Manager Dashboard"
                                    >
                                        <Icons.Chart />
                                    </button>
                                </>
                            )}
                        </div>

                        <button onClick={logout} className="text-slate-400 hover:text-white transition">
                            <Icons.LogOut />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="max-w-5xl mx-auto px-4 py-8">

                {/* VIEW: UPLOAD / EDIT */}
                {view === 'upload' && (
                    <div className="animate-fade-in">
                        {!data ? (
                            <div className="max-w-xl mx-auto">
                                {/* Mode Switcher */}
                                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-8">
                                    <button
                                        onClick={() => setMode('field')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${mode === 'field' ? 'bg-amix-blue text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Icons.Receipt />
                                        Field Receipt
                                    </button>
                                    <button
                                        onClick={() => setMode('office')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${mode === 'office' ? 'bg-amix-blue text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Icons.FileText />
                                        Office Invoice
                                    </button>
                                </div>

                                {/* Upload Box */}
                                <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:border-amix-blue hover:bg-blue-50 transition cursor-pointer relative group">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileSelect}
                                        accept="image/*,application/pdf"
                                    />
                                    <div className="w-16 h-16 bg-blue-100 text-amix-blue rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
                                        <Icons.Upload />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Upload {mode === 'field' ? 'Receipt' : 'Invoice'}</h3>
                                    <p className="text-slate-500 mt-2 text-sm">Take a photo or drag & drop PDF/Image</p>
                                </div>

                                {/* Status Messages */}
                                {status.step !== 'idle' && (
                                    <div className="mt-8 text-center">
                                        {status.step === 'error' ? (
                                            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
                                                <p className="font-bold">Processing Failed</p>
                                                <p className="text-sm mt-1">{status.message}</p>
                                                <button onClick={resetForm} className="mt-3 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm font-medium shadow-sm hover:bg-red-50">Try Again</button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center animate-pulse">
                                                <div className="w-8 h-8 border-4 border-amix-blue border-t-transparent rounded-full animate-spin mb-3"></div>
                                                <p className="text-slate-600 font-medium">{status.message}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Preview Column */}
                                <div className="hidden lg:block bg-slate-200 rounded-xl overflow-hidden h-[calc(100vh-140px)] sticky top-24">
                                    {preview && (
                                        <iframe src={preview} className="w-full h-full object-contain" title="Document Preview" />
                                    )}
                                </div>

                                {/* Form Column */}
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <button onClick={resetForm} className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm font-medium">
                                            <Icons.ArrowLeft /> Back
                                        </button>
                                        <h2 className="text-xl font-bold">Review & Save</h2>
                                    </div>

                                    {mode === 'office' ? (
                                        <InvoiceEditor
                                            data={data as ExtractedInvoiceData}
                                            onSave={handleSave}
                                            onCancel={resetForm}
                                        />
                                    ) : (
                                        <ReceiptForm
                                            data={data as ReceiptData}
                                            onSave={handleSave}
                                            onCancel={resetForm}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* VIEW: HISTORY */}
                {view === 'history' && (
                    <HistoryView
                        onEdit={(item) => {
                            setData(item.data);
                            setFile(null); // No new file, just editing data
                            setPreview(item.previewImage || null);
                            setMode(item.data.type === 'invoice' ? 'office' : 'field');
                            setView('upload');
                        }}
                        onView={(item) => {
                            // Simple view mode could be implemented, for now re-using edit flow or just showing JSON
                            console.log("View item", item);
                        }}
                    />
                )}

                {/* VIEW: BATCH */}
                {view === 'batch' && role === 'manager' && (
                    <BatchProcessor />
                )}

                {/* VIEW: MANAGER */}
                {view === 'manager' && role === 'manager' && (
                    <ManagerDashboard
                        onViewItem={(item) => {
                            setData(item.data);
                            setPreview(item.previewImage || null);
                            setMode(item.data.type === 'invoice' ? 'office' : 'field');
                            setView('upload');
                        }}
                    />
                )}

            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;