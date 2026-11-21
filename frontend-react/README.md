# Batidos MVP

Sistema de ventas de batidos con React + Vite en el frontend y PHP + MySQL en el backend.

## Módulos

| Módulo | Descripción |
|---|---|
| **Ventas** | Registro de ventas con selección de insumos. Descuenta stock y congela el costo unitario en `detalle_ventas`. |
| **Rentabilidad** | Consulta analítica que muestra costo, ganancia y margen por producto vendido, con filtros por fecha y producto. |
| **Mermas** | Registro de desperdicios (descuentan stock) y ajustes de inventario (suman stock), con auditoría de stock anterior/nuevo. |

## Requisitos

- Node.js LTS y npm
- PHP 8.1+ con extensión `mysqli`
- MySQL 8+

## Backend

1. Crea la base de datos e importa `backend-php/batidos_mvp.sql`.
2. Si ya tenías la base del MVP, aplica `backend-php/migracion_rentabilidad_mermas.sql` en su lugar.
3. Sirve la carpeta `backend-php` con Apache/WAMP en `http://localhost:8000` (o el puerto que uses).

### Variables de entorno opcionales

| Variable | Default |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_NAME` | `batidos_mvp` |
| `DB_USER` | `root` |
| `DB_PASS` | vacío |
| `CORS_ORIGIN` | `*` |

### Endpoints

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/insumos.php` | Catálogo de insumos con stock y costo unitario |
| `GET` | `/ventas.php` | Historial de ventas con costo calculado |
| `POST` | `/ventas.php` | Registra venta + detalle de insumos y descuenta stock |
| `GET` | `/rentabilidad.php` | Métricas de rentabilidad (acepta `desde`, `hasta`, `producto`) |
| `GET` | `/mermas.php` | Historial de mermas y ajustes |
| `POST` | `/mermas.php` | Registra merma/ajuste y actualiza stock en una transacción |

Ejemplo de `POST /ventas.php`:

```json
{
  "fecha": "2026-11-21",
  "producto": "Batido de frutilla",
  "cantidad": 2,
  "total": 8.5,
  "usuario_id": 1,
  "insumos": [
    { "insumo_id": 1, "cantidad_usada": 2 },
    { "insumo_id": 2, "cantidad_usada": 0.5 },
    { "insumo_id": 3, "cantidad_usada": 2 }
  ]
}
```

Ejemplo de `POST /mermas.php`:

```json
{
  "fecha": "2026-11-21",
  "insumo_id": 2,
  "tipo": "MERMA",
  "cantidad": 1.5,
  "motivo": "Derrame",
  "observaciones": "Derrame durante el servicio",
  "usuario_id": 1
}
```

## Frontend

```bash
cd frontend-react
npm install
npm run dev
```

Abre `http://localhost:5173`.

Para conectarte a la API crea `frontend-react/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Sin esa variable los módulos funcionan en modo demostración usando `localStorage`, con los mismos cálculos de costo y mermas.

## Cálculo de rentabilidad

La vista `vw_rentabilidad_ventas` calcula:

- `costo_total = Σ(cantidad_usada × costo_unitario)`
- `ganancia = total_cobrado − costo_total`
- `margen_porcentaje = (ganancia / total_cobrado) × 100`
- `ganancia_por_unidad = ganancia / cantidad vendida`

Se usa el `costo_unitario` guardado en `detalle_ventas` (costo congelado al vender). Si por datos antiguos ese valor es `0`, se usa el costo vigente de `insumos` como respaldo.

## Estructura relevante

```
backend-php/
├── config.php
├── insumos.php
├── ventas.php
├── rentabilidad.php
├── mermas.php
├── batidos_mvp.sql
└── migracion_rentabilidad_mermas.sql

frontend-react/src/
├── components/
│   ├── FormularioVenta.jsx
│   ├── Rentabilidad.jsx
│   └── RegistroMermas.jsx
└── services/
    ├── api.js
    ├── insumos.js
    ├── ventas.js
    ├── rentabilidad.js
    └── mermas.js
```
