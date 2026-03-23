# Stock Control — Sukha

Aplicación web para control de stock con carga de ventas, ingresos/ajustes de stock, reportes e imágenes por producto.

## Features
- Productos: alta, búsqueda, stock mínimo (alerta), export CSV, imagen (subir/cambiar/quitar)
- Ventas: carga rápida por código o búsqueda por nombre, validación de stock
- Movimientos: historial por producto
- Stock: ingreso y ajuste
- Reportes: unidades y financiero por mes (imprimir/PDF)

## Stack
- Frontend: React + Vite + TailwindCSS
- Backend: Node.js + Express
- DB/Storage: Supabase (Postgres + Storage)

## Requisitos
- Node 18+
- Cuenta de Supabase

## Estructura
- `frontend-stock/`: UI (React)
- `Backend - Stock/`: API (Express)

## Configuración de Supabase
1) **Tabla productos**
- Columna: `imagen_url` (texto, nullable)

2) **Storage**
- Crear bucket: `product-images`
- Recomendado: **public** (para servir thumbnails sin firmar URLs)

## Variables de entorno

### Backend
Crear `Backend - Stock/.env` (copiar de `.env.example`):
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `APP_PIN`
- `PORT`

### Frontend
Crear `frontend-stock/.env` (copiar de `.env.example`):
- `VITE_API_URL`

## Correr en local

### Backend
```bash
npm install
npm run dev
```

### Frontend
```bash
npm install
npm run dev
```

Luego abrir la URL que imprime Vite.

## Deploy (overview)
- Frontend: Vercel
- Backend: Render
- Configurar `VITE_API_URL` (Vercel) apuntando al backend en Render.

## Notas de seguridad
- **No commitear `.env`**. Este repo usa `.env.example`.
- Si alguna key se expuso en commits, **rotarla** en Supabase.
