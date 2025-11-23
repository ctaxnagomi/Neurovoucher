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
  FAST_LITE = 'gemini-2.5-flash-lite-latest',
  TTS = 'gemini-2.5-flash-preview-tts',
  LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025',
  IMAGE_EDIT = 'gemini-2.5-flash-image',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Malay (Bahasa Melayu)' },
  { code: 'id', label: 'Indonesia (Bahasa Indonesia)' },
  { code: 'fil', label: 'Philippines (Tagalog)' },
  { code: 'zh', label: 'Chinese (中文)' },
];