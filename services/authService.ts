import { User } from "../types";

const USERS_KEY = "AETHER_USERS";
const SESSION_KEY = "AETHER_SESSION";

// Inicializa com um admin padrão se não existir ninguém
const initializeUsers = () => {
  const users = getUsers();
  if (users.length === 0) {
    const defaultAdmin: User = {
      id: "admin-id-001",
      username: "admin",
      password: "admin",
      role: "admin",
      status: "active", // Admin padrão sempre ativo
      createdAt: Date.now(),
    };
    saveUsers([defaultAdmin]);
  }
};

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  let users: User[] = stored ? JSON.parse(stored) : [];
  
  // Migração simples para evitar erros se a versão anterior do User não tinha status
  return users.map(u => ({
      ...u,
      status: u.status || 'active' // Assume active se for usuário legado
  }));
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Registro público (Padrão: Pendente)
export const registerUser = (username: string, password: string): User => {
  const users = getUsers();
  if (users.find((u) => u.username === username)) {
    throw new Error("Usuário já existe.");
  }

  const newUser: User = {
    id: Math.random().toString(36).substr(2, 9),
    username,
    password,
    role: "user", 
    status: "pending", // AGUARDA APROVAÇÃO
    createdAt: Date.now(),
  };

  users.push(newUser);
  saveUsers(users);
  return newUser;
};

// Criação pelo Admin (Padrão: Ativo)
export const createUserByAdmin = (username: string, password: string, role: 'admin' | 'user'): User => {
    const users = getUsers();
    if (users.find((u) => u.username === username)) {
      throw new Error("Usuário já existe.");
    }
  
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      password,
      role: role, 
      status: "active", // JÁ CRIADO APROVADO
      createdAt: Date.now(),
    };
  
    users.push(newUser);
    saveUsers(users);
    return newUser;
};

export const loginUser = (username: string, password: string): User => {
  initializeUsers(); 
  const users = getUsers();
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    throw new Error("Credenciais inválidas.");
  }

  if (user.status === 'pending') {
      throw new Error("Cadastro em análise. Aguarde aprovação do administrador.");
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

// --- FUNÇÕES DE ADMIN ---

export const deleteUser = (userId: string) => {
  let users = getUsers();
  const userToDelete = users.find(u => u.id === userId);
  const adminCount = users.filter(u => u.role === 'admin' && u.status === 'active').length;

  if (userToDelete?.role === 'admin' && adminCount <= 1) {
    throw new Error("Não é possível remover o último administrador ativo.");
  }

  users = users.filter((u) => u.id !== userId);
  saveUsers(users);
};

export const toggleUserRole = (userId: string) => {
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) throw new Error("Usuário não encontrado.");

  const user = users[userIndex];
  
  if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin' && u.status === 'active').length;
      if (adminCount <= 1) throw new Error("Deve haver pelo menos um administrador.");
      user.role = 'user';
  } else {
      user.role = 'admin';
  }

  users[userIndex] = user;
  saveUsers(users);
};

export const approveUser = (userId: string) => {
    const users = getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error("Usuário não encontrado.");
    
    users[userIndex].status = 'active';
    saveUsers(users);
};

export const blockUser = (userId: string) => {
    const users = getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error("Usuário não encontrado.");
    
    // Proteção contra bloqueio do último admin
    if (users[userIndex].role === 'admin') {
         const adminCount = users.filter(u => u.role === 'admin' && u.status === 'active').length;
         if (adminCount <= 1) throw new Error("Não é possível bloquear o último administrador.");
    }

    users[userIndex].status = users[userIndex].status === 'blocked' ? 'active' : 'blocked';
    saveUsers(users);
}
