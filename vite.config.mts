import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/sui-counter/", // GitHub Pages için repo adı
  build: {
    outDir: "docs", // GitHub Pages docs klasörünü kullan
  },
});
