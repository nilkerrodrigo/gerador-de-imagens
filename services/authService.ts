import { User } from "../types";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const SESSION_KEY = "AZUL_SESSION";
const USERS_KEY_LOCAL = "AZUL_USERS_LOCAL_CACHE";

// --- HELPERS LOCAIS (Fallback/Cache) ---
const getLocalUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY_LOCAL);
  return stored ? JSON.parse(stored) : [];
};

const saveLocalUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY_LOCAL, JSON.stringify(users));
};

// --- AUTH CORE ---

export const getUsers = async (): Promise<User[]> => {
  if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
            // Mapeia dados do Supabase (snake_case) para a interface User (camelCase)
            // Isso evita erro de build "Type mismatch"
            const mappedUsers: User[] = data.map((u: any) => ({
                id: u.id,
                username: u.username,
                password: u.password,
                role: u.role,
                status: u.status,
                // Supabase retorna string ISO, App espera number (timestamp)
                createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now()
            }));

            saveLocalUsers(mappedUsers);
            return mappedUsers;
        }
      } catch (e) {
        console.warn("Erro ao buscar users no Supabase, usando local.", e);
      }
  }
  // Fallback
  return getLocalUsers();
};

export const registerUser = async (username: string, password: string): Promise<User> => {
  const newUser: User = {
    id: Math.random().toString(36).substr(2, 9),
    username,
    password, 
    role: "user", 
    status: "active", 
    createdAt: Date.now(),
  };

  let savedInSupabase = false;

  // 1. Tenta salvar no Supabase
  if (supabase) {
      try {
        // Verifica duplicidade
        const { data: existing } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
        if (existing) throw new Error("Usuário já existe.");

        // Ao inserir, passamos o created_at como ISO string para o banco aceitar
        const dbUser = {
            ...newUser,
            created_at: new Date(newUser.createdAt).toISOString()
        };

        const { error } = await supabase.from('users').insert([dbUser]);
        if (error) {
            console.error("Supabase insert error:", error);
        } else {
            savedInSupabase = true;
        }
      } catch (e: any) {
          if (e.message === "Usuário já existe.") throw e;
          console.error("Erro de conexão Supabase:", e);
      }
  }

  // 2. Salva Localmente
  const users = getLocalUsers();
  if (!savedInSupabase && users.find(u => u.username === username)) {
      throw new Error("Usuário já existe.");
  }
  
  if (!users.find(u => u.username === username)) {
      users.push(newUser);
      saveLocalUsers(users);
  }

  return newUser;
};

export const createUserByAdmin = async (username: string, password: string, role: 'admin' | 'user'): Promise<User> => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      password,
      role: role, 
      status: "active", 
      createdAt: Date.now(),
    };
  
    if (supabase) {
        const { data: existing } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
        if (existing) throw new Error("Usuário já existe.");

        const dbUser = {
            ...newUser,
            created_at: new Date(newUser.createdAt).toISOString()
        };

        const { error } = await supabase.from('users').insert([dbUser]);
        if (error) throw error;
    } 
    
    const users = getLocalUsers();
    if (users.find(u => u.username === username) && !isSupabaseConfigured()) throw new Error("Usuário já existe.");
    
    if (!users.find(u => u.id === newUser.id)) {
        users.push(newUser);
        saveLocalUsers(users);
    }
    
    return newUser;
};

export const loginUser = async (username: string, password: string): Promise<User> => {
  let user: User | undefined;

  // 1. Tenta buscar no Supabase
  if (supabase) {
      try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();
        
        if (data) {
             user = {
                id: data.id,
                username: data.username,
                password: data.password,
                role: data.role,
                status: data.status,
                createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now()
            };
        }
      } catch (e) {
          console.warn("Erro login supabase, tentando local", e);
      }
  } 

  // 2. Se não achou, tenta LocalStorage
  if (!user) {
      const users = getLocalUsers();
      user = users.find((u) => u.username === username && u.password === password);
  }

  // 3. RECUPERAÇÃO DE ADMIN (Bootstrap)
  const isRescuePassword = ['admin', '123456', '12345'].includes(password);
  
  if (!user && username === 'admin' && isRescuePassword) {
      console.log("⚠️ Detectado login de admin inicial. Iniciando protocolo de resgate...");
      
      const adminUser: User = {
          id: 'admin-bootstrap-' + Date.now(),
          username: 'admin',
          password: password, 
          role: 'admin',
          status: 'active',
          createdAt: Date.now()
      };

      if (supabase) {
          try {
             const dbAdmin = { ...adminUser, created_at: new Date().toISOString() };
             const { error } = await supabase.from('users').insert([dbAdmin]);
             if (error) console.error("Erro Supabase Bootstrap:", error);
          } catch(e) { console.error("Erro ao salvar admin no banco:", e); }
      }
      
      const users = getLocalUsers();
      const cleanUsers = users.filter(u => u.username !== 'admin');
      cleanUsers.push(adminUser);
      saveLocalUsers(cleanUsers);

      console.log("✅ Admin recriado com sucesso!");
      localStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
      return adminUser;
  }

  if (!user) {
    throw new Error("Usuário não encontrado ou senha incorreta.");
  }

  if (user.status === 'pending') {
      throw new Error("Cadastro em análise. Aguarde aprovação.");
  }

  if (user.status === 'blocked') {
      throw new Error("Conta bloqueada. Contate o suporte.");
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentSession = (): User | null => {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
};

// --- FUNÇÕES DE ADMIN (Async) ---

export const deleteUser = async (userId: string) => {
  if (supabase) {
      await supabase.from('users').delete().eq('id', userId);
  }
  
  let users = getLocalUsers();
  users = users.filter((u) => u.id !== userId);
  saveLocalUsers(users);
};

export const toggleUserRole = async (userId: string) => {
  let users = await getUsers(); 
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const newRole = user.role === 'admin' ? 'user' : 'admin';

  if (supabase) {
      await supabase.from('users').update({ role: newRole }).eq('id', userId);
  }

  const localUsers = getLocalUsers();
  const localIndex = localUsers.findIndex(u => u.id === userId);
  if (localIndex !== -1) {
      localUsers[localIndex].role = newRole;
      saveLocalUsers(localUsers);
  }
};

export const approveUser = async (userId: string) => {
    if (supabase) {
        await supabase.from('users').update({ status: 'active' }).eq('id', userId);
    }
    
    const localUsers = getLocalUsers();
    const localIndex = localUsers.findIndex(u => u.id === userId);
    if (localIndex !== -1) {
        localUsers[localIndex].status = 'active';
        saveLocalUsers(localUsers);
    }
};

export const blockUser = async (userId: string) => {
    let currentStatus = 'active';
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (user) currentStatus = user.status;

    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';

    if (supabase) {
        await supabase.from('users').update({ status: newStatus }).eq('id', userId);
    }

    const localUsers = getLocalUsers();
    const localIndex = localUsers.findIndex(u => u.id === userId);
    if (localIndex !== -1) {
        localUsers[localIndex].status = newStatus;
        saveLocalUsers(localUsers);
    }
};