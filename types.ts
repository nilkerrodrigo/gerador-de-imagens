export interface AppState {
  apiKey: string;
  category: string;
  modelCount: number;
  objective: string;
  niche: string;
  textOnImage: string;
  textPosition: string; // Mantido: Posição do texto
  ctaText: string;
  showCta: boolean; 
  colorPalette: string;
  description: string;
  negativePrompt: string;
  mood: string; 
  referenceImages: File[];
  logoImage: File | null;
  style: string;
  format: string;
}

export interface GeneratedCreative {
  id: string;
  url: string;
  timestamp: number;
  caption?: string;
  settings: {
    category: string;
    description: string;
    textOnImage: string;
    ctaText: string;
    style: string;
    format: string;
    objective: string;
    niche: string;
    colorPalette: string;
  };
}

export interface DropdownOption {
  label: string;
  value: string;
}

// --- AUTH TYPES ---
export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'pending' | 'blocked';

export interface User {
  id: string;
  username: string;
  password: string; // Em um app real, isso seria hash. Aqui é simulado.
  role: UserRole;
  status: UserStatus;
  createdAt: number;
}
