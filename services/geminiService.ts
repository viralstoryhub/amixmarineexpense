import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractedInvoiceData, ReceiptData } from "../types";

const apiKey = "AIzaSyD_LEap3oxQge44mcMrjIEu3uX8AWidhhQ";

// --- INVOICE SCHEMA ---
const invoiceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    vendorName: { type: Type.STRING, description: "Name of the vendor or supplier" },
    invoiceNumber: { type: Type.STRING, description: "The invoice identifier" },
    poNumber: { type: Type.STRING, description: "Purchase Order number if visible", nullable: true },
    projectNumber: { type: Type.STRING, description: "Project number or reference (e.g. AMIX-XX) if visible", nullable: true },
    invoiceDate: { type: Type.STRING, description: "Date of invoice in YYYY-MM-DD format" },
    subtotal: { type: Type.NUMBER, description: "Subtotal before tax" },
    taxTotal: { type: Type.NUMBER, description: "Total tax amount (GST/PST/HST)" },
    grandTotal: { type: Type.NUMBER, description: "Total amount including tax" },
    confidenceScore: { type: Type.NUMBER, description: "Confidence in extraction (0-100)" },
    riskFlags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of potential issues (e.g. 'High Amount > $1000', 'Alcohol Detected', 'Entertainment')"
    },
    lineItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
          costCode: { type: Type.STRING, description: "Suggested cost code based on item (e.g., FUEL, EQUIPMENT, MATERIALS)", nullable: true },
          isTaxLine: { type: Type.BOOLEAN, description: "True if this line item represents a tax adjustment" }
        },
        required: ["description", "quantity", "unitPrice", "total", "isTaxLine"]
      }
    }
  },
  required: ["vendorName", "invoiceNumber", "invoiceDate", "lineItems", "grandTotal"]
};

// --- RECEIPT SCHEMA ---
const receiptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    merchantName: { type: Type.STRING, description: "Name of the store or merchant" },
    date: { type: Type.STRING, description: "Date of transaction YYYY-MM-DD" },
    totalAmount: { type: Type.NUMBER, description: "Grand total paid" },
    taxAmount: { type: Type.NUMBER, description: "Total tax detected" },
    description: { type: Type.STRING, description: "Brief summary of items purchased" },
    projectNumber: { type: Type.STRING, description: "Project number if mentioned", nullable: true },
    costCode: { type: Type.STRING, description: "Suggested category (e.g. FUEL, MEALS, SUPPLIES)", nullable: true },
    lineItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Name of product/service on this line" },
          quantity: { type: Type.NUMBER, description: "Count of items (default 1)" },
          unitPrice: { type: Type.NUMBER, description: "Price per item" },
          total: { type: Type.NUMBER, description: "Total for this line" },
          costCode: { type: Type.STRING, description: "Item specific cost code", nullable: true },
          isTaxLine: { type: Type.BOOLEAN, description: "True if this line is specifically a tax charge (GST/PST)" }
        },
        required: ["description", "total"]
      }
    },
    riskFlags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of potential issues (e.g. 'High Amount > $500', 'Alcohol Detected', 'Suspicious Vendor')"
    }
  },
  required: ["merchantName", "date", "totalAmount", "description", "lineItems"]
};

export const extractInvoiceData = async (base64Data: string, mimeType: string): Promise<ExtractedInvoiceData> => {
  if (!apiKey) {
    throw new Error("API Key is missing from environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert accounts payable AI for 'Amix Marine Projects'.
    Analyze this invoice document.
    
    Tasks:
    1. Extract header info (Vendor, Invoice #, Date, PO #, Project #).
    2. Break down every single line item.
    3. Suggest Cost Codes.
    4. Identify tax lines.
    5. Ensure math is correct.
    6. Identify potential anomalies or risks (e.g., unusually high amount, suspicious vendor, missing details).
    
    Return ONLY valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: invoiceSchema,
        temperature: 0.1
      }
    });

    const textResponse = response.text;
    if (!textResponse) throw new Error("Empty response from AI");

    const data = JSON.parse(textResponse);

    const enrichedLineItems = (data.lineItems || []).map((item: any) => ({
      ...item,
      id: crypto.randomUUID()
    }));

    return {
      ...data,
      type: 'invoice',
      id: crypto.randomUUID(),
      lineItems: enrichedLineItems,
      confidenceScore: data.confidenceScore || 95 // Use extracted confidence or default
    };

  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    throw new Error(`Gemini API Error: ${error.message}`);
  }
};

export const extractReceiptData = async (base64Data: string, mimeType: string): Promise<ReceiptData> => {
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // STRONGER PROMPT FOR RECEIPTS
  const prompt = `
    You are an expert expense tracker for 'Amix Marine'.
    Analyze this receipt image deeply.
    
    MANDATORY REQUIREMENT: You MUST extract individual line items. Do NOT just give the total.
    
    1. **Merchant & Date**: Identify who and when.
    2. **Line Item Extraction**: 
       - Look at the body of the receipt between the header and the subtotal.
       - Create a separate line item for EVERY product or service listed.
       - Extract the exact price and description.
    3. **Tax Handling**: 
       - If you see lines like "GST", "PST", "HST", or "Tax", extract them as separate line items but mark 'isTaxLine' as true.
    4. **Total**: Verify the sum matches the Grand Total.
    
    If the image is blurry or summarizes multiple items, try your best to separate them.
    
    5. **Risk Detection**:
     - Flag if total > $5000.
     - Flag if "Alcohol", "Beer", "Wine", or "Liquor" is present.
     - Flag if "Entertainment" or "Party" is mentioned.
     - Flag if the date is older than 60 days.

  Return valid JSON matching the schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
        temperature: 0.1
      }
    });

    const data = JSON.parse(response.text || "{}");

    // Add IDs and ensure defaults
    const enrichedLineItems = (data.lineItems || []).map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.total,
      isTaxLine: item.isTaxLine || false,
      // Fallback for missing cost codes
      costCode: item.costCode || data.costCode || ''
    }));

    return {
      ...data,
      type: 'receipt',
      id: crypto.randomUUID(),
      lineItems: enrichedLineItems
    };

  } catch (error: any) {
    console.error("Receipt Error:", error);
    throw new Error(`Receipt processing failed: ${error.message}`);
  }
};