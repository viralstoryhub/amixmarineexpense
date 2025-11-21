import * as XLSX from 'xlsx';
import { ExtractedInvoiceData } from '../types';

export const ExcelService = {
  // Export a single invoice to Excel
  exportSingle: (data: ExtractedInvoiceData) => {
    const rows = flattenInvoiceData(data);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice Data");
    
    const filename = `${data.vendorName || 'Vendor'} - ${data.invoiceNumber || 'Invoice'}.xlsx`;
    XLSX.writeFile(workbook, filename);
  },

  // Export multiple invoices into a structured report
  exportBatch: (invoices: ExtractedInvoiceData[]) => {
    if (invoices.length === 0) return;

    // --- SHEET 1: Detailed Visual Report (Sectioned out) ---
    const reportRows: any[][] = [];

    // Add a main Title Row
    reportRows.push(["AMIX MARINE - BATCH INVOICE EXPORT", "", "", "", "", "", ""]);
    reportRows.push([`Generated: ${new Date().toLocaleDateString()}`, "", "", "", "", "", ""]);
    reportRows.push([]); // Spacer

    invoices.forEach(inv => {
      // 1. Invoice Header Section
      // We layout the header info in a readable block
      reportRows.push(["VENDOR:", inv.vendorName, "", "DATE:", inv.invoiceDate, "INVOICE #:", inv.invoiceNumber]);
      reportRows.push(["PROJECT:", inv.projectNumber, "", "PO #:", inv.poNumber, "STATUS:", "Processed"]);
      reportRows.push(["", "", "", "SUBTOTAL:", inv.subtotal, "TAX:", inv.taxTotal, "TOTAL:", inv.grandTotal]);
      
      // 2. Line Items Header
      // Indented by one column for visual hierarchy
      reportRows.push([
        "", // Spacer column
        "DESCRIPTION",
        "QUANTITY",
        "UNIT PRICE",
        "LINE TOTAL",
        "COST CODE",
        "TAX LINE?"
      ]);

      // 3. Line Items Data
      if (inv.lineItems && inv.lineItems.length > 0) {
        inv.lineItems.forEach(item => {
          reportRows.push([
            "", // Spacer column
            item.description,
            item.quantity,
            item.unitPrice,
            item.total,
            item.costCode,
            item.isTaxLine ? "Yes" : ""
          ]);
        });
      } else {
        reportRows.push(["", "(No line items extracted or receipt summary only)"]);
      }

      // 4. Section Spacer (3 empty rows to separate invoices clearly)
      reportRows.push([]);
      reportRows.push([]);
      reportRows.push([]);
      // Add a visual separator line (optional, just represented by text in CSV/Basic XLS)
      reportRows.push(["------------------------------------------------------------------------------------------------"]);
      reportRows.push([]);
    });

    const reportSheet = XLSX.utils.aoa_to_sheet(reportRows);

    // --- SHEET 2: Master Flat Data (For Pivot Tables/Imports) ---
    const allRows = invoices.flatMap(inv => flattenInvoiceData(inv));
    const masterSheet = XLSX.utils.json_to_sheet(allRows);

    // --- Create Workbook ---
    const workbook = XLSX.utils.book_new();
    
    // "Detailed Report" is the first tab users see
    XLSX.utils.book_append_sheet(workbook, reportSheet, "Detailed Report");
    // "Flat Data" is the second tab for machine processing
    XLSX.utils.book_append_sheet(workbook, masterSheet, "Flat Data");

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Amix_Batch_Export_${dateStr}_(${invoices.length}_Docs).xlsx`);
  }
};

// Helper to flatten hierarchical data for the "Flat Data" sheet
const flattenInvoiceData = (data: ExtractedInvoiceData) => {
  return (data.lineItems || []).map(item => ({
    "Vendor Name": data.vendorName,
    "Invoice Number": data.invoiceNumber,
    "Invoice Date": data.invoiceDate,
    "PO Number": data.poNumber,
    "Project Assignment": data.projectNumber,
    "Subtotal": data.subtotal,
    "Tax Total": data.taxTotal,
    "Grand Total": data.grandTotal,
    "Item Description": item.description,
    "Quantity": item.quantity,
    "Unit Price": item.unitPrice,
    "Line Total": item.total,
    "Cost Code": item.costCode,
    "Tax Line?": item.isTaxLine ? "Yes" : "No"
  }));
};