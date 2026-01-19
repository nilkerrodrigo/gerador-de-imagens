import { db } from "../lib/firebaseClient";
import { collection, addDoc, getDocs, query, where, orderBy, limit, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { GeneratedCreative } from "../types";

const MAX_ITEMS_PER_USER = 12;
const COLLECTION_NAME = "creatives";

const getLocalKey = (userId: string) => `AZUL_GALLERY_${userId}`;

// --- LOCAL STORAGE FALLBACK ---
const saveLocal = (userId: string, creative: GeneratedCreative) => {
    const key = getLocalKey(userId);
    const stored = localStorage.getItem(key);
    let items: GeneratedCreative[] = stored ? JSON.parse(stored) : [];
    
    // Remove duplicatas por ID se houver
    items = items.filter(i => i.id !== creative.id);
    
    items = [creative, ...items];
    if (items.length > MAX_ITEMS_PER_USER) {
        items = items.slice(0, MAX_ITEMS_PER_USER);
    }
    localStorage.setItem(key, JSON.stringify(items));
    return items;
};

const getLocal = (userId: string): GeneratedCreative[] => {
    const stored = localStorage.getItem(getLocalKey(userId));
    return stored ? JSON.parse(stored) : [];
};

// --- FIRESTORE OPERATIONS ---

export const saveCreative = async (userId: string, creative: GeneratedCreative): Promise<GeneratedCreative[]> => {
    const _db = db;
    if (!_db) {
        return saveLocal(userId, creative);
    }

    try {
        const timestamp = Math.floor(Date.now());
        
        // Firestore Data
        const docData = {
            user_id: userId,
            image_data: creative.url, // Base64 string
            settings: creative.settings,
            caption: creative.caption || null,
            created_at: timestamp
        };

        // Salvar no Firestore
        // Nota: creative.id local é sobrescrito pelo ID do Firestore, mas mantemos referência se precisar
        await addDoc(collection(_db, COLLECTION_NAME), docData);

        // Limpeza automática (Manter apenas os últimos MAX_ITEMS)
        const q = query(
            collection(_db, COLLECTION_NAME), 
            where("user_id", "==", userId),
            orderBy("created_at", "desc")
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.size > MAX_ITEMS_PER_USER) {
            const docsToDelete = snapshot.docs.slice(MAX_ITEMS_PER_USER);
            for (const d of docsToDelete) {
                await deleteDoc(doc(_db, COLLECTION_NAME, d.id));
            }
        }

        return await fetchCreatives(userId);

    } catch (error: any) {
        // Se der erro (ex: imagem muito grande para documento > 1MB ou permissão), salva localmente
        if (error.code === 'resource-exhausted' || error.message.includes('size')) {
            console.warn("Imagem muito grande para a nuvem. Salvando apenas localmente.");
        }
        return saveLocal(userId, creative);
    }
};

export const fetchCreatives = async (userId: string): Promise<GeneratedCreative[]> => {
    const _db = db;
    if (!_db) {
        return getLocal(userId);
    }

    try {
        const q = query(
            collection(_db, COLLECTION_NAME),
            where("user_id", "==", userId),
            orderBy("created_at", "desc"),
            limit(MAX_ITEMS_PER_USER)
        );

        const querySnapshot = await getDocs(q);
        const items: GeneratedCreative[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
                id: doc.id,
                url: data.image_data,
                timestamp: data.created_at,
                caption: data.caption,
                settings: data.settings
            });
        });

        // Se não tiver nada na nuvem, tenta pegar local (modo híbrido)
        if (items.length === 0) return getLocal(userId);
        return items;

    } catch (error: any) {
        if (error.code === 'permission-denied') {
            return getLocal(userId);
        }
        console.error("Erro ao buscar do Firestore:", error);
        return getLocal(userId);
    }
};

export const updateCaptionInDb = async (creativeId: string, caption: string, userId: string) => {
     // Update Local
     const items = getLocal(userId);
     const updated = items.map(i => i.id === creativeId ? { ...i, caption } : i);
     localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));

     const _db = db;
     if (!_db) return;

     try {
         // Firestore update
         // Tenta atualizar assumindo que creativeId é um ID válido do Doc
         const creativeRef = doc(_db, COLLECTION_NAME, creativeId);
         await updateDoc(creativeRef, { caption: caption });
     } catch (e) {
         // Se falhar (ex: ID local), ignora silenciosamente
     }
};

export const deleteCreative = async (userId: string, creativeId: string): Promise<GeneratedCreative[]> => {
    // 1. Deletar Localmente
    const localItems = getLocal(userId);
    const newLocalItems = localItems.filter(i => i.id !== creativeId);
    localStorage.setItem(getLocalKey(userId), JSON.stringify(newLocalItems));

    const _db = db;
    if (!_db) return newLocalItems;

    // 2. Deletar da Nuvem
    try {
        await deleteDoc(doc(_db, COLLECTION_NAME, creativeId));
        // Retorna a lista atualizada da nuvem
        return await fetchCreatives(userId);
    } catch (e) {
        // Se falhar na nuvem (ex: era um item apenas local), retorna a lista local filtrada
        return newLocalItems;
    }
};