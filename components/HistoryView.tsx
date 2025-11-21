import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { HistoryItem } from '../types';
import { Icons } from '../constants';

interface HistoryViewProps {
  onSelectInvoice: (item: HistoryItem) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onSelectInvoice }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setHistory(StorageService.getHistory());
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredHistory = history.filter(item => {
    const term = searchTerm.toLowerCase();
    
    let name = '';
    let identifier = '';

    if (item.data.type === 'invoice') {
      name = item.data.vendorName || '';
      identifier = item.data.invoiceNumber || '';
    } else {
      name = item.data.merchantName || '';
      // Receipts usually don't have an invoice number, but we can search by description if needed
      identifier = item.data.description || '';
    }

    return name.toLowerCase().includes(term) || identifier.toLowerCase().includes(term);
  });

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Invoice History</h2>
          <p className="text-slate-500 mt-1">Recent uploads from the last 30 days. Data stored locally.</p>
        </div>
        
        {/* Search Bar */}
        {history.length > 0 && (
          <div className="relative w-full md:w-72">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Icons.Search />
             </div>
             <input
                type="text"
                placeholder="Search vendor or invoice #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amix-blue focus:border-transparent text-sm shadow-sm"
             />
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Icons.History />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No History Found</h3>
          <p className="text-slate-500 mt-2">Upload your first invoice to see it here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date Uploaded</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50 transition cursor-pointer group"
                      onClick={() => onSelectInvoice(item)}
                    >
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${item.status === 'Approved' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="flex items-center gap-2">
                           <Icons.Clock />
                           {formatDate(item.uploadDate)}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {item.data.type === 'invoice' 
                          ? (item.data.vendorName || 'Unknown Vendor')
                          : (item.data.merchantName || 'Unknown Merchant')}
                      </td>
                      <td className="p-4 text-slate-600">
                        {item.data.type === 'invoice' ? (item.data.invoiceNumber || '-') : 'Receipt'}
                      </td>
                      <td className="p-4 text-right font-medium text-slate-900">
                        ${(item.data.type === 'invoice' ? item.data.grandTotal : item.data.totalAmount)?.toFixed(2) || '0.00'}
                      </td>
                      <td className="p-4 text-right text-slate-400 group-hover:text-amix-blue">
                        <Icons.ChevronRight />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No invoices found matching "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;