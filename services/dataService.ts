import { db } from "../lib/firebaseClient";
import { collection, addDoc, getDocs, query, where, orderBy, limit, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { GeneratedCreative } from "../types";

const MAX_ITEMS_PER_USER = 12;
const COLLECTION_NAME = "creatives";

const getLocalKey = (userId: string) => `AZUL_GALLERY_${userId}`;

// --- LOCAL STORAGE FALLBACK INTELIGENTE ---
const saveLocal = (userId: string, creative: GeneratedCreative) => {
    const key = getLocalKey(userId);
    let stored = null;
    try {
        stored = localStorage.getItem(key);
    } catch (e) { console.error("Erro ao ler localStorage", e); }
    
    let items: GeneratedCreative[] = stored ? JSON.parse(stored) : [];
    
    // Remove duplicatas por ID se houver
    items = items.filter(i => i.id !== creative.id);
    
    // Adiciona a nova no topo
    items = [creative, ...items];

    // Garante o limite máximo inicial
    if (items.length > MAX_ITEMS_PER_USER) {
        items = items.slice(0, MAX_ITEMS_PER_USER);
    }

    // Tenta salvar. Se der erro de cota, remove a última e tenta de novo.
    while (items.length > 0) {
        try {
            localStorage.setItem(key, JSON.stringify(items));
            break; // Sucesso, sai do loop
        } catch (e: any) {
            // Verifica se é erro de cota (espaço cheio)
            if (
                e.name === 'QuotaExceededError' || 
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                e.code === 22 || 
                e.message?.toLowerCase().includes('quota') ||
                e.message?.toLowerCase().includes('exceeded')
            ) {
                if (items.length === 1) {
                    // Se nem 1 imagem cabe, desiste para não travar o loop
                    console.warn("Armazenamento local crítico: Não há espaço nem para a imagem atual.");
                    break;
                }
                // Remove a imagem mais antiga (última do array) e tenta salvar novamente
                items.pop();
            } else {
                // Se for outro erro, lança
                throw e;
            }
        }
    }
    
    return items;
};

const getLocal = (userId: string): GeneratedCreative[] => {
    try {
        const stored = localStorage.getItem(getLocalKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
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
        await addDoc(collection(_db, COLLECTION_NAME), docData);

        // Limpeza automática (Manter apenas os últimos MAX_ITEMS na nuvem)
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
        // Ignora erro de cota ou tamanho excessivo na nuvem para não quebrar a UX
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
     try {
        localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));
     } catch(e) { console.error("Falha ao atualizar caption local", e); }

     const _db = db;
     if (!_db) return;

     try {
         // Firestore update
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
    try {
        localStorage.setItem(getLocalKey(userId), JSON.stringify(newLocalItems));
    } catch(e) {}

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