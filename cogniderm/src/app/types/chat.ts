export interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface ChatResponse {
  messages: Message[];
  error?: string;
} 