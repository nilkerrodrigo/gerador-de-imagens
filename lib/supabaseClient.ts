import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// Passo 1: Crie o projeto em supabase.com
// Passo 2: Rode o script SQL fornecido para criar a tabela 'creatives'
// Passo 3: Cole suas chaves abaixo (URL e Key)

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || ''; // Cole sua URL aqui entre as aspas se não usar .env
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || ''; // Cole sua ANON KEY aqui entre as aspas

// Verifica se as chaves foram preenchidas (ignora se estiver vazio ou com placeholder)
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
        console.warn("Supabase não configurado. O App está rodando em modo LocalStorage (Offline). Para salvar na nuvem, preencha as chaves em lib/supabaseClient.ts");
    }
    return configured;
};
