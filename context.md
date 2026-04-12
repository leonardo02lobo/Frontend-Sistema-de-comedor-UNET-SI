> **Contexto:** Estoy desarrollando un sistema de comedor universitario con Astro (ver estructura adjunta). Actualmente depende de un backend externo, pero quiero eliminarlo. Mi objetivo es que el proyecto sea autónomo: los datos se guardarán en archivos JSON locales y las imágenes se subirán a una carpeta dentro del frontend.
>
> **Tarea:** Genera la lógica necesaria para que el Dashboard pueda realizar operaciones de escritura (POST/PUT/DELETE) directamente sobre archivos JSON locales y gestionar la subida de archivos.
>
> **Requerimientos Técnicos:**
> 1. **Adaptador SSR:** Configura el proyecto para usar `@astrojs/node` en modo `server` o `hybrid`, permitiendo usar el módulo `fs` de Node.js para manipular archivos en el servidor.
> 2. **Capa de Datos (Database Local):** >    - Crea un archivo `src/lib/db.ts` que centralice la lectura y escritura de los JSON en la carpeta `/data/` (raíz del proyecto). 
>    - Implementa funciones tipo `getData(file)` y `saveData(file, data)` con manejo de errores.
> 3. **Estructura JSON (Basada en SQL):** Define interfaces TypeScript y archivos JSON iniciales para:
>    - `admins.json`: (Precargar un administrador con username `admin` y rol `ADMIN`).
>    - `lunches.json`: Debe incluir el campo `imagen_url` para guardar la ruta del archivo.
>    - `menus.json` y `tickets.json`.
> 4. **API Endpoints Internos:** Crea los archivos en `src/pages/api/` para:
>    - `api/lunches.ts`: Para recibir nuevos platos desde el dashboard y agregarlos al JSON.
>    - `api/upload.ts`: Para procesar una imagen de un formulario (FormData), guardarla en `/public/uploads/` y retornar la URL estática.
> 5. **Flujo del Dashboard:** Proporciona un ejemplo de cómo un componente de Astro o un Script en el cliente debe hacer el `fetch` al API local para enviar los datos y la imagen simultáneamente.
>
> **Restricción:** No uses bases de datos externas ni librerías pesadas. Solo Node.js nativo (`fs`, `path`) y las capacidades estándar de Astro.

***

### Estructura de Datos JSON que se generará

Para que tu sistema sea compatible con lo que ya tienes, los archivos JSON seguirán esta lógica:

| Archivo | Relación Clave | Propósito |
| :--- | :--- | :--- |
| **admins.json** | `id` | Autenticación y gestión de permisos. |
| **lunches.json** | `admin_id` | Catálogo de platos con ingredientes y **ruta de imagen**. |
| **menus.json** | `lunch_id` | Oferta diaria (stock y precios actuales). |
| **tickets.json** | `menu_id` | Registro de pedidos y estados de entrega. |

### ¿Cómo funcionará el flujo de imágenes?

1.  **En el Dashboard:** Al crear un nuevo plato (Lunch), seleccionarás la imagen.
2.  **API Local:** Al dar clic en "Guardar", el frontend enviará la imagen a un endpoint interno (`/api/upload`).
3.  **Almacenamiento:** Astro guardará el archivo en `tu-proyecto/public/uploads/comida.jpg`.
4.  **Persistencia:** La ruta `/uploads/comida.jpg` se escribirá automáticamente en el campo `imagen_url` dentro de tu archivo `lunches.json`.
