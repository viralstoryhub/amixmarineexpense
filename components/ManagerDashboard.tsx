import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import { HistoryItem, ProjectBudget } from '../types';
import { Icons } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ManagerDashboardProps {
    onViewItem: (item: HistoryItem) => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onViewItem }) => {
    const [activeTab, setActiveTab] = useState<'approvals' | 'analytics' | 'budgets'>('approvals');
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [budgets, setBudgets] = useState<ProjectBudget[]>([]);
    const [newBudgetProject, setNewBudgetProject] = useState('');
    const [newBudgetAmount, setNewBudgetAmount] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const allItems = StorageService.getHistory();
        setItems(allItems);

        // Load budgets (mocked for now, or stored in localStorage if we had a service for it)
        const savedBudgets = localStorage.getItem('amix_project_budgets');
        if (savedBudgets) {
            setBudgets(JSON.parse(savedBudgets));
        } else {
            // Default mock budgets
            setBudgets([
                { projectId: 'P-1001', budgetAmount: 50000, spentAmount: 0 },
                { projectId: 'P-2023-05', budgetAmount: 15000, spentAmount: 0 }
            ]);
        }
    };

    const handleStatusUpdate = (id: string, newStatus: 'Approved' | 'Rejected') => {
        StorageService.updateStatus(id, newStatus);
        loadData(); // Refresh
    };

    const handleAddBudget = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBudgetProject || !newBudgetAmount) return;

        const newBudget: ProjectBudget = {
            projectId: newBudgetProject,
            budgetAmount: Number(newBudgetAmount),
            spentAmount: 0
        };

        const updatedBudgets = [...budgets.filter(b => b.projectId !== newBudgetProject), newBudget];
        setBudgets(updatedBudgets);
        localStorage.setItem('amix_project_budgets', JSON.stringify(updatedBudgets));
        setNewBudgetProject('');
        setNewBudgetAmount('');
    };

    // --- ANALYTICS DATA PREP ---
    const approvedItems = items.filter(i => i.status === 'Approved');

    // 1. Spend by Category (Cost Code)
    const spendByCategory: Record<string, number> = {};
    approvedItems.forEach(item => {
        if (item.data.lineItems) {
            item.data.lineItems.forEach(line => {
                const code = line.costCode || 'Uncategorized';
                spendByCategory[code] = (spendByCategory[code] || 0) + (line.total || 0);
            });
        }
    });

    const pieData = Object.keys(spendByCategory).map(key => ({
        name: key,
        value: Number(spendByCategory[key].toFixed(2))
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    // 2. Spend by Project (for Budgets)
    const spendByProject: Record<string, number> = {};
    approvedItems.forEach(item => {
        // Try to find project ID from invoice data or user input
        // For this demo, we'll assume 'projectNumber' is the key
        const proj = (item.data as any).projectNumber || 'Unknown';
        spendByProject[proj] = (spendByProject[proj] || 0) + (item.data.totalAmount || 0);
    });

    // Merge spend into budgets for display
    const budgetDisplay = budgets.map(b => ({
        ...b,
        spentAmount: spendByProject[b.projectId] || 0,
        percent: Math.min(100, Math.round(((spendByProject[b.projectId] || 0) / b.budgetAmount) * 100))
    }));

    const handleExportExcel = () => {
        if (items.length === 0) return;
        // Export all items (or could filter to just approved)
        const exportData = items.map(i => i.data as any);
        ExcelService.exportBatch(exportData);
    };

    const handleExportPDF = () => {
        const approved = items.filter(i => i.status === 'Approved');
        if (approved.length === 0) {
            alert("No approved items to generate report for.");
            return;
        }
        ExcelService.generatePdfReport(approved);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Manager Dashboard</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition shadow-sm"
                    >
                        <Icons.FileText className="w-4 h-4" />
                        Export PDF Report
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition shadow-sm"
                    >
                        <Icons.Download className="w-4 h-4" />
                        Export Excel
                    </button>
                </div>
            </div>

            <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200 w-fit">
                <button
                    onClick={() => setActiveTab('approvals')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'approvals' ? 'bg-amix-blue text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Approvals
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'analytics' ? 'bg-amix-blue text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Spend Analytics
                </button>
                <button
                    onClick={() => setActiveTab('budgets')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'budgets' ? 'bg-amix-blue text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Project Budgets
                </button>
            </div>

            {/* TAB: APPROVALS */}
            {activeTab === 'approvals' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Vendor / Merchant</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Total</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Risk</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.filter(i => i.status === 'Pending').length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                            No pending items for approval.
                                        </td>
                                    </tr>
                                ) : (
                                    items.filter(i => i.status === 'Pending').map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 text-slate-600">{item.data.date}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {(item.data as any).vendorName || (item.data as any).merchantName}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                ${item.data.totalAmount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.data.type === 'invoice' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                                    {item.data.type === 'invoice' ? 'Invoice' : 'Receipt'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.data.riskFlags && item.data.riskFlags.length > 0 ? (
                                                    <div className="group relative flex items-center">
                                                        <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center cursor-help">
                                                            <Icons.AlertTriangle />
                                                        </div>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                                            {item.data.riskFlags.join(', ')}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-emerald-500">
                                                        <Icons.CheckCircle />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    Pending
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => onViewItem(item)}
                                                    className="text-slate-400 hover:text-amix-blue transition"
                                                    title="View Details"
                                                >
                                                    <Icons.FileText />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(item.id, 'Approved')}
                                                    className="text-emerald-500 hover:text-emerald-700 transition"
                                                    title="Approve"
                                                >
                                                    <Icons.CheckCircle />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(item.id, 'Rejected')}
                                                    className="text-red-400 hover:text-red-600 transition"
                                                    title="Reject"
                                                >
                                                    <Icons.Trash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: ANALYTICS */}
            {activeTab === 'analytics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Spend by Category</h3>
                        <div className="h-64 w-full">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400">
                                    No approved data yet.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Monthly Trend</h3>
                        <div className="h-64 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                            Chart coming soon...
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: BUDGETS */}
            {activeTab === 'budgets' && (
                <div className="space-y-6">
                    {/* Add Budget Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Set Project Budget</h3>
                        <form onSubmit={handleAddBudget} className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Project ID</label>
                                <input
                                    type="text"
                                    value={newBudgetProject}
                                    onChange={(e) => setNewBudgetProject(e.target.value)}
                                    placeholder="e.g. P-1001"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amix-blue focus:border-transparent"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Budget Amount ($)</label>
                                <input
                                    type="number"
                                    value={newBudgetAmount}
                                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                                    placeholder="50000"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amix-blue focus:border-transparent"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-amix-blue text-white font-bold rounded-lg hover:bg-blue-700 transition"
                            >
                                Add Budget
                            </button>
                        </form>
                    </div>

                    {/* Budget List */}
                    <div className="grid grid-cols-1 gap-4">
                        {budgetDisplay.map((budget) => (
                            <div key={budget.projectId} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">{budget.projectId}</h4>
                                        <p className="text-sm text-slate-500">Project Budget</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-slate-900">
                                            ${budget.spentAmount.toLocaleString()} <span className="text-slate-400 text-lg font-normal">/ ${budget.budgetAmount.toLocaleString()}</span>
                                        </div>
                                        <div className={`text-sm font-bold ${budget.percent > 90 ? 'text-red-500' : budget.percent > 75 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                            {budget.percent}% Used
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${budget.percent > 90 ? 'bg-red-500' : budget.percent > 75 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${budget.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}

                        {budgetDisplay.length === 0 && (
                            <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                                No active project budgets. Add one above.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerDashboard;