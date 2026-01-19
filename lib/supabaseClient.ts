// MÓDULO DESATIVADO: O projeto migrou para Firebase.
// A importação do Supabase foi removida para evitar erros de build (Module not found),
// já que a biblioteca não está no package.json.

export const supabase = null;

export const isSupabaseConfigured = () => {
    return false;
};