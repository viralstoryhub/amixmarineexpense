import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  },

  // Generate PDF Report with Images
  generatePdfReport: async (invoices: any[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(20);
    doc.text("Amix Marine Expense Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Total Items: ${invoices.length}`, 14, 33);

    let yPos = 45;

    // Summary Table
    const tableData = invoices.map(inv => [
      inv.data.date || inv.data.invoiceDate,
      inv.data.vendorName || inv.data.merchantName,
      inv.data.projectNumber || '-',
      `$${(inv.data.grandTotal || inv.data.totalAmount || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Vendor', 'Project', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Add Images on subsequent pages
    invoices.forEach((inv, index) => {
      doc.addPage();
      doc.setFontSize(14);
      doc.text(`Item #${index + 1}: ${inv.data.vendorName || inv.data.merchantName}`, 14, 20);

      doc.setFontSize(10);
      doc.text(`Date: ${inv.data.date || inv.data.invoiceDate}`, 14, 30);
      doc.text(`Total: $${(inv.data.grandTotal || inv.data.totalAmount || 0).toFixed(2)}`, 14, 36);

      if (inv.previewImage) {
        try {
          // Add image fitting within margins
          const imgProps = doc.getImageProperties(inv.previewImage);
          const pdfWidth = pageWidth - 28;
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

          doc.addImage(inv.previewImage, 'JPEG', 14, 45, pdfWidth, pdfHeight);
        } catch (e) {
          doc.text("(Image could not be loaded)", 14, 50);
        }
      } else {
        doc.text("(No image attached)", 14, 50);
      }
    });

    doc.save(`Amix_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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