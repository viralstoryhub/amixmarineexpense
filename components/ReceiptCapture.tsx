import React, { useRef } from 'react';
import { Icons } from '../constants';

interface ReceiptCaptureProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const ReceiptCapture: React.FC<ReceiptCaptureProps> = ({ onFileSelect, isProcessing }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
        {/* Camera Button */}
        <button 
            onClick={() => !isProcessing && cameraInputRef.current?.click()}
            disabled={isProcessing}
            className="relative overflow-hidden w-full aspect-[4/3] bg-slate-800 hover:bg-slate-700 text-white rounded-2xl shadow-lg flex flex-col items-center justify-center transition-all active:scale-95"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <div className="bg-amix-orange p-5 rounded-full mb-3 shadow-lg z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
            <span className="font-bold text-lg z-10">Take Photo</span>
            <span className="text-slate-400 text-sm z-10">Use Camera</span>
            
            {/* Hidden Input for Camera */}
            <input 
                type="file" 
                ref={cameraInputRef} 
                className="hidden" 
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
            />
        </button>

        {/* Gallery Button */}
        <button 
             onClick={() => !isProcessing && galleryInputRef.current?.click()}
             disabled={isProcessing}
             className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2 active:bg-slate-100"
        >
             <Icons.Upload />
             <span>Upload from Gallery</span>
             
             {/* Hidden Input for Gallery */}
             <input 
                type="file" 
                ref={galleryInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
            />
        </button>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
            <p className="font-semibold mb-1">Site Tip:</p>
            Ensure the receipt is flat and well-lit. We'll automatically extract the total and merchant.
        </div>
    </div>
  );
};

export default ReceiptCapture;