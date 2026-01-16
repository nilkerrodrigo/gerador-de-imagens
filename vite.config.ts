import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    base: '/', // Garante caminhos absolutos para assets
    plugins: [react()],
    define: {
      // Garante que process.env.API_KEY funcione no código client-side após o build
      // Na Hostinger, adicione API_KEY nas Environment Variables do projeto
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});