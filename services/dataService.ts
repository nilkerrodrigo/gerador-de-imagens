import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { GeneratedCreative } from "../types";

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
    if (!supabase) {
        return saveLocal(userId, creative);
    }

    try {
        // 2. Inserir o novo criativo
        // Removemos o ID gerado localmente para deixar o Postgres gerar o UUID
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...creativeData } = creative; 

        const { error: insertError } = await supabase
            .from('creatives')
            .insert([{
                user_id: userId, 
                image_data: creative.url, // Base64
                settings: creative.settings,
                caption: creative.caption || null,
                created_at: new Date().toISOString()
            }]);

        if (insertError) throw insertError;

        // 3. Gerenciar limite (Manter apenas os últimos X)
        const { data: allItems, error: fetchError } = await supabase
            .from('creatives')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!fetchError && allItems && allItems.length > MAX_ITEMS_PER_USER) {
            const itemsToDelete = allItems.slice(MAX_ITEMS_PER_USER).map(i => i.id);
            if (itemsToDelete.length > 0) {
                await supabase.from('creatives').delete().in('id', itemsToDelete);
            }
        }

        return await fetchCreatives(userId);

    } catch (error) {
        console.error("Erro ao salvar no Supabase, usando fallback local:", error);
        return saveLocal(userId, creative);
    }
};

export const fetchCreatives = async (userId: string): Promise<GeneratedCreative[]> => {
    if (!supabase) {
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

        return (data || []).map((item: any) => ({
            id: item.id,
            url: item.image_data,
            timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
            caption: item.caption,
            settings: item.settings
        }));

    } catch (error) {
        console.error("Erro ao buscar do Supabase:", error);
        return getLocal(userId);
    }
};

export const updateCaptionInDb = async (creativeId: string, caption: string, userId: string) => {
     // Atualiza Localmente sempre para garantir consistência visual imediata
     const items = getLocal(userId);
     const updated = items.map(i => i.id === creativeId ? { ...i, caption } : i);
     localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));

     if (!supabase) {
        return;
    }

    try {
        const { error } = await supabase
            .from('creatives')
            .update({ caption: caption })
            .eq('id', creativeId)
            .eq('user_id', userId); 

        if (error) throw error;

    } catch (e) {
        console.error("Erro ao atualizar legenda no Supabase", e);
    }
};