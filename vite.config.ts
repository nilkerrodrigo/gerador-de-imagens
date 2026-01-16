import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega todas as variáveis de ambiente
  const env = loadEnv(mode, process.cwd(), '');
  
  // Tenta encontrar a chave em várias variações possíveis
  const apiKey = env.API_KEY || env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  
  return {
    base: '/', 
    plugins: [react()],
    define: {
      // Injeta a chave encontrada na variável interna que o app espera
      'import.meta.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});