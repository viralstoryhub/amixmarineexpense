import React, { useState, useRef } from 'react';
import { Icons } from '../constants';
import { ExtractedInvoiceData } from '../types';
import { extractInvoiceData } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';

interface BatchProcessorProps {
  onClose: () => void;
}

interface BatchFileStatus {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMsg?: string;
  data?: ExtractedInvoiceData;
}

// Increased delay to 10 seconds to be safe (approx 6 requests/min)
const DELAY_MS = 10000; 

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onClose }) => {
  const [queue, setQueue] = useState<BatchFileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Keep track of processed data for the bulk export
  const [completedData, setCompletedData] = useState<ExtractedInvoiceData[]>([]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: BatchFileStatus[] = Array.from(e.target.files).map((f: File) => ({
        id: crypto.randomUUID(),
        file: f,
        status: 'pending'
      }));
      setQueue(prev => [...prev, ...newFiles]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
            const base64 = result.split(',')[1];
            resolve(base64);
        } else {
            reject(new Error("Failed to read file as base64 string"));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const processQueue = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Identify files that need processing (pending OR previously failed due to rate limits)
    const currentQueue = [...queue];
    const filesToProcessIndices = currentQueue
        .map((item, index) => (item.status === 'pending' || item.errorMsg?.includes('Rate Limit')) ? index : -1)
        .filter(index => index !== -1);

    for (let i = 0; i < filesToProcessIndices.length; i++) {
      const index = filesToProcessIndices[i];
      const item = currentQueue[index];
      
      // Mark as processing
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing', errorMsg: undefined } : q));

      let attempt = 0;
      const maxRetries = 3;
      let success = false;

      // Retry Loop
      while (attempt <= maxRetries && !success) {
        try {
            const base64 = await fileToBase64(item.file);
            const data = await extractInvoiceData(base64, item.file.type);
            StorageService.saveInvoice(data, item.file.name, base64, item.file.type);

            // Success
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', data: data } : q));
            setCompletedData(prev => [...prev, data]);
            setProcessedCount(prev => prev + 1);
            success = true;

        } catch (err: any) {
            attempt++;
            console.error(`Error processing ${item.file.name} (Attempt ${attempt}):`, err);
            
            const isRateLimit = err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'));

            if (isRateLimit && attempt <= maxRetries) {
                // Exponential Backoff: 20s, 40s, 60s
                const backoffTime = 20000 * attempt;
                
                setQueue(prev => prev.map(q => q.id === item.id ? { 
                    ...q, 
                    status: 'processing', 
                    errorMsg: `Rate Limit Hit... Waiting ${backoffTime/1000}s (Retry ${attempt}/${maxRetries})` 
                } : q));
                
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            } else {
                // Final Failure
                const finalMsg = isRateLimit ? 'Failed: Rate Limit Exceeded' : (err.message || 'Extraction Failed');
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', errorMsg: finalMsg } : q));
                break; // Exit retry loop
            }
        }
      }

      // Standard Throttle Delay between successful files to maintain safe RPM
      if (i < filesToProcessIndices.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    setIsProcessing(false);
  };

  const handleExportBatch = () => {
    ExcelService.exportBatch(completedData);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">Batch Invoice Processor</h2>
            <p className="text-slate-500 text-sm">Optimized for 200+ documents. Auto-throttled (10s delay) to prevent API errors.</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-800">Close</button>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="flex items-center gap-4 w-full md:w-auto">
            <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFiles}
                accept="application/pdf,image/*"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-2 transition disabled:opacity-50"
            >
                <Icons.Plus /> Add Files
            </button>
            <div className="text-sm text-slate-500">
                {queue.length} files queued
            </div>
         </div>

         <div className="flex gap-3 w-full md:w-auto">
            {completedData.length > 0 && (
                <button 
                    onClick={handleExportBatch}
                    className="flex-1 md:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 justify-center transition shadow-sm"
                >
                    <Icons.Download /> Export Results ({completedData.length})
                </button>
            )}
            <button 
                onClick={processQueue}
                disabled={isProcessing || queue.filter(q => q.status === 'pending' || q.errorMsg?.includes('Rate Limit')).length === 0}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-white transition shadow-md
                    ${isProcessing 
                        ? 'bg-slate-400 cursor-not-allowed' 
                        : 'bg-amix-blue hover:bg-blue-900'
                    }`}
            >
                {isProcessing ? 'Processing...' : 'Start Batch'}
            </button>
         </div>
      </div>

      {/* File List / Terminal */}
      <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden shadow-inner flex flex-col font-mono text-sm">
         <div className="bg-slate-800 p-3 text-slate-400 border-b border-slate-700 flex justify-between items-center">
             <span>Process Log</span>
             {isProcessing && <span className="text-amix-orange animate-pulse">● Processing Active</span>}
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {queue.length === 0 && (
                <div className="text-slate-600 text-center mt-20">No files added to queue.</div>
            )}
            {queue.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3">
                    <span className="text-slate-500 w-8 text-right">{idx + 1}.</span>
                    <span className="text-slate-300 truncate w-64">{item.file.name}</span>
                    <span className="flex-1 h-px bg-slate-800"></span>
                    <span className={`uppercase text-xs font-bold min-w-[100px] text-right
                        ${item.status === 'pending' ? 'text-slate-500' : ''}
                        ${item.status === 'processing' ? 'text-blue-400' : ''}
                        ${item.status === 'completed' ? 'text-green-400' : ''}
                        ${item.status === 'error' ? 'text-red-400' : ''}
                    `}>
                        {item.status}
                    </span>
                    {item.errorMsg && (
                        <span className="text-amix-orange text-xs max-w-[250px] truncate pl-2" title={item.errorMsg}>
                            {item.errorMsg}
                        </span>
                    )}
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default BatchProcessor;