export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  costCode: string; // e.g., "PRJ-001", "EQP-MAINT"
  isTaxLine: boolean;
}

export interface ExtractedInvoiceData {
  id?: string; // Optional ID for history tracking
  type: 'invoice';
  vendorName: string;
  invoiceNumber: string;
  poNumber: string;
  projectNumber: string;
  invoiceDate: string;
  lineItems: LineItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  confidenceScore: number; // 0-100
}

export interface ReceiptData {
  id?: string;
  type: 'receipt';
  merchantName: string;
  date: string;
  totalAmount: number;
  taxAmount: number;
  description: string; // Summary of what was bought
  projectNumber: string;
  costCode: string; // Main category fallback
  lineItems: LineItem[]; // Detailed breakdown
}

export interface HistoryItem {
  id: string;
  fileName: string;
  uploadDate: string; // ISO string
  data: ExtractedInvoiceData | ReceiptData;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  previewImage?: string; // Base64 Data URI
  mimeType?: string; // Mime type for the preview
}

export interface ProcessingStatus {
  step: 'idle' | 'uploading' | 'analyzing' | 'batch-processing' | 'complete' | 'error';
  message?: string;
  batchProgress?: {
    current: number;
    total: number;
  };
}

export type AppMode = 'office' | 'field';

export enum CostCodeType {
  PROJECT_SPECIFIC = 'Project Specific',
  EQUIPMENT_MAINTENANCE = 'Equipment Maint',
  FUEL = 'Fuel',
  GENERAL_ADMIN = 'General Admin',
  SAFETY_GEAR = 'Safety Gear',
  SUBCONTRACTOR = 'Subcontractor',
  UNKNOWN = 'Unassigned'
}