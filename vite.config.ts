import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// vite.config.ts
export default defineConfig(({ mode }) => {
  // Using process.env instead of loadEnv for better compatibility in some environments
  const apiKey = process.env.VITE_API_KEY;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // This define block ensures that import.meta.env.VITE_API_KEY is replaced 
    // with the actual key value during the build process.
    define: {
      'import.meta.env.VITE_API_KEY': JSON.stringify(apiKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
