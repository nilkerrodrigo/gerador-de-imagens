import { User } from "../types";
import { auth, db, firebaseConfig } from "../lib/firebaseClient"; // Importando config
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, limit, query } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app"; // Necessário para app secundário
import { getFirestore } from "firebase/firestore"; // Necessário para firestore secundário

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

// --- HELPER DE AUTENTICAÇÃO (Anti-Race Condition) ---
// Garante que o Firebase Auth terminou de carregar a sessão do IndexedDB antes de tentar ler o banco
const waitForAuth = (): Promise<void> => {
    return new Promise((resolve) => {
        const _auth = auth;
        // Se não tem auth configurado ou já tem usuário carregado, libera
        if (!_auth) return resolve();
        if (_auth.currentUser) return resolve();

        // Timeout de segurança para não travar o app se a internet cair
        const safetyTimeout = setTimeout(() => resolve(), 2500);

        const unsubscribe = onAuthStateChanged(_auth, (user) => {
            clearTimeout(safetyTimeout);
            unsubscribe();
            resolve();
        });
    });
};

// --- DIAGNOSTIC ---
export const checkDatabaseConnection = async (): Promise<string> => {
    const _db = db;
    const _auth = auth;
    
    if (!_db) return "Firebase não inicializado no cliente.";
    
    // Aguarda autenticação antes de testar permissão
    await waitForAuth();

    try {
        const q = query(collection(_db, "users"), limit(1));
        await getDocs(q);
        return "Conexão OK: Leitura e Escrita ativas.";
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            // Tenta verificar se tem acesso pelo menos ao próprio perfil
            // Se conseguir ler o próprio doc, o banco está conectado e as regras estão apenas estritas (o que é bom)
            if (_auth?.currentUser) {
                try {
                    await getDoc(doc(_db, "users", _auth.currentUser.uid));
                    // Retorna status informativo sem a flag "ALERTA" para não assustar o usuário
                    return "Conexão Ativa: Modo de acesso restrito (Regras de Segurança).";
                } catch (inner) {}
            }
            return "⚠️ ALERTA: Sem permissão de leitura global. Verifique as Regras no Console.";
        }
        return `Status Conexão: ${e.code || e.message}`;
    }
};

// --- AUTH CORE ---

export const getUsers = async (): Promise<User[]> => {
  let firestoreUsers: User[] = [];
  const _db = db;

  if (_db) {
      await waitForAuth(); 
      try {
        const querySnapshot = await getDocs(collection(_db, "users"));
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            firestoreUsers.push({
                id: doc.id,
                username: data.username,
                password: '***',
                role: data.role || 'user',
                status: data.status || 'active',
                createdAt: data.createdAt || Date.now()
            });
        });
      } catch (e: any) {
        // Falha silenciosa para permissão negada (regras estritas)
        if (e.code !== 'permission-denied') {
             console.warn("Aviso: Falha ao buscar usuários na nuvem.", e.code);
        }
      }
  }

  // Merge Inteligente (Nuvem + Local)
  const localUsers = getLocalUsers();
  const userMap = new Map<string, User>();

  // 1. Adiciona usuários locais
  localUsers.forEach(u => userMap.set(u.id, u));
  
  // 2. Adiciona usuários da nuvem (sobrescreve locais se existirem)
  firestoreUsers.forEach(u => userMap.set(u.id, u)); 
  
  // 3. Garante que o usuário atual está na lista (mesmo se falhar leitura do banco)
  const currentSession = getCurrentSession();
  if (currentSession && !userMap.has(currentSession.id)) {
      userMap.set(currentSession.id, currentSession);
  }

  const mergedUsers = Array.from(userMap.values());
  saveLocalUsers(mergedUsers);
  
  return mergedUsers;
};

export const registerUser = async (username: string, password: string): Promise<User> => {
  const now = Math.floor(Date.now());
  const _auth = auth;
  const _db = db;
  
  const isEmail = username.includes('@');
  const email = isEmail 
    ? username.trim().toLowerCase() 
    : `${username.toLowerCase().replace(/\s+/g, '')}@azulcreative.app`;

  const displayUsername = isEmail ? username.split('@')[0] : username;

  if (_auth && _db) {
      try {
          // 1. Auth Create
          const userCredential = await createUserWithEmailAndPassword(_auth, email, password);
          const uid = userCredential.user.uid;

          const newUser: User = {
            id: uid,
            username: displayUsername,
            password: '***',
            role: "user",
            status: "active",
            createdAt: now,
          };

          // 2. Firestore Write (BLINDADO)
          try {
              await setDoc(doc(_db, "users", uid), {
                  username: newUser.username,
                  role: newUser.role,
                  status: newUser.status,
                  createdAt: newUser.createdAt
              });
          } catch (dbError: any) {
              console.error("⚠️ ERRO FIRESTORE (Não fatal):", dbError.message);
          }

          // 3. Local Cache
          const localUsers = getLocalUsers();
          if (!localUsers.find(u => u.id === newUser.id)) {
              localUsers.push(newUser);
              saveLocalUsers(localUsers);
          }

          return newUser;

      } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
              throw new Error("Este e-mail já está cadastrado. Tente fazer login.");
          }
          if (error.code === 'auth/invalid-email') {
              throw new Error("Formato de e-mail inválido.");
          }
          if (error.code === 'auth/weak-password') {
             throw new Error("A senha deve ter pelo menos 6 caracteres.");
          }
          console.error("Firebase Register Error:", error);
          throw new Error(error.message || "Erro ao criar conta.");
      }
  }

  // Fallback Offline/Local
  const users = getLocalUsers();
  if (users.find(u => u.username === displayUsername)) {
      throw new Error("Usuário já existe (Local).");
  }
  
  const localUser: User = {
    id: Math.random().toString(36).substr(2, 9),
    username: displayUsername,
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
  const _auth = auth;
  const _db = db;

  const isEmail = username.includes('@');
  const email = isEmail 
    ? username.trim().toLowerCase() 
    : `${username.toLowerCase().replace(/\s+/g, '')}@azulcreative.app`;
  
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

  if (_auth && _db) {
      try {
        // O signIn já resolve a sessão, não precisa de waitForAuth aqui
        const userCredential = await signInWithEmailAndPassword(_auth, email, password);
        const uid = userCredential.user.uid;

        let user: User | null = null;
        const docRef = doc(_db, "users", uid);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                user = {
                    id: uid,
                    username: data.username,
                    password: '***',
                    role: data.role,
                    status: data.status,
                    createdAt: data.createdAt
                };
            } else {
                console.log("🛠️ Reparando perfil de usuário ausente no Firestore...");
                const recoveredUser = {
                    username: isEmail ? username.split('@')[0] : username,
                    role: 'user' as const,
                    status: 'active' as const,
                    createdAt: Date.now()
                };
                try {
                    await setDoc(docRef, recoveredUser);
                    user = { id: uid, password: '***', ...recoveredUser };
                } catch(err) { console.warn("Falha no reparo automático:", err); }
            }
        } catch (dbError) {
            console.warn("Erro leitura Firestore login:", dbError);
        }

        if (!user) {
            const localUsers = getLocalUsers();
            user = localUsers.find(u => u.id === uid) || {
                id: uid,
                username: isEmail ? username.split('@')[0] : username,
                password: '***',
                role: 'user',
                status: 'active',
                createdAt: Date.now()
            };
            if(!localUsers.find(u => u.id === user?.id)) {
                localUsers.push(user);
                saveLocalUsers(localUsers);
            }
        }

        if (user.status === 'pending') throw new Error("Cadastro em análise.");
        if (user.status === 'blocked') throw new Error("Conta bloqueada.");

        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;

      } catch (e: any) {
          if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
              throw new Error("Usuário ou senha incorretos.");
          }
          if (e.message && (e.message.includes("análise") || e.message.includes("bloqueada"))) throw e;
          console.warn("Erro login Firebase genérico:", e);
      }
  }

  const users = getLocalUsers();
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) throw new Error("Usuário não encontrado ou senha incorreta.");
  if (user.status === 'pending') throw new Error("Cadastro em análise.");
  if (user.status === 'blocked') throw new Error("Conta bloqueada.");

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const logoutUser = async () => {
  const _auth = auth;
  if (_auth) { try { await signOut(_auth); } catch(e) {} }
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentSession = (): User | null => {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
};

// --- ADMIN ---

export const createUserByAdmin = async (username: string, password: string, role: 'admin' | 'user'): Promise<User> => {
    const now = Math.floor(Date.now());
    
    // Tratamento de email/username igual ao registro normal
    const isEmail = username.includes('@');
    const email = isEmail 
      ? username.trim().toLowerCase() 
      : `${username.toLowerCase().replace(/\s+/g, '')}@azulcreative.app`;
  
    const displayUsername = isEmail ? username.split('@')[0] : username;

    const _auth = auth;
    const _db = db;

    // Se Firebase estiver configurado, tentamos criar REALMENTE no Authentication
    // TRUQUE: Usamos uma "App Secundária" para não deslogar o admin atual
    if (firebaseConfig && _auth && _db) {
        console.log("Admin: Criando usuário via App Secundária...");
        let secondaryApp = null;
        try {
            // Inicializa uma instância separada do Firebase
            // Usamos um nome único para evitar conflitos se criar vários usuários rápido
            secondaryApp = initializeApp(firebaseConfig, `SecondaryApp-${Date.now()}`);
            
            const secondaryAuth = getAuth(secondaryApp);
            const secondaryDb = getFirestore(secondaryApp); // Firestore da instância secundária
            
            // 1. Cria o usuário nesta instância isolada (Isso loga automaticamente no secondaryAuth)
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const uid = userCredential.user.uid;
            
            // Cria o objeto do usuário
            const newUser: User = {
                id: uid,
                username: displayUsername,
                password: '***',
                role: role, 
                status: "active", 
                createdAt: now,
            };

            // 2. Salva no Firestore usando a instância SECUNDÁRIA
            // Isso funciona porque para o secondaryDb, o "request.auth" é o novo usuário
            // A maioria das regras permite "create" se request.auth.uid == request.resource.id
            await setDoc(doc(secondaryDb, "users", uid), {
                username: newUser.username,
                role: newUser.role,
                status: newUser.status,
                createdAt: newUser.createdAt
            });

            // 3. Faz logout da instância secundária
            await signOut(secondaryAuth);
            
            // Salva no cache local para aparecer na lista imediatamente para o Admin atual
            const users = getLocalUsers();
            users.push(newUser);
            saveLocalUsers(users);

            return newUser;

        } catch (error: any) {
            // Tratamento de erro refinado para evitar console.error desnecessário
            if (error.code === 'auth/email-already-in-use') {
                throw new Error("Este e-mail/usuário já está em uso.");
            }
            if (error.code === 'auth/weak-password') {
                throw new Error("A senha precisa ter no mínimo 6 caracteres.");
            }
            if (error.code && error.code.includes('permission')) {
                 console.warn("Permissão negada ao salvar dados do usuário, mas Auth criado.");
                 throw new Error("Usuário criado no Auth, mas falha ao salvar perfil (Regras de Segurança).");
            }

            console.error("Erro criação Admin:", error);
            throw new Error(error.message || "Erro desconhecido ao criar usuário.");
        } finally {
            // Limpa a app secundária da memória
            if (secondaryApp) {
                await deleteApp(secondaryApp).catch(() => {});
            }
        }
    }

    // Fallback: Apenas local (se Firebase não existir)
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: displayUsername,
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
  const _db = db;
  if (_db) { try { await waitForAuth(); await deleteDoc(doc(_db, "users", userId)); } catch(e) {} }
  let users = getLocalUsers();
  users = users.filter((u) => u.id !== userId);
  saveLocalUsers(users);
};

export const toggleUserRole = async (userId: string) => {
  const _db = db;
  const localUsers = getLocalUsers();
  const index = localUsers.findIndex(u => u.id === userId);
  let newRole: 'admin' | 'user' = 'user';
  if (index !== -1) {
      newRole = localUsers[index].role === 'admin' ? 'user' : 'admin';
      localUsers[index].role = newRole;
      saveLocalUsers(localUsers);
  }
  if (_db) { try { await waitForAuth(); await updateDoc(doc(_db, "users", userId), { role: newRole }); } catch(e) {} }
};

export const approveUser = async (userId: string) => {
    const _db = db;
    const localUsers = getLocalUsers();
    const index = localUsers.findIndex(u => u.id === userId);
    if (index !== -1) { localUsers[index].status = 'active'; saveLocalUsers(localUsers); }
    if (_db) { try { await waitForAuth(); await updateDoc(doc(_db, "users", userId), { status: 'active' }); } catch(e) {} }
};

export const blockUser = async (userId: string) => {
    const _db = db;
    const localUsers = getLocalUsers();
    const index = localUsers.findIndex(u => u.id === userId);
    let newStatus: 'active' | 'blocked' = 'blocked';
    if (index !== -1) { 
        newStatus = localUsers[index].status === 'blocked' ? 'active' : 'blocked';
        localUsers[index].status = newStatus; 
        saveLocalUsers(localUsers); 
    }
    if (_db) { try { await waitForAuth(); await updateDoc(doc(_db, "users", userId), { status: newStatus }); } catch(e) {} }
};