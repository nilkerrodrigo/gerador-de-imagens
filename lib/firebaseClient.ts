import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração EXPLÍCITA para garantir a conexão
export const firebaseConfig = {
  apiKey: "AIzaSyBEGBELgoAcrwdPDhaxy8jxq0Pt6xoSjI8",
  authDomain: "azul-creative-ia.firebaseapp.com",
  projectId: "azul-creative-ia",
  storageBucket: "azul-creative-ia.firebasestorage.app",
  messagingSenderId: "343989049175",
  appId: "1:343989049175:web:411f464ea7a61390325012"
};

// Verifica se as chaves críticas existem (agora sempre existirão)
const isConfigured = 
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain && 
    firebaseConfig.projectId;

let app = null;
let auth = null;
let db = null;

if (isConfigured) {
    try {
        console.log("🔥 Inicializando Firebase com Projeto:", firebaseConfig.projectId);
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("✅ Firebase conectado com sucesso!");
    } catch (e) {
        console.error("❌ Erro CRÍTICO ao inicializar Firebase:", e);
    }
} else {
    console.warn("⚠️ Firebase não configurado. O app rodará em modo LOCAL.");
}

export { auth, db };
export const isFirebaseConfigured = () => !!app;