import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      port: 8080
    },
    proxy: {
      '/api': {
        target: 'http://localhost:7263',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          console.log('Proxy configurado para /api -> http://localhost:7263');
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "/home/avivas/selfservice/Frente",
    emptyOutDir: true,
  },
}));
