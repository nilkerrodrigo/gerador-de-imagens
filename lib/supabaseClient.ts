import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// Acessamos as variáveis de ambiente de forma segura para evitar crashes
// caso import.meta.env esteja undefined (ex: ambientes fora do padrão Vite).

const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    console.warn('Erro ao acessar variável de ambiente:', key);
  }
  return undefined;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

// Verifica se as chaves existem e são válidas (não undefined ou string vazia)
const isValid = 
  SUPABASE_URL && 
  typeof SUPABASE_URL === 'string' &&
  SUPABASE_URL.startsWith('http') && 
  SUPABASE_ANON_KEY && 
  typeof SUPABASE_ANON_KEY === 'string' &&
  SUPABASE_ANON_KEY.length > 20;

export const supabase = isValid
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const isSupabaseConfigured = () => {
    return !!supabase;
};