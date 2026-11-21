/**
 * Configuración y utilidades compartidas por los servicios de la API.
 * Sin VITE_API_URL los módulos funcionan con localStorage para demo.
 */
export const API_URL =
  import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '') ?? ''

export function usarApi() {
  return Boolean(API_URL)
}

export function usuarioActivoId() {
  try {
    const sesion = JSON.parse(window.localStorage.getItem('sesion_batidos'))
    return sesion?.usuario?.id ?? null
  } catch {
    return null
  }
}

export async function request(ruta, opciones = {}) {
  if (!usarApi()) {
    throw new Error('La API no está configurada.')
  }

  let respuesta

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        ...(opciones.headers ?? {}),
      },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor PHP.')
  }

  let datos = null

  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok || datos?.ok === false) {
    const mensajes = datos?.errores
    const detalle = Array.isArray(mensajes) ? mensajes.join(' ') : null
    throw new Error(detalle ?? datos?.mensaje ?? 'Error inesperado del servidor.')
  }

  return datos
}
