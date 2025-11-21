import React, { useRef } from 'react';
import { Icons } from '../constants';

interface InvoiceUploaderProps {
  onFileSelect: (files: File[]) => void;
  isProcessing: boolean;
}

const InvoiceUploader: React.FC<InvoiceUploaderProps> = ({ onFileSelect, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
        ${isProcessing ? 'border-amix-orange bg-orange-50 opacity-50 cursor-not-allowed' : 'border-amix-blue/30 hover:border-amix-orange hover:bg-slate-100 bg-white shadow-sm'}
      `}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/png, image/jpeg, image/jpg, application/pdf"
        multiple
        onChange={handleFileChange}
        disabled={isProcessing}
      />
      
      <div className="bg-blue-50 p-4 rounded-full mb-4 text-amix-blue">
        <Icons.Upload />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-800 mb-1">
        {isProcessing ? 'Processing...' : 'Upload Invoices or Receipts'}
      </h3>
      <p className="text-slate-500 text-sm max-w-xs">
        Drag & drop multiple files here, or click to browse. 
        <br/>Supports PDF, PNG, JPG.
      </p>
    </div>
  );
};

export default InvoiceUploader;