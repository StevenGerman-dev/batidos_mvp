import { request, usuarioActivoId, usarApi } from './api'
import { actualizarStockLocal, listarInsumos } from './insumos'

const CLAVE_ALMACEN = 'mermas_registradas'

function leerMermasLocales() {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACEN)
    const mermas = crudo ? JSON.parse(crudo) : []
    return Array.isArray(mermas) ? mermas : []
  } catch {
    return []
  }
}

function guardarMermasLocales(mermas) {
  window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(mermas))
}

export async function listarMermas() {
  if (usarApi()) {
    const datos = await request('/mermas.php')
    return datos.mermas ?? []
  }

  return leerMermasLocales()
}

export async function registrarMerma(datos) {
  const tipo = datos.tipo === 'AJUSTE' ? 'AJUSTE' : 'MERMA'
  const signo = tipo === 'MERMA' ? -1 : 1
  const cantidad = Number(datos.cantidad)

  const merma = {
    id: crypto.randomUUID(),
    fecha: datos.fecha,
    tipo,
    cantidad,
    signo,
    motivo: datos.motivo.trim(),
    observaciones: (datos.observaciones ?? '').trim(),
    insumo_id: Number(datos.insumo_id),
    usuario_id: usuarioActivoId(),
    creadaEn: new Date().toISOString(),
  }

  if (usarApi()) {
    const respuesta = await request('/mermas.php', {
      method: 'POST',
      body: JSON.stringify(merma),
    })

    return respuesta.merma
  }

  const insumos = await listarInsumos()
  const insumo = insumos.find((item) => Number(item.id) === merma.insumo_id)

  if (!insumo) {
    throw new Error('El insumo seleccionado no existe.')
  }

  const stockAnterior = Number(insumo.stock_actual)
  const stockNuevo = Number((stockAnterior + signo * cantidad).toFixed(2))

  if (stockNuevo < 0) {
    throw new Error(
      `Stock insuficiente para ${insumo.nombre}. Disponible: ${stockAnterior} ${insumo.unidad_medida}.`,
    )
  }

  actualizarStockLocal([{ insumo_id: merma.insumo_id, cantidad, signo }])

  const registradas = leerMermasLocales()
  const mermaGuardada = {
    ...merma,
    insumo: insumo.nombre,
    unidad_medida: insumo.unidad_medida,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    usuario: null,
  }

  registradas.push(mermaGuardada)
  guardarMermasLocales(registradas)
  return mermaGuardada
}
