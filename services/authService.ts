import { User } from "../types";
import { auth, db } from "../lib/firebaseClient";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } from "firebase/firestore";

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
  if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const mappedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            mappedUsers.push({
                id: doc.id, // O ID do documento é o UID do Auth ou gerado
                username: data.username,
                password: '***', // Firebase não retorna senha
                role: data.role || 'user',
                status: data.status || 'active',
                createdAt: data.createdAt || Date.now()
            });
        });
        saveLocalUsers(mappedUsers);
        return mappedUsers;
      } catch (e) {
        console.warn("Erro ao buscar users no Firebase, usando local.", e);
      }
  }
  return getLocalUsers();
};

export const registerUser = async (username: string, password: string): Promise<User> => {
  const now = Math.floor(Date.now());
  
  // Cria email fake baseado no username para o Firebase Auth (que exige email)
  const email = `${username.toLowerCase().replace(/\s+/g, '')}@azulcreative.app`;

  if (auth && db) {
      try {
          // 1. Cria usuário na Autenticação
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const uid = userCredential.user.uid;

          const newUser: User = {
            id: uid,
            username,
            password: '***',
            role: "user",
            status: "active",
            createdAt: now,
          };

          // 2. Salva dados extras no Firestore
          await setDoc(doc(db, "users", uid), {
              username: newUser.username,
              role: newUser.role,
              status: newUser.status,
              createdAt: newUser.createdAt
          });

          return newUser;

      } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
              throw new Error("Usuário já existe.");
          }
          console.error("Firebase Register Error:", error);
          throw new Error(error.message || "Erro ao criar conta no Firebase.");
      }
  }

  // Fallback Local
  const users = getLocalUsers();
  if (users.find(u => u.username === username)) {
      throw new Error("Usuário já existe (Local).");
  }
  
  const localUser: User = {
    id: Math.random().toString(36).substr(2, 9),
    username,
    password, 
    role: "user", 
    status: "active", 
    createdAt: now,
  };
  
  users.push(localUser);
  saveLocalUsers(users);
  return localUser;
};

export const loginUser = async (username: string, password: string): Promise<User> => {
  const email = `${username.toLowerCase().replace(/\s+/g, '')}@azulcreative.app`;
  
  // Admin Bootstrap (Sempre Local/Híbrido)
  const isRescuePassword = ['admin', '123456', '12345'].includes(password);
  if (username === 'admin' && isRescuePassword) {
      const adminUser: User = {
          id: 'admin-bootstrap',
          username: 'admin',
          password: password,
          role: 'admin',
          status: 'active',
          createdAt: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
      return adminUser;
  }

  if (auth && db) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Busca dados do perfil no Firestore
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const user: User = {
                id: uid,
                username: data.username,
                password: '***',
                role: data.role,
                status: data.status,
                createdAt: data.createdAt
            };

            if (user.status === 'pending') throw new Error("Cadastro em análise.");
            if (user.status === 'blocked') throw new Error("Conta bloqueada.");

            localStorage.setItem(SESSION_KEY, JSON.stringify(user));
            return user;
        } else {
            throw new Error("Perfil de usuário não encontrado no banco de dados.");
        }
      } catch (e: any) {
          console.warn("Erro login Firebase:", e.message);
          // Se falhar firebase, tenta local abaixo
          if (e.message.includes("Cadastro em análise") || e.message.includes("Conta bloqueada")) {
              throw e;
          }
      }
  }

  // Fallback Local
  const users = getLocalUsers();
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    throw new Error("Usuário não encontrado ou senha incorreta.");
  }
  
  if (user.status === 'pending') throw new Error("Cadastro em análise.");
  if (user.status === 'blocked') throw new Error("Conta bloqueada.");

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const logoutUser = async () => {
  if (auth) {
      try { await signOut(auth); } catch(e) {}
  }
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentSession = (): User | null => {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
};

// --- FUNÇÕES DE ADMIN (Firebase) ---

export const createUserByAdmin = async (username: string, password: string, role: 'admin' | 'user'): Promise<User> => {
    // Nota: Criar usuário secundário logado com Firebase é complexo no client-side 
    // pois desloga o admin atual. Vamos simular criando apenas no Firestore ou Local
    // para não derrubar a sessão do admin.
    
    // Solução ideal: Cloud Function. 
    // Solução atual: Apenas registro local e instrução visual.
    
    const now = Math.floor(Date.now());
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      password,
      role: role, 
      status: "active", 
      createdAt: now,
    };
    
    const users = getLocalUsers();
    users.push(newUser);
    saveLocalUsers(users);
    
    return newUser;
};

export const deleteUser = async (userId: string) => {
  if (db) {
      try { await deleteDoc(doc(db, "users", userId)); } catch(e) { console.error(e); }
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

  if (db) {
      try { await updateDoc(doc(db, "users", userId), { role: newRole }); } catch(e) { console.error(e); }
  }

  const localUsers = getLocalUsers();
  const index = localUsers.findIndex(u => u.id === userId);
  if (index !== -1) { localUsers[index].role = newRole; saveLocalUsers(localUsers); }
};

export const approveUser = async (userId: string) => {
    if (db) {
        try { await updateDoc(doc(db, "users", userId), { status: 'active' }); } catch(e) { console.error(e); }
    }
    
    const localUsers = getLocalUsers();
    const index = localUsers.findIndex(u => u.id === userId);
    if (index !== -1) { localUsers[index].status = 'active'; saveLocalUsers(localUsers); }
};

export const blockUser = async (userId: string) => {
    let currentStatus = 'active';
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (user) currentStatus = user.status;
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';

    if (db) {
        try { await updateDoc(doc(db, "users", userId), { status: newStatus }); } catch(e) { console.error(e); }
    }

    const localUsers = getLocalUsers();
    const index = localUsers.findIndex(u => u.id === userId);
    if (index !== -1) { localUsers[index].status = newStatus; saveLocalUsers(localUsers); }
};
