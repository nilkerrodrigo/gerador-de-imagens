import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { GeneratedCreative, User } from "../types";

const MAX_ITEMS_PER_USER = 12; // Limite para economizar banco de dados

// --- LOCAL STORAGE FALLBACKS ---
const getLocalKey = (userId: string) => `AETHER_GALLERY_${userId}`;

const saveLocal = (userId: string, creative: GeneratedCreative) => {
    const key = getLocalKey(userId);
    const stored = localStorage.getItem(key);
    let items: GeneratedCreative[] = stored ? JSON.parse(stored) : [];
    
    // Adiciona o novo no início
    items = [creative, ...items];
    
    // Mantém apenas os últimos X
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

// --- SUPABASE LOGIC ---

export const saveCreative = async (userId: string, creative: GeneratedCreative): Promise<GeneratedCreative[]> => {
    // 1. Fallback para LocalStorage se Supabase não estiver configurado
    if (!isSupabaseConfigured() || !supabase) {
        return saveLocal(userId, creative);
    }

    try {
        // 2. Inserir o novo criativo
        const { error: insertError } = await supabase
            .from('creatives')
            .insert([{
                user_id: userId, // Em produção, idealmente usaríamos o ID do auth.users
                image_data: creative.url, // Base64 ou URL pública
                settings: creative.settings,
                created_at: new Date().toISOString()
            }]);

        if (insertError) throw insertError;

        // 3. Gerenciar limite (Manter apenas os últimos X)
        // Primeiro, pegamos todos os IDs ordenados por data (do mais novo para o mais velho)
        const { data: allItems, error: fetchError } = await supabase
            .from('creatives')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!fetchError && allItems && allItems.length > MAX_ITEMS_PER_USER) {
            // Identificar quais deletar (todos após o índice MAX_ITEMS_PER_USER - 1)
            const itemsToDelete = allItems.slice(MAX_ITEMS_PER_USER).map(i => i.id);
            
            if (itemsToDelete.length > 0) {
                await supabase
                    .from('creatives')
                    .delete()
                    .in('id', itemsToDelete);
            }
        }

        return await fetchCreatives(userId);

    } catch (error) {
        console.error("Erro ao salvar no Supabase, usando fallback local:", error);
        return saveLocal(userId, creative);
    }
};

export const fetchCreatives = async (userId: string): Promise<GeneratedCreative[]> => {
    if (!isSupabaseConfigured() || !supabase) {
        return getLocal(userId);
    }

    try {
        const { data, error } = await supabase
            .from('creatives')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(MAX_ITEMS_PER_USER);

        if (error) throw error;

        // Mapear do formato DB para formato App
        return (data || []).map((item: any) => ({
            id: item.id,
            url: item.image_data,
            timestamp: new Date(item.created_at).getTime(),
            caption: item.caption, // Supondo que adicionaremos essa coluna
            settings: item.settings
        }));

    } catch (error) {
        console.error("Erro ao buscar do Supabase:", error);
        return getLocal(userId);
    }
};

export const updateCaptionInDb = async (creativeId: string, caption: string, userId: string) => {
     if (!isSupabaseConfigured() || !supabase) {
        // Atualiza localmente
        const items = getLocal(userId);
        const updated = items.map(i => i.id === creativeId ? { ...i, caption } : i);
        localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));
        return;
    }

    try {
        // Tenta atualizar no Supabase (assumindo que o ID do banco bate, mas aqui o ID local é gerado randomicamente no mock)
        // NOTA: Num cenário real full-supabase, o ID seria UUID do banco.
        // Como estamos num ambiente híbrido, isso pode falhar se o item não existir no banco.
        // Vamos apenas tentar atualizar baseados no created_at ou id se for compatível.
        
        // Para simplificar este passo de "preparação", vamos assumir que o fluxo principal é salvar novo.
        // A atualização de legenda exigiria que o ID local fosse o mesmo do banco.
        
        // Solução Híbrida Simplificada: Atualizar Local também para garantir UI responsiva
        const items = getLocal(userId);
        const updated = items.map(i => i.id === creativeId ? { ...i, caption } : i);
        localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));

    } catch (e) {
        console.error("Erro ao atualizar legenda", e);
    }
}
