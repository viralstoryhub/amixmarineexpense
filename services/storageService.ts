import { ExtractedInvoiceData, ReceiptData, HistoryItem } from '../types';

const STORAGE_KEY = 'amix_invoice_history';
const RETENTION_DAYS = 30;

export const StorageService = {
  saveInvoice: (data: ExtractedInvoiceData | ReceiptData, fileName: string, base64Data?: string, mimeType?: string): void => {
    const history = StorageService.getHistory();
    
    // Robust ID handling
    const id = data.id || crypto.randomUUID();
    
    // Check if item already exists
    const existingItem = history.find(h => h.id === id);
    const finalFileName = existingItem ? existingItem.fileName : fileName;
    
    let finalPreview = existingItem?.previewImage;
    let finalMime = existingItem?.mimeType;

    if (base64Data && mimeType) {
        finalPreview = `data:${mimeType};base64,${base64Data}`;
        finalMime = mimeType;
    }

    const newItem: HistoryItem = {
      id: id,
      fileName: finalFileName,
      uploadDate: new Date().toISOString(),
      data: { ...data, id: id }, 
      status: existingItem ? existingItem.status : 'Draft',
      previewImage: finalPreview,
      mimeType: finalMime
    };

    const filteredHistory = history.filter(h => h.id !== newItem.id);
    const updatedHistory = [newItem, ...filteredHistory];
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.warn("Storage quota exceeded, attempting to save without image preview.", e);
      
      // Fallback: Save without the base64 image if storage is full
      if (newItem.previewImage) {
          const fallbackItem = { ...newItem, previewImage: undefined, mimeType: undefined };
          const fallbackHistory = [fallbackItem, ...filteredHistory];
          try {
             localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackHistory));
             console.log("Successfully saved invoice data (without preview image).");
          } catch (e2) {
             console.error("Critical storage failure: Cannot save invoice data even without image.", e2);
             // Could implement an LRU eviction strategy here (remove oldest items) if needed
          }
      }
    }
  },

  updateStatus: (id: string, status: 'Draft' | 'Pending' | 'Approved' | 'Rejected'): void => {
    const history = StorageService.getHistory();
    const updatedHistory = history.map(item => 
      item.id === id ? { ...item, status } : item
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Failed to update status in storage", e);
    }
  },

  getHistory: (): HistoryItem[] => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      const history: HistoryItem[] = JSON.parse(raw);
      const now = new Date();
      const cutoff = new Date(now.setDate(now.getDate() - RETENTION_DAYS));

      const validHistory = history.filter(item => {
        const itemDate = new Date(item.uploadDate);
        return itemDate > cutoff;
      });

      if (validHistory.length !== history.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validHistory));
      }

      return validHistory;
    } catch (e) {
      console.error("Failed to parse history", e);
      return [];
    }
  },

  checkForDuplicate: (data: ExtractedInvoiceData | ReceiptData): boolean => {
    const history = StorageService.getHistory();
    const otherItems = history.filter(h => h.id !== data.id);

    if (data.type === 'invoice') {
        return otherItems.some(h => 
            h.data.type === 'invoice' && 
            h.data.invoiceNumber?.toLowerCase() === data.invoiceNumber?.toLowerCase() &&
            h.data.vendorName?.toLowerCase() === data.vendorName?.toLowerCase()
        );
    } else {
        return otherItems.some(h => 
            h.data.type === 'receipt' &&
            h.data.merchantName?.toLowerCase() === data.merchantName?.toLowerCase() &&
            h.data.date === data.date &&
            Math.abs(h.data.totalAmount - data.totalAmount) < 0.01
        );
    }
  },

  clearHistory: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};