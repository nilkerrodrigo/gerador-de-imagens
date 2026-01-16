import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (dev/prod)
  // process.cwd() é padrão em Node.js e suportado pelo Vite config
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    base: '/', 
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});