# Sistema de Comedor - Frontend

Frontend del sistema de comedor para estudiantes. Esta aplicacion esta construida con Astro y organiza las vistas por paginas y componentes reutilizables. El objetivo principal es ofrecer un flujo claro para iniciar sesion, consultar el menu, generar ticket, revisar historial y gestionar el perfil.

## Stack

- Astro para el framework y el enrutamiento por archivos
- TypeScript para scripts de validacion y utilidades
- CSS global para estilos base y componentes

## Estructura del proyecto

```text
/
├── public/                # Archivos estaticos
├── src/
│   ├── components/        # Componentes UI reutilizables
│   ├── feature/           # Vistas por dominio (dashboard, menu, ticket, etc.)
│   ├── layout/            # Layout base
│   ├── lib/               # Utilidades (sesion, helpers)
│   ├── pages/             # Rutas (paginas Astro)
│   ├── script/            # Validaciones y scripts de soporte
│   └── styles/            # Estilos globales
└── package.json
```

## Rutas principales

- Inicio de sesion: `/login`
- Dashboard: `/dashboard`
- Menu: `/meals-list`
- Ticket: `/ticket`
- Historial: `/history`
- Perfil: `/profile`
- Escaneo y verificacion: `/escanear`, `/verificacion`

## Desarrollo local

```sh
npm install
npm run dev
```

La aplicacion se levanta en `http://localhost:4321`.

## Prueba rapida del historial

Con el backend corriendo en `http://localhost:3001`, puedes generar datos demo para `/history` con:

```sh
npm run seed:history
```

Ese comando:
- inicia sesion con el admin de prueba del backend
- limpia tickets demo anteriores
- crea tickets de ejemplo en varias fechas

Credenciales demo esperadas en el backend:
- email: `admin@comedor.unet`
- password: `hash_de_prueba`

## Build y preview

```sh
npm run build
npm run preview
```

## Notas

- Las paginas viven en `src/pages` y definen las rutas automaticamente.
- Los componentes reutilizables estan en `src/components`.
- La logica de sesion esta en `src/lib/session.ts`.
