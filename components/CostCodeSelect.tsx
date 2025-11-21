import React, { useState, useEffect, useRef } from 'react';
import { MOCK_COST_CODES } from '../constants';

interface CostCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const CostCodeSelect: React.FC<CostCodeSelectProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = MOCK_COST_CODES.filter(item =>
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = MOCK_COST_CODES.find(c => c.code === value);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Trigger Button */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchTerm('');
        }}
        className={`w-full flex items-center justify-between px-2 py-1.5 text-xs border rounded bg-white cursor-pointer transition-all
          ${isOpen 
            ? 'border-amix-blue ring-1 ring-amix-blue z-20 relative' 
            : 'border-slate-200 hover:border-amix-orange'
          }
        `}
      >
        <span className={`truncate block ${!value ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
           {selectedOption ? selectedOption.code : 'Select Code...'}
        </span>
        <svg 
          className={`w-3 h-3 text-slate-400 flex-shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <input
              ref={inputRef}
              type="text"
              className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-amix-blue focus:ring-1 focus:ring-amix-blue"
              placeholder="Search code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Options List */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
             {filteredOptions.length > 0 ? (
                filteredOptions.map(option => (
                  <div
                    key={option.code}
                    onClick={() => {
                      onChange(option.code);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2.5 cursor-pointer transition-colors border-b border-slate-50 last:border-0 group
                      ${value === option.code ? 'bg-blue-50' : 'hover:bg-slate-50'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                       <span className={`text-xs font-bold ${value === option.code ? 'text-amix-blue' : 'text-slate-700'}`}>
                         {option.code}
                       </span>
                       {value === option.code && <span className="text-amix-blue text-xs">✓</span>}
                    </div>
                    <div className="text-xs text-slate-500 group-hover:text-slate-700 truncate">
                      {option.description}
                    </div>
                  </div>
                ))
             ) : (
                <div className="p-4 text-center text-slate-400 text-xs italic">
                   No cost codes found matching "{searchTerm}"
                </div>
             )}
          </div>
          
          {/* Footer */}
          <div className="bg-slate-50 p-1.5 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            Showing {filteredOptions.length} codes
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCodeSelect;