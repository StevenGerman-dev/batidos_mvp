import { request, usuarioActivoId, usarApi } from './api'
import { actualizarStockLocal } from './insumos'

const CLAVE_ALMACEN = 'ventas_registradas'

function leerVentasLocales() {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACEN)
    const ventas = crudo ? JSON.parse(crudo) : []
    return Array.isArray(ventas) ? ventas : []
  } catch {
    return []
  }
}

function guardarVentasLocales(ventas) {
  window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(ventas))
}

export function calcularMetricas(total, insumos = []) {
  const costoTotal = insumos.reduce(
    (suma, item) => suma + Number(item.cantidad_usada || 0) * Number(item.costo_unitario || 0),
    0,
  )
  const costo = Number(costoTotal.toFixed(2))
  const ganancia = Number((Number(total || 0) - costo).toFixed(2))
  const margen = Number(total || 0) > 0 ? Number(((ganancia / Number(total)) * 100).toFixed(2)) : 0

  return {
    costo_total: costo,
    ganancia,
    margen_porcentaje: margen,
  }
}

export async function listarVentas() {
  if (usarApi()) {
    const datos = await request('/ventas.php')
    return datos.ventas ?? []
  }

  return leerVentasLocales()
}

export async function registrarVenta(datos) {
  const insumos = Array.isArray(datos.insumos) ? datos.insumos : []
  const metricas = calcularMetricas(datos.totalCobrado, insumos)

  const venta = {
    id: crypto.randomUUID(),
    fecha: datos.fecha,
    producto: datos.producto.trim(),
    cantidad: Number(datos.cantidad),
    total: Number(datos.totalCobrado),
    usuario_id: usuarioActivoId(),
    insumos: insumos.map((item) => ({
      insumo_id: Number(item.insumo_id),
      nombre: item.nombre,
      unidad_medida: item.unidad_medida,
      cantidad_usada: Number(item.cantidad_usada),
      costo_unitario: Number(item.costo_unitario),
    })),
    ...metricas,
    registradaEn: new Date().toISOString(),
  }

  if (usarApi()) {
    const respuesta = await request('/ventas.php', {
      method: 'POST',
      body: JSON.stringify(venta),
    })

    return respuesta.venta
  }

  actualizarStockLocal(
    venta.insumos.map((item) => ({
      insumo_id: item.insumo_id,
      cantidad: item.cantidad_usada,
      signo: -1,
    })),
  )

  const ventas = leerVentasLocales()
  ventas.push(venta)
  guardarVentasLocales(ventas)
  return venta
}
