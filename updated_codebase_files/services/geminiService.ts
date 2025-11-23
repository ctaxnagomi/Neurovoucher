import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GeminiModel } from "../types";
import { b64ToUint8Array, decodeAudioData } from "./audioUtils";

const apiKey = process.env.API_KEY || ''; 
// NOTE: In a real app, never hardcode, always use process.env.API_KEY

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    if (!apiKey) console.error("API_KEY is missing");
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

// --- Fast AI (Flash Lite) ---
export const generateFastSummary = async (prompt: string): Promise<string> => {
  const client = getClient();
  try {
    const response = await client.models.generateContent({
      model: GeminiModel.FAST_LITE,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful assistant for a finance app. Keep answers concise.",
      }
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Fast AI Error:", error);
    return "Error processing request.";
  }
};

// --- Pro Chat (Gemini 3 Pro) ---
export const createChatSession = () => {
  const client = getClient();
  return client.chats.create({
    model: GeminiModel.CHAT_PRO,
    config: {
      systemInstruction: "You are an expert financial advisor specializing in Malaysian LHDN cash vouchers and tax compliance. Help the user categorize expenses and fix errors.",
    }
  });
};

// --- TTS (Flash TTS) ---
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const client = getClient();
  try {
    const response = await client.models.generateContent({
      model: GeminiModel.TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBytes = b64ToUint8Array(base64Audio);
        return await decodeAudioData(audioBytes, audioContext, 24000, 1);
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

// --- Image Editing (Flash Image) ---
export const editImage = async (base64Image: string, prompt: string): Promise<string | null> => {
    const client = getClient();
    try {
        const response = await client.models.generateContent({
            model: GeminiModel.IMAGE_EDIT,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: 'image/jpeg'
                        }
                    },
                    { text: prompt }
                ]
            }
        });

        // The model returns an image in inlineData
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/jpeg;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Image Edit Error:", error);
        return null;
    }
}

// --- OCR / Receipt Extraction (Flash) ---
export const extractReceiptData = async (base64Image: string): Promise<{ 
    payeeName?: string; 
    payeeId?: string;
    date?: string; 
    totalAmount?: number;
    companyName?: string;
    companyRegNo?: string;
    companyAddress?: string;
} | null> => {
  const client = getClient();
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg'
            }
          },
          { text: `Analyze this receipt image and extract the following details into a structured JSON format.

            1. **Payee Name**: The merchant or shop name. Look at the top header or logo.
            2. **Payee ID**: Business registration number (e.g., SSM, ROC, ROB, GST ID).
            3. **Date**: The transaction date. Standardize to YYYY-MM-DD. Handle formats like 'DD/MM/YYYY', 'DD-MMM-YYYY'.
            4. **Total Amount**: The final total paid (numeric). Ignore currency prefixes like 'RM', 'MYR'. Use the 'Grand Total' or 'Net Total'.
            5. **Company Name**: The 'Bill To' customer name (common in tax invoices).
            6. **Company Registration No**: The 'Bill To' registration number.
            7. **Company Address**: The 'Bill To' address.

            If a field is ambiguous or missing, exclude it or return null. Focus on high precision for Payee Name, Date, and Total Amount.` 
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                payeeName: { type: Type.STRING, description: "Name of the merchant/payee" },
                payeeId: { type: Type.STRING, description: "Merchant registration ID" },
                date: { type: Type.STRING, description: "Transaction date formatted as YYYY-MM-DD" },
                totalAmount: { type: Type.NUMBER, description: "Total amount paid (numeric)" },
                companyName: { type: Type.STRING, description: "Bill-to company name" },
                companyRegNo: { type: Type.STRING, description: "Bill-to company registration no" },
                companyAddress: { type: Type.STRING, description: "Bill-to company address" }
            },
            required: ["payeeName", "totalAmount"]
        }
      }
    });

    const jsonText = response.text;
    if (jsonText) {
        return JSON.parse(jsonText);
    }
    return null;
  } catch (error) {
    console.error("Receipt Extraction Error:", error);
    return null;
  }
}

// --- Live API Connector ---
export const getLiveClient = () => {
    return getClient();
}