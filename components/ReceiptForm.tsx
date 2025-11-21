import React, { useState } from 'react';
import { ReceiptData, LineItem } from '../types';
import { MOCK_COST_CODES, Icons } from '../constants';
import { StorageService } from '../services/storageService';

interface ReceiptFormProps {
    data: ReceiptData;
    onSave: (data: ReceiptData) => void;
    onCancel: () => void;
    isDuplicate?: boolean;
}

const ReceiptForm: React.FC<ReceiptFormProps> = ({ data, onSave, onCancel, isDuplicate = false }) => {
    const [formData, setFormData] = useState<ReceiptData>(data);

    const handleChange = (field: keyof ReceiptData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
        setFormData(prev => {
            const updatedLines = (prev.lineItems || []).map(item => {
                if (item.id === id) {
                    const updatedItem = { ...item, [field]: value };
                    if (field === 'quantity' || field === 'unitPrice') {
                        updatedItem.total = Number((updatedItem.quantity * updatedItem.unitPrice).toFixed(2));
                    }
                    return updatedItem;
                }
                return item;
            });

            // Recalculate Total & Tax based on line items
            // Logic: Sum of all lines is the total. 
            // Sum of lines marked 'isTaxLine' is the tax amount.
            const newTotal = updatedLines.reduce((acc, item) => acc + (item.total || 0), 0);
            const newTax = updatedLines.reduce((acc, item) => item.isTaxLine ? acc + (item.total || 0) : acc, 0);

            return {
                ...prev,
                lineItems: updatedLines,
                totalAmount: Number(newTotal.toFixed(2)),
                taxAmount: Number(newTax.toFixed(2))
            };
        });
    };

    const addLineItem = () => {
        const newItem: LineItem = {
            id: crypto.randomUUID(),
            description: "New Item",
            quantity: 1,
            unitPrice: 0,
            total: 0,
            costCode: formData.costCode || "",
            isTaxLine: false
        };
        setFormData(prev => ({
            ...prev,
            lineItems: [...(prev.lineItems || []), newItem]
        }));
    };

    const removeLineItem = (id: string) => {
        setFormData(prev => ({
            ...prev,
            lineItems: prev.lineItems.filter(l => l.id !== id)
        }));
    };

    const handleSaveDraft = () => {
        StorageService.saveInvoice(formData, "Receipt Draft");
        onCancel();
    };

    return (
        <div className="bg-white md:rounded-xl shadow-lg flex flex-col h-full md:h-auto md:max-w-lg mx-auto overflow-hidden">
            {/* Mobile Header */}
            <div className="bg-amix-navy text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg">Edit Receipt</h2>
                </div>
                <button onClick={onCancel} className="text-slate-300 text-sm px-2">Close</button>
            </div>

            {/* Duplicate Warning */}
            {isDuplicate && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3 text-amber-800">
                    <div className="text-amber-600"><Icons.AlertTriangle /></div>
                    <div className="text-xs">
                        <p className="font-bold">Potential Duplicate</p>
                        <p>Similar receipt found in history.</p>
                    </div>
                </div>
            )}

            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50 md:bg-white custom-scrollbar">

                {/* Total Card - Prominent */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</label>
                    <div className="flex items-center text-4xl font-bold text-slate-900">
                        <span className="text-2xl text-slate-400 mr-1">$</span>
                        <input
                            type="number"
                            value={formData.totalAmount}
                            onChange={(e) => handleChange('totalAmount', parseFloat(e.target.value))}
                            className="w-32 text-center focus:outline-none border-b-2 border-transparent focus:border-amix-blue bg-transparent text-slate-900"
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                        <span className="text-slate-500">Tax included:</span>
                        <input
                            type="number"
                            value={formData.taxAmount || 0}
                            onChange={(e) => handleChange('taxAmount', parseFloat(e.target.value))}
                            className="w-16 text-right border-b border-slate-300 focus:border-amix-blue outline-none bg-white text-slate-900"
                        />
                    </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Merchant / Store</label>
                        <input
                            type="text"
                            value={formData.merchantName}
                            onChange={(e) => handleChange('merchantName', e.target.value)}
                            className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amix-blue focus:border-transparent outline-none"
                            placeholder="e.g. Home Depot"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amix-blue outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                            <select
                                value={formData.projectNumber || ''}
                                onChange={(e) => handleChange('projectNumber', e.target.value)}
                                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amix-blue outline-none"
                            >
                                <option value="">Project...</option>
                                {MOCK_COST_CODES.filter(c => c.code.startsWith('AMIX')).map(p => (
                                    <option key={p.code} value={p.code}>{p.code}</option>
                                ))}
                                <option value="overhead">General</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description / Notes</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            rows={2}
                            className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amix-blue outline-none"
                            placeholder="What was purchased?"
                        />
                    </div>
                </div>

                {/* Line Items Breakdown - Mobile Friendly List */}
                <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-800">Itemized Breakdown</h3>
                        <button onClick={addLineItem} className="text-xs text-amix-blue font-medium flex items-center gap-1 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">
                            <Icons.Plus /> Add Item
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(formData.lineItems || []).map((item) => (
                            <div key={item.id} className={`border rounded-lg p-3 shadow-sm relative transition-colors ${item.isTaxLine ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-200'}`}>
                                <button
                                    onClick={() => removeLineItem(item.id)}
                                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1"
                                >
                                    <Icons.Trash />
                                </button>

                                {/* Item Description */}
                                <div className="mr-6 mb-2">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                                        className="w-full font-medium text-slate-900 border-b border-transparent hover:border-slate-200 focus:border-amix-blue focus:outline-none bg-transparent placeholder-slate-400"
                                        placeholder="Item Name"
                                    />
                                </div>

                                {/* Grid for Qty, Cost Code, Total, Tax */}
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-slate-400 uppercase block mb-0.5">Category</label>
                                        <select
                                            value={item.costCode || ''}
                                            onChange={(e) => handleLineItemChange(item.id, 'costCode', e.target.value)}
                                            className="w-full text-xs p-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
                                        >
                                            <option value="">Category...</option>
                                            {MOCK_COST_CODES.map(c => (
                                                <option key={c.code} value={c.code}>{c.description}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Tax Checkbox */}
                                    <div className="flex flex-col items-center">
                                        <label className="text-[10px] text-slate-400 uppercase block mb-0.5">Tax?</label>
                                        <input
                                            type="checkbox"
                                            checked={item.isTaxLine}
                                            onChange={(e) => handleLineItemChange(item.id, 'isTaxLine', e.target.checked)}
                                            className="w-4 h-4 text-amix-blue rounded border-slate-300 focus:ring-amix-blue"
                                        />
                                    </div>

                                    <div className="w-20">
                                        <label className="text-[10px] text-slate-400 uppercase block mb-0.5 text-right">Amount</label>
                                        <input
                                            type="number"
                                            value={item.total}
                                            onChange={(e) => handleLineItemChange(item.id, 'total', parseFloat(e.target.value))}
                                            className="w-full text-right font-semibold text-slate-900 text-sm border-b border-transparent focus:border-amix-blue bg-transparent outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {(formData.lineItems || []).length === 0 && (
                            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                                No items listed. <br />
                                <button onClick={addLineItem} className="text-amix-blue font-medium hover:underline">Add items manually</button> or use the total above.
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-3 gap-3 sticky bottom-0 z-20">
                <button
                    onClick={onCancel}
                    className="py-3 text-slate-600 font-medium bg-slate-100 rounded-xl hover:bg-slate-200 transition text-sm"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSaveDraft}
                    className="py-3 text-amix-blue font-medium bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition text-sm"
                >
                    Save Draft
                </button>
                <button
                    onClick={() => onSave(formData)}
                    className="py-3 text-white font-medium bg-amix-orange rounded-xl hover:bg-orange-600 transition shadow-lg shadow-orange-200 text-sm"
                >
                    Submit
                </button>
            </div>
        </div>
    );
};

export default ReceiptForm;