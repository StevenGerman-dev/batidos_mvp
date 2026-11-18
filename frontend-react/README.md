
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
=======
# Batidos MVP · Frontend (React)

Interfaz del sistema de ventas de batidos. Incluye el **formulario de Registro de
Ventas** (tarea SCRUM-5): Fecha, Producto, Cantidad y Total Cobrado, con botón
**Guardar Venta**.

## Requisitos

- Node.js LTS
- npm

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Compilar para producción

```bash
npm run build
```

El resultado queda en `dist/`.

## Conexión con el backend PHP/MySQL

Por defecto trabaja en **modo local**: las ventas se guardan en `localStorage`
para probar la pantalla sin servidor.

Para conectar la API, crea un `.env` en esta carpeta:

```env
VITE_API_URL=http://localhost/batidos_mvp/backend-php
```

Con esa variable definida, el servicio usa:

- `GET  {VITE_API_URL}/ventas.php` → listado de ventas
- `POST {VITE_API_URL}/ventas.php` → registrar una venta

El `POST` envía los campos de la tabla `ventas` del esquema `batidos_mvp.sql`:

```json
{
  "id": "uuid",
  "fecha": "2026-11-06",
  "producto": "Batido de frutilla",
  "cantidad": 2,
  "total": 8.5,
  "registradaEn": "2026-11-06T15:04:05.000Z"
}
```

> Nota: el `id` y `registradaEn` los genera el frontend para el modo local; el
> backend debe ignorarlos y usar el `AUTO_INCREMENT` de la tabla.

## Estructura

```
frontend-react/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── components/
    │   ├── FormularioVenta.jsx   # Formulario, validación e historial
    │   └── FormularioVenta.css
    ├── services/
    │   └── ventas.js             # Registro/listado (API o localStorage)
    ├── App.jsx
    ├── main.jsx
    └── index.css
```

## Validaciones

| Campo | Regla |
|---|---|
| Fecha | Obligatoria |
| Producto | Obligatorio, mínimo 2 caracteres |
| Cantidad | Entero mayor a 0 |
| Total cobrado | Número mayor o igual a 0 |

## Rama de trabajo

```bash
git checkout -b feature/SCRUM-5-ventas
```
