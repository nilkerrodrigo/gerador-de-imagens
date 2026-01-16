import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// Credenciais configuradas para conexão com o banco de dados
const SUPABASE_URL: string = 'https://sroifrdkzihutennguxz.supabase.co';
const SUPABASE_ANON_KEY: string = 'sb_publishable_mq-ddxSH7u85nLZK_gKk0w_FSPjlMAN';

// Verifica se as chaves foram preenchidas
const isValid = 
  SUPABASE_URL && 
  SUPABASE_URL !== '' && 
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY !== '';

export const supabase = isValid
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const isSupabaseConfigured = () => {
    const configured = !!supabase;
    if (!configured) {
        console.warn("Supabase não configurado. O App está rodando em modo LocalStorage (Offline).");
    }
    return configured;
};