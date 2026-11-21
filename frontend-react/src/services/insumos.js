import { request, usarApi } from './api'

const CLAVE_ALMACEN = 'insumos_batidos'

export const INSUMOS_BASE = [
  {
    id: 1,
    nombre: 'Pulpa de Frutilla',
    stock_actual: 15,
    unidad_medida: 'unidades',
    costo_unitario: 1.2,
    stock_minimo: 5,
    alerta_stock: false,
  },
  {
    id: 2,
    nombre: 'Leche Entera',
    stock_actual: 20,
    unidad_medida: 'litros',
    costo_unitario: 0.9,
    stock_minimo: 5,
    alerta_stock: false,
  },
  {
    id: 3,
    nombre: 'Vasos 16oz',
    stock_actual: 100,
    unidad_medida: 'unidades',
    costo_unitario: 0.35,
    stock_minimo: 20,
    alerta_stock: false,
  },
]

function guardarInsumosLocales(insumos) {
  window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(insumos))
}

function leerInsumosLocales() {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACEN)

    if (!crudo) {
      guardarInsumosLocales(INSUMOS_BASE)
      return [...INSUMOS_BASE]
    }

    const insumos = JSON.parse(crudo)
    return Array.isArray(insumos) && insumos.length > 0 ? insumos : [...INSUMOS_BASE]
  } catch {
    return [...INSUMOS_BASE]
  }
}

/**
 * @param {Array<{insumo_id: number, cantidad: number, signo: number}>} movimientos
 * signo: -1 descuenta stock, +1 lo incrementa.
 */
export function actualizarStockLocal(movimientos) {
  const insumos = leerInsumosLocales()

  for (const movimiento of movimientos) {
    const insumo = insumos.find((item) => Number(item.id) === Number(movimiento.insumo_id))

    if (!insumo) {
      throw new Error(`El insumo ${movimiento.insumo_id} no existe.`)
    }

    const cantidad = Number(movimiento.cantidad)
    const stockNuevo = Number((Number(insumo.stock_actual) + movimiento.signo * cantidad).toFixed(2))

    if (stockNuevo < 0) {
      throw new Error(
        `Stock insuficiente para ${insumo.nombre}. Disponible: ${insumo.stock_actual} ${insumo.unidad_medida}.`,
      )
    }

    insumo.stock_actual = stockNuevo
    insumo.alerta_stock = stockNuevo <= Number(insumo.stock_minimo ?? 0)
  }

  guardarInsumosLocales(insumos)
  return insumos
}

export async function listarInsumos() {
  if (usarApi()) {
    const datos = await request('/insumos.php')
    return datos.insumos ?? []
  }

  return leerInsumosLocales()
}
