import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis do Supabase não configuradas!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Registrar usuário
export const registerUser = async (username: string, password: string, role: string) => {
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id: crypto.randomUUID(),
        username,
        password,
        role,
        status: 'approved'
      }
    ])
    .select();

  if (error) throw error;
  return data;
};

// Login usuário
export const loginUser = async (username: string, password: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error) throw error;
  return data;
};

// Logout
export const logoutUser = () => {
  localStorage.removeItem('currentUser');
};

// Sessão atual
export const getCurrentSession = () => {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
};

// Salvar criativo
export const saveCreativeToSupabase = async (userId: string, imageData: string, settings: any, caption: string) => {
  const { data, error } = await supabase
    .from('creatives')
    .insert([
      {
        id: crypto.randomUUID(),
        user_id: userId,
        image_data: imageData,
        settings: settings,
        caption: caption,
        created_at: new Date().toISOString()
      }
    ])
    .select();

  if (error) throw error;
  return data;
};

// Buscar criativos do usuário
export const fetchUserCreatives = async (userId: string) => {
  const { data, error } = await supabase
    .from('creatives')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};
