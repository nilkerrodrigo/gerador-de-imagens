import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega todas as variáveis de ambiente
  // @ts-ignore
  const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '.';
  const env = loadEnv(mode, cwd, '');
  
  // Tenta encontrar a chave em várias variações possíveis
  const apiKey = env.API_KEY || env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  
  return {
    base: '/', 
    plugins: [react()],
    build: {
      target: 'es2020', // Garante suporte a BigInt
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2020',
      },
    },
    define: {
      // Injeta a chave encontrada na variável interna que o app espera
      'import.meta.env.API_KEY': JSON.stringify(apiKey),
      // Injeta process.env.API_KEY para compatibilidade com o SDK do Google GenAI
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});
