import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Rutas relativas: funciona igual en stockito.online/ que en <usuario>.github.io/stockitoonline/
  base: "./",
  plugins: [react(), tailwindcss()],
});
