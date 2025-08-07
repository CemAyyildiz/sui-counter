import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/", // Vercel için root path
  build: {
    outDir: "dist", // Vercel için dist klasörü
  },
});
