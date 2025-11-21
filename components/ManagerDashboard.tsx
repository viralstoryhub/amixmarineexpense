import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { HistoryItem } from '../types';
import { Icons } from '../constants';

interface ManagerDashboardProps {
  onViewItem: (item: HistoryItem) => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onViewItem }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'analytics'>('queue');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHistory(StorageService.getHistory());
  }, []);

  const pendingItems = history.filter(item => item.status === 'Pending');
  
  const handleAction = (e: React.MouseEvent, id: string, action: 'Approved' | 'Rejected') => {
    e.stopPropagation();
    StorageService.updateStatus(id, action);
    setHistory(prev => prev.map(item => item.id === id ? { ...item, status: action } : item));
    // Remove from selection if processed
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    setSelectedIds(newSelected);
  };

  const handleBulkAction = (action: 'Approved' | 'Rejected') => {
    if (selectedIds.size === 0) return;
    
    const ids = Array.from(selectedIds) as string[];
    ids.forEach(id => {
        StorageService.updateStatus(id, action);
    });

    setHistory(prev => prev.map(item => ids.includes(item.id) ? { ...item, status: action } : item));
    setSelectedIds(new Set());
    alert(`Successfully ${action.toLowerCase()} ${ids.length} items.`);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
        newSelected.delete(id);
    } else {
        newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingItems.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(pendingItems.map(i => i.id)));
    }
  };

  const pendingTotal = pendingItems.reduce((acc, item) => {
    const amt = item.data.type === 'invoice' ? item.data.grandTotal : item.data.totalAmount;
    return acc + (amt || 0);
  }, 0);

  // --- Analytics Calculations ---
  const approvedItems = history.filter(item => item.status === 'Approved');
  
  const spendByProject: Record<string, number> = {};
  approvedItems.forEach(item => {
    const project = item.data.projectNumber || 'Unassigned';
    const amt = item.data.type === 'invoice' ? item.data.grandTotal : item.data.totalAmount;
    spendByProject[project] = (spendByProject[project] || 0) + (amt || 0);
  });

  // Find max value for bar scaling
  const maxProjectSpend = Math.max(...Object.values(spendByProject), 1);
  const sortedProjects = Object.entries(spendByProject).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
      {/* Header Stats */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">Manager Dashboard</h2>
            <p className="text-slate-500 mt-1">Review approvals and analyze project spend.</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 mt-4 md:mt-0">
            <button 
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'queue' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Approval Queue
                {pendingItems.length > 0 && <span className="ml-2 bg-amix-orange text-white text-xs px-1.5 py-0.5 rounded-full">{pendingItems.length}</span>}
            </button>
            <button 
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'analytics' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Spend Analytics
            </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
         <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Project Spend (Approved)</h3>
                {sortedProjects.length > 0 ? (
                    <div className="space-y-4">
                        {sortedProjects.map(([project, amount]) => (
                            <div key={project}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">{project}</span>
                                    <span className="text-slate-900 font-bold">${amount.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className="h-full bg-amix-blue rounded-full transition-all duration-1000"
                                        style={{ width: `${(amount / maxProjectSpend) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        No approved invoices yet. Approve items to see analytics.
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-medium text-slate-500 uppercase mb-2">Total Approved Spend</h4>
                    <div className="text-4xl font-bold text-slate-900">
                        ${approvedItems.reduce((acc, i) => acc + (i.data.type === 'invoice' ? i.data.grandTotal : i.data.totalAmount), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                     <h4 className="text-sm font-medium text-slate-500 uppercase mb-2">Approved Documents</h4>
                     <div className="text-4xl font-bold text-emerald-600">
                        {approvedItems.length}
                     </div>
                 </div>
            </div>
         </div>
      ) : (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium uppercase tracking-wider">Pending Items</div>
                    <div className="text-3xl font-bold text-slate-900 mt-2">{pendingItems.length}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium uppercase tracking-wider">Pending Value</div>
                    <div className="text-3xl font-bold text-amix-blue mt-2">${pendingTotal.toFixed(2)}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 bg-gradient-to-br from-amix-navy to-slate-800 text-white">
                    <div className="text-slate-300 text-sm font-medium uppercase tracking-wider">Action Required</div>
                    <div className="text-sm mt-2 text-slate-200">
                        {pendingItems.length > 0 ? "Please review the items below." : "All caught up! No pending approvals."}
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                        <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-xs">{selectedIds.size}</span>
                        Selected
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleBulkAction('Rejected')}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded shadow-sm transition"
                        >
                            Reject Selected
                        </button>
                        <button 
                            onClick={() => handleBulkAction('Approved')}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded shadow-sm transition"
                        >
                            Approve Selected
                        </button>
                    </div>
                </div>
            )}

            {pendingItems.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                        <Icons.CheckCircle />
                    </div>
                    <h3 className="text-xl font-medium text-slate-900">All Caught Up!</h3>
                    <p className="text-slate-500 mt-2">There are no pending invoices or receipts to approve.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider text-xs">
                            <tr>
                                <th className="p-4 w-8 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-amix-blue focus:ring-amix-blue cursor-pointer"
                                        checked={pendingItems.length > 0 && selectedIds.size === pendingItems.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Vendor / Merchant</th>
                                <th className="p-4">Project</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendingItems.map(item => (
                                <tr 
                                    key={item.id} 
                                    onClick={() => onViewItem(item)}
                                    className={`hover:bg-slate-50 transition cursor-pointer ${selectedIds.has(item.id) ? 'bg-blue-50/30' : ''}`}
                                >
                                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-amix-blue focus:ring-amix-blue cursor-pointer"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleSelection(item.id)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase 
                                            ${item.data.type === 'invoice' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-800'}`}>
                                            {item.data.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {new Date(item.uploadDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 font-medium text-slate-900">
                                        {item.data.type === 'invoice' ? item.data.vendorName : item.data.merchantName}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {item.data.projectNumber || '-'}
                                    </td>
                                    <td className="p-4 text-right font-bold text-slate-900">
                                        ${item.data.type === 'invoice' 
                                            ? item.data.grandTotal.toFixed(2) 
                                            : item.data.totalAmount.toFixed(2)
                                        }
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={(e) => handleAction(e, item.id, 'Rejected')}
                                                className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition"
                                            >
                                                Reject
                                            </button>
                                            <button 
                                                onClick={(e) => handleAction(e, item.id, 'Approved')}
                                                className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded shadow-sm transition"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default ManagerDashboard;