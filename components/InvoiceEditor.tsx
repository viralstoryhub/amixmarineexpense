import React, { useState, useEffect } from 'react';
import { ExtractedInvoiceData, LineItem } from '../types';
import { MOCK_COST_CODES, Icons } from '../constants';
import CostCodeSelect from './CostCodeSelect';
import { ExcelService } from '../services/excelService';

interface InvoiceEditorProps {
  data: ExtractedInvoiceData;
  onSave: (data: ExtractedInvoiceData) => void;
  onCancel: () => void;
  isDuplicate?: boolean;
}

const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ data, onSave, onCancel, isDuplicate = false }) => {
  const [formData, setFormData] = useState<ExtractedInvoiceData>(data);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleHeaderChange = (field: keyof ExtractedInvoiceData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setFormData(prev => {
      const updatedLines = prev.lineItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = Number((updatedItem.quantity * updatedItem.unitPrice).toFixed(2));
          }
          return updatedItem;
        }
        return item;
      });
      
      const newSub = updatedLines.reduce((acc, item) => item.isTaxLine ? acc : acc + item.total, 0);
      const taxLinesSum = updatedLines.reduce((acc, item) => item.isTaxLine ? acc + item.total : acc, 0);
      const newTaxTotal = taxLinesSum > 0 ? taxLinesSum : prev.taxTotal;

      return {
        ...prev,
        lineItems: updatedLines,
        subtotal: Number(newSub.toFixed(2)),
        taxTotal: Number(newTaxTotal.toFixed(2)),
        grandTotal: Number((newSub + newTaxTotal).toFixed(2))
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
      costCode: "",
      isTaxLine: false
    };
    setFormData(prev => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
  };

  const confirmDelete = (id: string) => setItemToDelete(id);
  const cancelDelete = () => setItemToDelete(null);
  const executeDelete = () => {
    if (itemToDelete) {
        setFormData(prev => {
            const updatedLines = prev.lineItems.filter(l => l.id !== itemToDelete);
            const newSub = updatedLines.reduce((acc, item) => item.isTaxLine ? acc : acc + item.total, 0);
            const taxLinesSum = updatedLines.reduce((acc, item) => item.isTaxLine ? acc + item.total : acc, 0);
            const newTaxTotal = taxLinesSum > 0 ? taxLinesSum : prev.taxTotal;
            return { ...prev, lineItems: updatedLines, subtotal: Number(newSub.toFixed(2)), taxTotal: Number(newTaxTotal.toFixed(2)), grandTotal: Number((newSub + newTaxTotal).toFixed(2)) };
        });
        setItemToDelete(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full relative">
      <div className="bg-amix-navy text-white p-4 flex justify-between items-center z-10 relative shadow-md">
        <div className="flex items-center gap-2">
          <Icons.FileText />
          <h2 className="font-semibold">Review Extracted Data</h2>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => ExcelService.exportSingle(formData)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition border border-white/10"
            title="Download as Excel"
          >
            <Icons.Download /> <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition">Cancel</button>
          <button 
            onClick={() => onSave(formData)}
            className="bg-amix-orange hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <Icons.CheckCircle /> Submit for Approval
          </button>
        </div>
      </div>
      
      {isDuplicate && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 text-amber-800">
            <Icons.AlertTriangle />
            <div>
                <p className="font-bold text-sm">Potential Duplicate Detected</p>
                <p className="text-xs text-amber-700">An invoice from {formData.vendorName} with number {formData.invoiceNumber} already exists in history.</p>
            </div>
        </div>
      )}

      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 pb-40">
        {/* General Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Vendor</label>
            <input 
              type="text" 
              value={formData.vendorName} 
              onChange={(e) => handleHeaderChange('vendorName', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amix-blue outline-none font-medium text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Invoice #</label>
            <input 
              type="text" 
              value={formData.invoiceNumber} 
              onChange={(e) => handleHeaderChange('invoiceNumber', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amix-blue outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Date</label>
            <input 
              type="date" 
              value={formData.invoiceDate} 
              onChange={(e) => handleHeaderChange('invoiceDate', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amix-blue outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">PO Number</label>
            <input 
              type="text" 
              value={formData.poNumber || ''} 
              onChange={(e) => handleHeaderChange('poNumber', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amix-blue outline-none"
              placeholder="Optional"
            />
          </div>
          <div className="md:col-span-2">
             <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Project Assignment</label>
             <select
                value={formData.projectNumber || ''}
                onChange={(e) => handleHeaderChange('projectNumber', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amix-blue outline-none"
             >
                <option value="">Select a Project...</option>
                {MOCK_COST_CODES.filter(c => c.code.startsWith('AMIX')).map(p => (
                    <option key={p.code} value={p.code}>{p.code} - {p.description}</option>
                ))}
                <option value="overhead">OVERHEAD - General</option>
             </select>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
             <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Line Items Breakdown</h3>
             <button onClick={addLineItem} className="text-xs flex items-center gap-1 text-amix-blue hover:underline">
                <Icons.Plus /> Add Line
             </button>
          </div>
          
          <div className="border rounded-lg relative overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[1000px]">
              <thead className="bg-slate-100 border-b text-slate-500 font-medium">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3 min-w-[400px]">Description</th>
                  <th className="p-3 w-16 text-center" title="Check if this line is a tax (e.g. GST)">Tax?</th>
                  <th className="p-3 w-24 text-right">Qty</th>
                  <th className="p-3 w-32 text-right">Unit Price</th>
                  <th className="p-3 w-32 text-right">Total</th>
                  <th className="p-3 w-56">Cost Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.lineItems.map((item) => (
                  <tr key={item.id} className={`group hover:bg-slate-50 transition ${item.isTaxLine ? 'bg-blue-50/50' : ''}`}>
                    <td className="p-2 text-center">
                        <button 
                            onClick={() => confirmDelete(item.id)} 
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                            title="Remove item"
                        >
                            <Icons.Trash />
                        </button>
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={item.description} 
                        onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        className={`w-full bg-transparent outline-none focus:border-b border-amix-blue ${item.isTaxLine ? 'italic text-slate-600' : ''}`}
                      />
                    </td>
                    <td className="p-2 text-center">
                        <input 
                            type="checkbox"
                            checked={item.isTaxLine}
                            onChange={(e) => handleLineItemChange(item.id, 'isTaxLine', e.target.checked)}
                            className="w-4 h-4 text-amix-blue rounded border-slate-300 focus:ring-amix-blue cursor-pointer accent-amix-blue"
                        />
                    </td>
                    <td className="p-2 text-right">
                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                        className="w-full text-right bg-transparent outline-none focus:border-b border-amix-blue"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input 
                        type="number" 
                        value={item.unitPrice} 
                        onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                        className="w-full text-right bg-transparent outline-none focus:border-b border-amix-blue"
                      />
                    </td>
                    <td className="p-2 text-right font-medium text-slate-700">
                      ${item.total.toFixed(2)}
                    </td>
                    <td className="p-2">
                      <CostCodeSelect
                        value={item.costCode || ''}
                        onChange={(val) => handleLineItemChange(item.id, 'costCode', val)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Totals */}
        <div className="flex justify-end">
          <div className="w-64 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex justify-between mb-2 text-slate-600 text-sm">
              <span>Subtotal</span>
              <span>${formData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-slate-600 text-sm">
              <span>Tax</span>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-slate-400 mr-1">$</span>
                <input 
                    type="number" 
                    value={formData.taxTotal} 
                    onChange={(e) => handleHeaderChange('taxTotal', parseFloat(e.target.value))}
                    className="w-20 text-right bg-white border border-slate-300 rounded px-1 py-0.5 text-xs font-medium"
                />
              </div>
            </div>
            <div className="border-t border-slate-200 my-2"></div>
            <div className="flex justify-between font-bold text-slate-900 text-lg">
              <span>Total</span>
              <span>${formData.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <div className="p-2 bg-red-50 rounded-full">
                        <Icons.Trash />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Line Item?</h3>
                </div>
                
                <p className="text-slate-600 mb-6 text-sm">
                    Are you sure you want to remove this line item? This will affect the subtotal and total calculations.
                </p>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={cancelDelete}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={executeDelete}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition shadow-sm"
                    >
                        Delete Item
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceEditor;