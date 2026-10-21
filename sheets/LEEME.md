# Conectar Stockito con Google Sheets

Cada vez que alguien toca **Guardar** en el resumen (o reinicia el conteo), el conteo se guarda en
una hoja de Google tuya, con el **apodo** de quien contó. Cada apodo solo ve sus propios conteos en
la app. La hoja es privada: solo tú la ves; la app habla con ella a través de un pequeño script.

Se hace una sola vez y lleva unos 10 minutos.

## 1. Crear la hoja

1. Entra en <https://sheets.new> con tu cuenta de Google (crea una hoja nueva).
2. Ponle un nombre arriba a la izquierda, por ejemplo **Stockito – conteos**.

## 2. Pegar el script

1. En la hoja: menú **Extensiones → Apps Script**. Se abre una pestaña nueva con un editor.
2. Borra todo lo que hay en el archivo `Código.gs` (`Code.gs`).
3. Copia **todo** el contenido de [`Code.gs`](Code.gs) y pégalo ahí.
4. Pulsa el icono de **guardar** (💾).

## 3. Publicarlo como aplicación web

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. En "Seleccionar tipo" (el engranaje ⚙️) elige **Aplicación web**.
3. Rellena:
   - **Descripción:** Stockito
   - **Ejecutar como:** **Yo** (tu correo)
   - **Quién tiene acceso:** **Cualquier persona**
4. Pulsa **Implementar**.
5. Google pedirá permiso: **Autorizar acceso** → elige tu cuenta → si aparece
   "Google no ha verificado esta aplicación", pulsa **Configuración avanzada → Ir a Stockito (no seguro)**
   → **Permitir**. Es normal: el script es tuyo y solo toca esta hoja.
6. Copia la **URL de la aplicación web** (empieza por `https://script.google.com/macros/s/` y
   termina en `/exec`).

## 4. Conectar la app

Pega esa URL en `SHEETS_URL`, al principio de
[`src/InventarioNespresso.tsx`](../src/InventarioNespresso.tsx), y sube el cambio a `main`
(o pásasela a Claude para que lo haga).

## Qué verás en la hoja

- **Conteos:** una fila por cada color/producto con cantidad mayor que 0: ID, fecha, apodo,
  categoría, modelo, marca, color y cantidad. Puedes filtrar por apodo o fecha.
- **Datos:** una fila por conteo con todos los datos en formato técnico. La usa la app para
  mostrar el historial — **no la edites**.

## Si cambias el script más adelante

Después de editar `Code.gs`: **Implementar → Gestionar implementaciones → ✏️ (editar) →
Versión: Nueva versión → Implementar**. Así la URL sigue siendo la misma.

## A tener en cuenta

- El apodo no es una contraseña: quien escriba el mismo apodo verá esos conteos.
- Sin internet, los conteos quedan "pendiente de enviar" en el teléfono y se suben solos después.
- El conteo que se está haciendo (sin guardar) sigue estando solo en el teléfono.
