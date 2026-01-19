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
    if (!db) {
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
        await addDoc(collection(db, COLLECTION_NAME), docData);

        // Limpeza automática (Manter apenas os últimos MAX_ITEMS)
        // Nota: Firestore não tem "capped collections" nativas simples, 
        // então buscamos todos e deletamos os excedentes.
        const q = query(
            collection(db, COLLECTION_NAME), 
            where("user_id", "==", userId),
            orderBy("created_at", "desc")
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.size > MAX_ITEMS_PER_USER) {
            const docsToDelete = snapshot.docs.slice(MAX_ITEMS_PER_USER);
            for (const d of docsToDelete) {
                await deleteDoc(doc(db, COLLECTION_NAME, d.id));
            }
        }

        return await fetchCreatives(userId);

    } catch (error: any) {
        console.error("Erro ao salvar no Firestore:", error);
        // Se der erro (ex: imagem muito grande para documento > 1MB), salva localmente
        if (error.code === 'resource-exhausted' || error.message.includes('size')) {
            alert("Imagem muito grande para a nuvem. Salvando apenas localmente.");
        }
        return saveLocal(userId, creative);
    }
};

export const fetchCreatives = async (userId: string): Promise<GeneratedCreative[]> => {
    if (!db) {
        return getLocal(userId);
    }

    try {
        const q = query(
            collection(db, COLLECTION_NAME),
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

        if (items.length === 0) return getLocal(userId);
        return items;

    } catch (error) {
        console.error("Erro ao buscar do Firestore:", error);
        return getLocal(userId);
    }
};

export const updateCaptionInDb = async (creativeId: string, caption: string, userId: string) => {
     // Update Local
     const items = getLocal(userId);
     const updated = items.map(i => i.id === creativeId ? { ...i, caption } : i);
     localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));

     if (!db) return;

     try {
         // Firestore update requires the doc ID. 
         // Se o creativeId for um ID do Firestore, funciona direto.
         // Se for local (gerado com Math.random), vai falhar, e tudo bem (fica só local).
         const creativeRef = doc(db, COLLECTION_NAME, creativeId);
         await updateDoc(creativeRef, { caption: caption });
     } catch (e) {
         console.warn("Não foi possível atualizar legenda na nuvem (provavelmente item local).");
     }
};
