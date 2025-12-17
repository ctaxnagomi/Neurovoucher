import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GeminiModel, SUPPORTED_LANGUAGES } from "../types";
import { b64ToUint8Array, decodeAudioData } from "./audioUtils";

// Helper to clean JSON string from Markdown code blocks
const cleanJsonString = (jsonStr: string): string => {
    return jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
};

// Helper to get key from storage or env
export const getApiKey = () => {
  return localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY || '';
};

export const setStoredApiKey = (key: string) => {
  localStorage.setItem('GEMINI_API_KEY', key);
  // Reset client so it re-initializes with new key next time
  aiClient = null;
};

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  const key = getApiKey();
  if (!aiClient || aiClient.apiKey !== key) {
    if (!key) console.warn("API_KEY is missing. Please configure it in Settings.");
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
};

// --- Connection Validation ---
export const validateConnection = async (): Promise<boolean> => {
    try {
        const client = getClient();
        // Lightweight call to test auth
        await client.models.countTokens({
            model: 'gemini-2.5-flash',
            contents: 'test',
        });
        return true;
    } catch (error) {
        console.error("Connection Validation Failed:", error);
        return false;
    }
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

// --- Pro Chat (Gemini 3 Pro) with Thinking & Search ---
export const createChatSession = (additionalContext: string = "") => {
  const client = getClient();
  const baseInstruction = "You are the NEURO COUNCIL, an advanced AI Financial Advisor and Agentic Assistant specializing in Malaysian LHDN cash vouchers, tax compliance, and finance workflows. \n\n" +
  "You have access to the user's current task context and checklists. Guide them proactively.\n" +
  "Strictly adhere to LHDN Malaysia guidelines (e.g., Public Rulings on substantiation of expense). \n" +
  "CRITICAL COMPLIANCE RULE: LHDN requires documentation in Bahasa Melayu or English. Even if the user speaks another language (e.g. Mandarin), any official drafts, voucher descriptions, or form content you generate MUST be in English or Malay.\n" +
  "Remind users that expenses must be wholly and exclusively incurred in the production of income. Cash vouchers require Payee Name, IC/Passport, and clear description.\n\n" +
  "You have access to Google Search. Use it to find the latest tax rates, public rulings, and financial news if you are unsure.";
  
  return client.chats.create({
    model: GeminiModel.CHAT_PRO,
    config: {
      systemInstruction: additionalContext ? `${baseInstruction}\n\nCurrent Context/Checklist:\n${additionalContext}` : baseInstruction,
      thinkingConfig: { thinkingBudget: 32768 },
      tools: [{ googleSearch: {} }],
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
            contents: [{
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: 'image/jpeg'
                        }
                    },
                    { text: prompt }
                ]
            }]
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

// --- Letterhead Extraction (Flash) ---
export const extractLetterhead = async (base64Image: string): Promise<{
    companyName?: string;
    regNo?: string;
    address?: string;
    phone?: string;
    email?: string;
} | null> => {
  const client = getClient();
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: `Analyze this document header or business card. Extract the following business details into JSON:
            1. companyName: The main business name.
            2. regNo: Registration number (e.g. Co. No., SSM, Reg No).
            3. address: Full business address.
            4. phone: Contact number.
            5. email: Email address.
            ` 
          }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                companyName: { type: Type.STRING },
                regNo: { type: Type.STRING },
                address: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
            }
        }
      }
    });
    
    const text = response.text || '{}';
    return JSON.parse(cleanJsonString(text));
  } catch (e) {
      console.error("Letterhead Extraction Error:", e);
      return null;
  }
}

// --- OCR / Receipt Extraction (Pro Image) ---
export const extractReceiptData = async (base64Image: string, language: string = 'en'): Promise<{ 
    payeeName?: string; 
    payeeId?: string;
    date?: string; 
    totalAmount?: number;
    companyName?: string;
    companyRegNo?: string;
    companyAddress?: string;
    companyTel?: string;
    companyEmail?: string;
    companyFax?: string;
    taxDeductible?: boolean;
    taxCategory?: string;
    taxCode?: string;
    taxLimit?: string;
    taxReason?: string;
} | null> => {
  const client = getClient();
  
  // Resolve language code to label for better prompting
  const langLabel = SUPPORTED_LANGUAGES.find(l => l.code === language)?.label || language;

  try {
    const response = await client.models.generateContent({
      model: GeminiModel.CHAT_PRO, // Using Gemini 3 Pro for advanced image understanding
      contents: [{
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg'
            }
          },
          { text: `Analyze this receipt image. The receipt is likely in ${langLabel}. Extract the following details into a structured JSON format.

            **CRITICAL LHDN COMPLIANCE RULE**: 
            The extracted data is for official Malaysian Tax submission. 
            If the extracted text (Payee Name, Items, Descriptions) is in a language OTHER than **Bahasa Melayu** or **English** (e.g. Chinese, Tamil), you MUST TRANSLATE it into **English**.
            All output fields must be in English or Bahasa Melayu.

            1. **Payee Name**: The merchant or shop name. Look at the top header or logo.
            2. **Payee ID**: Business registration number (e.g., SSM, ROC, ROB, GST ID, TIN).
            3. **Date**: The transaction date. Standardize to YYYY-MM-DD. Handle local date formats.
            4. **Total Amount**: The final total paid (numeric). Ignore currency prefixes.
            5. **Company Name**: The 'Bill To' customer name (common in tax invoices).
            6. **Company Registration No**: The 'Bill To' registration number.
            7. **Company Address**: The full address of the 'Bill To' company.
            8. **Company Contact**: Extract Phone (Tel), Email, and Fax if available in the header or footer.

            **LHDN Malaysia Tax Analysis (Income Tax Act 1967)**:
            9. **Tax Deductible**: Boolean. Is this expense likely tax deductible for a company under Sec 33(1)? (Wholly and exclusively incurred in production of income).
            10. **Tax Category**: Suggest a specific LHDN tax category based on Public Rulings:
               - "Entertainment (50% Restricted)" (e.g., meals with clients).
               - "Staff Welfare (100% Deductible)" (e.g., staff meals, team building).
               - "Travel & Transport" (Deductible if business nature).
               - "Gifts (Restricted)" (Restricted unless advertisement/logo present).
               - "Private/Domestic" (Non-deductible under Sec 39).
            11. **Tax Code/Limit**: Reference relevant codes (e.g., "PR 4/2015", "Sec 39(1)(l)").
            12. **Tax Reason**: Brief professional explanation for the classification in English.

            If a field is ambiguous or missing, exclude it or return null.` 
          }
        ]
      }],
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
                companyAddress: { type: Type.STRING, description: "Bill-to company address" },
                companyTel: { type: Type.STRING, description: "Company Telephone Number" },
                companyEmail: { type: Type.STRING, description: "Company Email Address" },
                companyFax: { type: Type.STRING, description: "Company Fax Number" },
                taxDeductible: { type: Type.BOOLEAN, description: "Is this likely tax deductible in Malaysia?" },
                taxCategory: { type: Type.STRING, description: "LHDN tax category" },
                taxCode: { type: Type.STRING, description: "Relevant tax code or restriction rule" },
                taxLimit: { type: Type.STRING, description: "Claim limits if any" },
                taxReason: { type: Type.STRING, description: "Reasoning for tax status" }
            },
            required: ["payeeName", "totalAmount"]
        }
      }
    });

    const jsonText = response.text;
    if (jsonText) {
        try {
            return JSON.parse(cleanJsonString(jsonText));
        } catch (e) {
            console.error("JSON Parse Error on:", jsonText);
            throw new Error("PARSING_FAILED");
        }
    }
    throw new Error("NO_RESPONSE_TEXT");
  } catch (error) {
    console.error("Receipt Extraction Error:", error);
    throw error;
  }
}

// --- Video Analysis (Pro) ---
export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string): Promise<string> => {
    const client = getClient();
    try {
        const response = await client.models.generateContent({
            model: GeminiModel.CHAT_PRO,
            contents: [{
                parts: [
                    {
                        inlineData: {
                            data: base64Video,
                            mimeType: mimeType
                        }
                    },
                    { text: prompt }
                ]
            }],
            config: {
                thinkingConfig: { thinkingBudget: 16384 }, // Lower budget for video to balance latency
            }
        });
        return response.text || "No analysis generated.";
    } catch (error) {
        console.error("Video Analysis Error:", error);
        return "Failed to analyze video.";
    }
}

// --- Live API Connector ---
export const getLiveClient = () => {
    return getClient();
}