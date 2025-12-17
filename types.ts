
export interface VoucherItem {
  id: string;
  description: string;
  amount: number;
}

export interface Voucher {
  id: string;
  voucherNo: string;
  date: string;
  payeeName: string;
  items: VoucherItem[];
  totalAmount: number;
  status: 'Draft' | 'Approved' | 'Paid';
}

export enum GeminiModel {
  CHAT_PRO = 'gemini-3-pro-preview',
  FAST_LITE = 'gemini-2.5-flash-lite',
  TTS = 'gemini-2.5-flash-preview-tts',
  LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025',
  IMAGE_EDIT = 'gemini-2.5-flash-image',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  grounding?: {
    web?: {
      uri: string;
      title: string;
    }
  }[];
  relatedQuestions?: string[];
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ms', label: 'Bahasa Malaysia', flag: '🇲🇾' },
  { code: 'zh', label: 'Mandarin (中文)', flag: '🇨🇳' },
  { code: 'yue', label: 'Cantonese (廣東話)', flag: '🇭🇰' },
  { code: 'ja', label: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ru', label: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'de', label: 'German (Deutsch)', flag: '🇩🇪' },
];
