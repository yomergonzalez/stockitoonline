import React from "react";
import ReactDOM from "react-dom/client";
import InventarioNespresso from "./InventarioNespresso";
import "./index.css";

// La app fue escrita para el entorno de "artifacts", donde existe window.storage.
// En un navegador real ese API no existe, así que lo respaldamos con localStorage
// para que el conteo se guarde de verdad. El componente queda intacto.
const w = window as any;
if (!w.storage) {
  w.storage = {
    get: async (key: string) => ({ value: localStorage.getItem(key) }),
    set: async (key: string, value: string) => {
      localStorage.setItem(key, value);
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <InventarioNespresso />
  </React.StrictMode>
);
