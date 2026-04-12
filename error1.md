Este error de **SyntaxError** suele ocurrir en Astro cuando se utilizan **View Transitions** (Client Router) y se declaran variables con `const` o `let` globalmente dentro de una etiqueta `<script>`. Al navegar, Astro vuelve a ejecutar el script y falla al intentar redeclarar la misma constante.

```text
Actúa como experto en Astro (SSR) y  Node.js. Mi proyecto es un "Sistema de Comedor" que usa archivos JSON en /data/ como base de datos y Astro en modo 'server'. Tengo errores críticos de persistencia y ejecución que debemos arreglar.

**ERRORES A SOLUCIONAR:**
1. **SyntaxError (Redeclaración):** El error "Identifier 'FALLBACK_IMAGE' has already been declared" ocurre al navegar. Debes encapsular todos los scripts del lado del cliente en un evento 'astro:page-load' o usar bloques de alcance `{}` para evitar colisiones de variables globales al usar el Client Router.
2. **Falla en Login:** La sesión no persiste o no reconoce las credenciales del JSON tras recargar. Asegúrate de que `src/lib/session.ts` valide contra `data/admins.json` y que, tras el éxito, use `Astro.cookies` para mantener la sesión y redirigir correctamente a `/dashboard` o `/`.
3. **Historial Vacío:** El componente de historial no está filtrando o mapeando correctamente los datos de `tickets.json` con `menus.json` y `lunches.json`. Necesito una función que haga el "join" de estos JSONs para mostrar el nombre del plato en el historial.
4. **Redirecciones de Dashboard:** Tras cualquier acción POST (crear plato, editar stock), el endpoint debe retornar un `Response.redirect` o el cliente debe ejecutar un `Maps('/dashboard')` para refrescar la vista.

**REQUERIMIENTOS TÉCNICOS ESPECÍFICOS:**

1. **Gestión de JSON (src/lib/db.ts):**
   - Crea funciones robustas de lectura/escritura usando 'node:fs/promises'.
   - Asegura que los tipos coincidan con el esquema SQL original (Admins, Lunches, Menus, Tickets).
   - El admin precargado debe ser: { "username": "admin", "password_hash": "123", "role": "ADMIN" }.

2. **Flujo de Imágenes y Dashboard:**
   - Endpoint `src/pages/api/lunches.ts`: Debe procesar el FormData, guardar la imagen en `public/uploads/` usando un nombre único (timestamp), actualizar `lunches.json` y redirigir al Dashboard.

3. **Seguridad y Validación:**
   - Valida que antes de escribir en el JSON, los datos cumplan con las interfaces de TypeScript.
   - Si el usuario no está logueado, redirige desde el servidor en las páginas protegidas.

**ENTREGABLES:**
- Código corregido de `src/lib/db.ts`.
- Script de cliente para las páginas que evite el error de redeclaración de variables.
- Lógica de la página `/history` para que muestre los platos reales consultando los JSONs.
- Lógica de autenticación corregida en `/login`.
```

---

### Por qué fallan tus puntos actuales:

* **Punto 1 (Login):** Es probable que estés validando la sesión solo en el lado del cliente. Al recargar, el estado se pierde. Al usar **SSR**, la validación debe ocurrir en el servidor leyendo la cookie y comparándola con tu `admins.json`.
* **Punto 2 (Historial):** Como eliminaste el backend, el historial ahora debe hacer un "triple fetch" local o una función en el servidor que busque el `menu_id` del ticket, luego el `lunch_id` del menú, para finalmente obtener el nombre del plato en `lunches.json`.
* **Punto 3 (Redirección):** En Astro SSR, la mejor forma es que tu `Actions` o `API Endpoints` devuelvan una cabecera de redirección:
    ```typescript
    return new Response(null, {
      status: 302,
      headers: { Location: '/dashboard' }
    });
    ```
* **Error de SyntaxError:** Se soluciona envolviendo tu código de esta forma:
    ```javascript
    document.addEventListener('astro:page-load', () => {
       const FALLBACK_IMAGE = "..."; // Ya no dará error al navegar
       // Tu lógica aquí
    });
    ```