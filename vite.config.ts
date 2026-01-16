import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente
  // Em ambiente Node (build), process.cwd() funciona.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/', 
    plugins: [react()],
    define: {
      // Injetamos a chave diretamente no import.meta.env para uso seguro no frontend
      'import.meta.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});