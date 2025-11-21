import React, { useState, useCallback } from 'react';
import { Icons } from './constants';
import InvoiceUploader from './components/InvoiceUploader';
import InvoiceEditor from './components/InvoiceEditor';
import ReceiptCapture from './components/ReceiptCapture';
import ReceiptForm from './components/ReceiptForm';
import HistoryView from './components/HistoryView';
import ManagerDashboard from './components/ManagerDashboard';
import BatchProcessor from './components/BatchProcessor';
import { ExtractedInvoiceData, ReceiptData, ProcessingStatus, HistoryItem, AppMode } from './types';
import { extractInvoiceData, extractReceiptData } from './services/geminiService';
import { StorageService } from './services/storageService';

type AppView = 'dashboard' | 'history' | 'editor' | 'manager' | 'batch';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('office');
  const [view, setView] = useState<AppView>('dashboard');
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'idle' });
  const [file, setFile] = useState<File | null>(null);
  
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | ReceiptData | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeMimeType, setActiveMimeType] = useState<string | undefined>(undefined);

  // Helper: Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const processFile = async (selectedFile: File): Promise<{data: ExtractedInvoiceData | ReceiptData, base64: string}> => {
    const base64Data = await fileToBase64(selectedFile);
    let data;
    if (mode === 'office') {
       data = await extractInvoiceData(base64Data, selectedFile.type);
    } else {
       data = await extractReceiptData(base64Data, selectedFile.type);
    }
    return { data, base64: base64Data };
  };

  const handleFileSelect = useCallback(async (selectedFiles: File | File[]) => {
    const files = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
    if (files.length === 0) return;

    // Case 1: Single File
    if (files.length === 1) {
        const selectedFile = files[0];
        setFile(selectedFile);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setActiveMimeType(selectedFile.type);
        setStatus({ step: 'uploading' });
        setView('editor');

        try {
            setStatus({ step: 'analyzing' });
            const { data, base64 } = await processFile(selectedFile);
            
            // Duplicate Check
            const duplicateFound = StorageService.checkForDuplicate(data);
            setIsDuplicate(duplicateFound);
            
            StorageService.saveInvoice(data as any, selectedFile.name, base64, selectedFile.type);
            
            setExtractedData(data);
            setStatus({ step: 'complete' });
        } catch (error: any) {
            console.error(error);
            setStatus({ step: 'error', message: error.message || "Failed to process file" });
        }
    } 
    // Case 2: Multiple Files
    else {
        setStatus({ step: 'batch-processing', batchProgress: { current: 0, total: files.length } });
        setView('dashboard');

        for (let i = 0; i < files.length; i++) {
            const currentFile = files[i];
            try {
                setStatus({ 
                    step: 'batch-processing', 
                    batchProgress: { current: i + 1, total: files.length } 
                });
                
                const { data, base64 } = await processFile(currentFile);
                StorageService.saveInvoice(data as any, currentFile.name, base64, currentFile.type);
                
                // SAFE RATE LIMIT DELAY: 10 seconds
                if (i < files.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }

            } catch (error) {
                console.error(`Failed to process ${currentFile.name}`, error);
            }
        }
        setStatus({ step: 'idle' });
        alert(`Processed ${files.length} items. See History.`);
        setView('history');
    }
  }, [previewUrl, mode]);

  const handleSave = (data: ExtractedInvoiceData | ReceiptData) => {
    if (data.id) {
        StorageService.updateStatus(data.id, 'Pending');
    }
    alert(`${mode === 'office' ? 'Invoice' : 'Receipt'} submitted for approval!`);
    handleCancel();
  };

  const handleCancel = () => {
    if (previewUrl && !previewUrl.startsWith('data:')) {
        URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setExtractedData(null);
    setPreviewUrl(null);
    setActiveMimeType(undefined);
    setStatus({ step: 'idle' });
    setView('dashboard');
    setIsDuplicate(false);
  };

  const handleHistorySelect = (item: HistoryItem) => {
      setExtractedData(item.data);
      setFile(null);
      setIsDuplicate(false);
      
      if (item.previewImage) {
          setPreviewUrl(item.previewImage);
          setActiveMimeType(item.mimeType);
      } else {
          setPreviewUrl(null);
          setActiveMimeType(undefined);
      }
      
      if ((item.data as any).type === 'receipt') {
          setMode('field');
      } else {
          setMode('office');
      }

      setStatus({ step: 'complete' });
      setView('editor');
  };

  const renderPreview = () => {
    if (!previewUrl) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-8 text-center min-h-[200px]">
                <Icons.FileText />
                <p className="mt-2 text-sm font-medium">No Preview Available</p>
            </div>
        );
    }
    
    const isPdf = activeMimeType === 'application/pdf';

    if (isPdf) {
      return (
        <iframe 
          src={previewUrl} 
          className="w-full h-full border-none min-h-[300px]"
          title="PDF Preview"
        />
      );
    }

    return (
      <img 
        src={previewUrl} 
        alt="Preview" 
        className="w-full h-full object-contain p-4 bg-slate-800"
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navigation Bar */}
      <nav className="bg-amix-navy text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleCancel()}>
            <div className="p-2 bg-white/10 rounded-lg">
               <Icons.Ship />
            </div>
            <div>
                <h1 className="text-lg font-bold tracking-tight leading-tight">Amix Marine</h1>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-medium">
                    {mode === 'office' ? 'Invoice Processor' : 'Site Expenses'}
                </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {view === 'dashboard' && (
                <div className="hidden md:flex bg-slate-800 rounded-lg p-1">
                    <button 
                        onClick={() => setMode('office')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'office' ? 'bg-amix-blue text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        Office
                    </button>
                    <button 
                        onClick={() => setMode('field')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'field' ? 'bg-amix-orange text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        Field
                    </button>
                </div>
            )}

            <button 
                onClick={() => setView('history')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${view === 'history' ? 'text-amix-orange' : 'text-slate-300 hover:text-white'}`}
            >
                <Icons.History />
                <span className="hidden sm:inline">History</span>
            </button>

            <button 
                onClick={() => setView('batch')}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-600 transition-colors ${view === 'batch' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
                <span>Batch Upload</span>
            </button>

            <button 
                onClick={() => setView('manager')}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-600 transition-colors ${view === 'manager' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
                <span>Manager</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Mode Switcher */}
      {view === 'dashboard' && (
        <div className="md:hidden px-4 py-3 bg-white border-b border-slate-200 sticky top-16 z-40">
             <div className="flex w-full bg-slate-100 rounded-lg p-1">
                <button 
                    onClick={() => setMode('office')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'office' ? 'bg-white text-amix-navy shadow-sm' : 'text-slate-500'}`}
                >
                    Invoices
                </button>
                <button 
                    onClick={() => setMode('field')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'field' ? 'bg-amix-orange text-white shadow-sm' : 'text-slate-500'}`}
                >
                    Receipts
                </button>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto h-full">
          
          {/* DASHBOARD */}
          {view === 'dashboard' && status.step !== 'batch-processing' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-8 animate-fade-in py-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                    {mode === 'office' ? 'Upload Vendor Invoices' : 'Capture Site Receipts'}
                </h2>
                <p className="text-slate-500 text-sm md:text-base max-w-md mx-auto">
                    {mode === 'office' 
                        ? 'Drop your PDF or Image invoices here. Multiple files supported.'
                        : 'Take photos of fuel, food, or supply receipts.'}
                </p>
              </div>
              
              <div className="w-full max-w-xl">
                {mode === 'office' ? (
                    <InvoiceUploader onFileSelect={handleFileSelect} isProcessing={false} />
                ) : (
                    <ReceiptCapture onFileSelect={(f) => handleFileSelect([f])} isProcessing={false} />
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl mt-8 md:mt-12">
                 <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-slate-100 text-center">
                    <div className="text-xl md:text-2xl font-bold text-amix-blue mb-1">Fast</div>
                    <div className="text-[10px] md:text-xs text-slate-500 uppercase">Processing</div>
                 </div>
                 <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-slate-100 text-center">
                    <div className="text-xl md:text-2xl font-bold text-emerald-600 mb-1">Batch</div>
                    <div className="text-[10px] md:text-xs text-slate-500 uppercase">Upload Support</div>
                 </div>
                 <div className="hidden md:block bg-white p-4 rounded-lg shadow-sm border border-slate-100 text-center">
                    <div className="text-2xl font-bold text-amix-orange mb-1">Sync</div>
                    <div className="text-xs text-slate-500 uppercase">Cloud Storage</div>
                 </div>
              </div>
            </div>
          )}

          {/* BATCH PROCESSOR */}
          {view === 'batch' && (
              <BatchProcessor onClose={() => setView('dashboard')} />
          )}

          {/* MANAGER */}
          {view === 'manager' && (
              <ManagerDashboard onViewItem={handleHistorySelect} />
          )}

          {/* HISTORY */}
          {view === 'history' && (
              <HistoryView onSelectInvoice={handleHistorySelect} />
          )}

          {/* BATCH LOADING (Simple Loop) */}
          {status.step === 'batch-processing' && (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div className="text-amix-blue animate-spin">
                   <Icons.Loader />
                </div>
                <div className="text-center px-4">
                    <h3 className="text-xl font-semibold text-slate-800">
                        Batch Processing...
                    </h3>
                    <p className="text-slate-500 mt-2">
                        Analyzing document {status.batchProgress?.current} of {status.batchProgress?.total}
                    </p>
                    <div className="w-64 h-2 bg-slate-200 rounded-full mt-4 mx-auto overflow-hidden">
                        <div 
                            className="h-full bg-amix-blue transition-all duration-500"
                            style={{ width: `${((status.batchProgress?.current || 0) / (status.batchProgress?.total || 1)) * 100}%` }}
                        ></div>
                    </div>
                </div>
             </div>
          )}

          {/* SINGLE LOADING */}
          {view === 'editor' && (status.step === 'uploading' || status.step === 'analyzing') && (
             <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div className="text-amix-blue animate-spin">
                   <Icons.Loader />
                </div>
                <div className="text-center px-4">
                    <h3 className="text-xl font-semibold text-slate-800">
                        {status.step === 'uploading' ? 'Uploading...' : 'Gemini AI is reading details...'}
                    </h3>
                    <p className="text-slate-500 mt-2">
                        {mode === 'office' ? 'Extracting line items...' : 'Reading total and merchant...'}
                    </p>
                </div>
             </div>
          )}

          {/* ERROR */}
          {view === 'editor' && status.step === 'error' && (
             <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 px-4 text-center">
                <div className="text-red-500">
                    <Icons.AlertTriangle />
                </div>
                <h3 className="text-xl font-semibold text-red-600">Processing Failed</h3>
                <p className="text-slate-600 max-w-md">{status.message}</p>
                <button 
                    onClick={handleCancel}
                    className="px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-800 font-medium transition"
                >
                    Try Again
                </button>
             </div>
          )}

          {/* EDITOR */}
          {view === 'editor' && status.step === 'complete' && extractedData && (
             <div className="h-full md:h-[calc(100vh-100px)] flex gap-6 flex-col lg:flex-row">
                
                {/* Desktop Preview */}
                <div className="w-full lg:w-1/3 h-64 lg:h-full bg-slate-200 rounded-xl overflow-hidden relative shadow-inner flex-shrink-0">
                     {previewUrl && (
                        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm z-10">
                            Original
                        </div>
                    )}
                    {renderPreview()}
                </div>

                {/* Editor Form */}
                <div className="flex-1 h-full overflow-hidden">
                    {mode === 'office' ? (
                         <InvoiceEditor 
                            data={extractedData as ExtractedInvoiceData} 
                            onSave={handleSave as any}
                            onCancel={handleCancel}
                            isDuplicate={isDuplicate}
                        />
                    ) : (
                        <ReceiptForm 
                            data={extractedData as ReceiptData}
                            onSave={handleSave as any}
                            onCancel={handleCancel}
                            isDuplicate={isDuplicate}
                        />
                    )}
                </div>
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;