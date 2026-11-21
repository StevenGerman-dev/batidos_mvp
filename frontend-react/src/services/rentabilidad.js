import { request, usarApi } from './api'
import { calcularMetricas, listarVentas } from './ventas'

function construirResumen(ventas) {
  const totalCobrado = ventas.reduce((suma, venta) => suma + Number(venta.total_cobrado || 0), 0)
  const totalCosto = ventas.reduce((suma, venta) => suma + Number(venta.costo_total || 0), 0)
  const gananciaTotal = ventas.reduce((suma, venta) => suma + Number(venta.ganancia || 0), 0)
  const masRentable = ventas.reduce(
    (mejor, venta) => (!mejor || venta.ganancia > mejor.ganancia ? venta : mejor),
    null,
  )

  return {
    total_ventas: ventas.length,
    total_cobrado: Number(totalCobrado.toFixed(2)),
    total_costo: Number(totalCosto.toFixed(2)),
    ganancia_total: Number(gananciaTotal.toFixed(2)),
    margen_global: totalCobrado > 0 ? Number(((gananciaTotal / totalCobrado) * 100).toFixed(2)) : 0,
    producto_mas_rentable: masRentable?.producto ?? null,
  }
}

function aplicarFiltrosLocales(ventas, filtros) {
  return ventas.filter((venta) => {
    const fecha = String(venta.fecha ?? '').slice(0, 10)

    if (filtros.desde && fecha < filtros.desde) return false
    if (filtros.hasta && fecha > filtros.hasta) return false

    if (filtros.producto) {
      const busqueda = filtros.producto.trim().toLowerCase()
      if (!String(venta.producto ?? '').toLowerCase().includes(busqueda)) return false
    }

    return true
  })
}

export async function obtenerRentabilidad(filtros = {}) {
  if (usarApi()) {
    const parametros = new URLSearchParams()

    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor) parametros.set(clave, String(valor))
    })

    const sufijo = parametros.toString() ? `?${parametros}` : ''
    const datos = await request(`/rentabilidad.php${sufijo}`)

    return {
      resumen: datos.resumen ?? construirResumen([]),
      ventas: datos.ventas ?? [],
    }
  }

  const registradas = await listarVentas()
  const filtradas = aplicarFiltrosLocales(registradas, filtros)

  const ventas = filtradas
    .map((venta) => {
      const metricas = calcularMetricas(venta.total, venta.insumos ?? [])
      return {
        venta_id: venta.id,
        fecha: venta.fecha,
        producto: venta.producto,
        cantidad: Number(venta.cantidad || 0),
        total_cobrado: Number(venta.total || 0),
        costo_total: metricas.costo_total,
        ganancia: metricas.ganancia,
        margen_porcentaje: metricas.margen_porcentaje,
        ganancia_por_unidad:
          Number(venta.cantidad) > 0
            ? Number((metricas.ganancia / Number(venta.cantidad)).toFixed(2))
            : 0,
      }
    })
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))

  return { resumen: construirResumen(ventas), ventas }
}
