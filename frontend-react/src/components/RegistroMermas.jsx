import { useEffect, useMemo, useState } from 'react'
import { listarInsumos } from '../services/insumos'
import { listarMermas, registrarMerma } from '../services/mermas'
import './RegistroMermas.css'

const MOTIVOS_MERMA = [
  'Derrame',
  'Vencimiento',
  'Producto dañado',
  'Preparación incorrecta',
  'Otro desperdicio',
]

const MOTIVOS_AJUSTE = [
  'Corrección de inventario',
  'Conteo físico',
  'Entrada no registrada',
  'Otro ajuste',
]

function fechaDeHoy() {
  const ahora = new Date()
  const desfaseZona = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - desfaseZona).toISOString().slice(0, 10)
}

function estadoInicial(insumoId = '') {
  return {
    fecha: fechaDeHoy(),
    insumo_id: insumoId,
    tipo: 'MERMA',
    cantidad: '',
    motivo: 'Derrame',
    observaciones: '',
  }
}

function estadoInicialVacio() {
  return { total: 0, mermas: 0, ajustes: 0 }
}

export default function RegistroMermas() {
  const [insumos, setInsumos] = useState([])
  const [mermas, setMermas] = useState([])
  const [datos, setDatos] = useState(estadoInicial)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    let activo = true

    Promise.all([listarInsumos(), listarMermas()])
      .then(([catalogo, registradas]) => {
        if (!activo) return
        setInsumos(catalogo)
        setMermas(registradas)
        setDatos(estadoInicial(String(catalogo[0]?.id ?? '')))
      })
      .catch(() => {
        if (activo) {
          setMensaje({ tipo: 'error', texto: 'No se pudo cargar el inventario o las mermas.' })
        }
      })

    return () => {
      activo = false
    }
  }, [])

  const insumoSeleccionado = useMemo(
    () => insumos.find((item) => Number(item.id) === Number(datos.insumo_id)),
    [insumos, datos.insumo_id],
  )

  const motivos = datos.tipo === 'MERMA' ? MOTIVOS_MERMA : MOTIVOS_AJUSTE
  const cantidad = Number(datos.cantidad)
  const stockActual = Number(insumoSeleccionado?.stock_actual ?? 0)
  const signo = datos.tipo === 'MERMA' ? -1 : 1
  const stockProyectado = Number((stockActual + signo * (cantidad || 0)).toFixed(2))

  const resumen = useMemo(() => {
    return mermas.reduce(
      (acumulado, merma) => {
        const esMerma = merma.tipo === 'MERMA' || Number(merma.signo) < 0
        return {
          total: acumulado.total + Number(merma.cantidad || 0),
          mermas: acumulado.mermas + (esMerma ? Number(merma.cantidad || 0) : 0),
          ajustes: acumulado.ajustes + (esMerma ? 0 : Number(merma.cantidad || 0)),
        }
      },
      estadoInicialVacio(),
    )
  }, [mermas])

  function manejarCambio(evento) {
    const { name, value } = evento.target

    setDatos((previos) => {
      if (name === 'tipo') {
        const motivosDelTipo = value === 'MERMA' ? MOTIVOS_MERMA : MOTIVOS_AJUSTE
        return { ...previos, tipo: value, motivo: motivosDelTipo[0] }
      }

      return { ...previos, [name]: value }
    })

    setErrores((previos) => ({ ...previos, [name]: undefined }))
    setMensaje(null)
  }

  function validar() {
    const erroresEncontrados = {}

    if (!datos.fecha) {
      erroresEncontrados.fecha = 'Selecciona la fecha del movimiento.'
    }

    if (!datos.insumo_id || !insumoSeleccionado) {
      erroresEncontrados.insumo_id = 'Selecciona un insumo.'
    }

    if (!datos.cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
      erroresEncontrados.cantidad = 'La cantidad debe ser mayor a 0.'
    } else if (datos.tipo === 'MERMA' && cantidad > stockActual) {
      erroresEncontrados.cantidad = `No puedes descartar más de ${stockActual} ${insumoSeleccionado?.unidad_medida ?? ''}.`
    }

    if (!datos.motivo) {
      erroresEncontrados.motivo = 'Selecciona un motivo.'
    }

    return erroresEncontrados
  }

  async function manejarEnvio(evento) {
    evento.preventDefault()

    const erroresEncontrados = validar()
    setErrores(erroresEncontrados)

    if (Object.keys(erroresEncontrados).length > 0) {
      setMensaje({ tipo: 'error', texto: 'Revisa los campos marcados antes de guardar.' })
      return
    }

    setEnviando(true)
    setMensaje(null)

    try {
      const guardada = await registrarMerma(datos)
      const [catalogo, registradas] = await Promise.all([listarInsumos(), listarMermas()])

      setInsumos(catalogo)
      setMermas(registradas)
      setDatos(estadoInicial(String(guardada.insumo_id ?? datos.insumo_id)))

      setMensaje({
        tipo: 'exito',
        texto:
          guardada.tipo === 'MERMA'
            ? `Merma registrada. Stock actualizado a ${guardada.stock_nuevo} ${guardada.unidad_medida}.`
            : `Ajuste registrado. Stock actualizado a ${guardada.stock_nuevo} ${guardada.unidad_medida}.`,
      })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="mermas">
      <header className="mermas__cabecera">
        <span className="mermas__etiqueta">Inventario</span>
        <h1>Registro de Mermas</h1>
        <p>
          Descuenta desperdicios o registra ajustes de stock. Cada movimiento queda auditado con el
          stock anterior y el nuevo.
        </p>
      </header>

      <div className="mermas__diseno">
        <form className="mermas__formulario" onSubmit={manejarEnvio} noValidate>
          <h2>Nuevo movimiento</h2>

          <div className="campo">
            <label htmlFor="mer-fecha">Fecha</label>
            <input
              id="mer-fecha"
              name="fecha"
              type="date"
              value={datos.fecha}
              onChange={manejarCambio}
              aria-invalid={Boolean(errores.fecha)}
            />
            {errores.fecha && <p className="campo__error">{errores.fecha}</p>}
          </div>

          <div className="campo">
            <label htmlFor="mer-insumo">Insumo</label>
            <select
              id="mer-insumo"
              name="insumo_id"
              value={datos.insumo_id}
              onChange={manejarCambio}
              aria-invalid={Boolean(errores.insumo_id)}
            >
              {insumos.length === 0 && <option value="">No hay insumos disponibles</option>}
              {insumos.map((insumo) => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.nombre} · stock {insumo.stock_actual} {insumo.unidad_medida}
                </option>
              ))}
            </select>
            {errores.insumo_id && <p className="campo__error">{errores.insumo_id}</p>}
          </div>

          <div className="campo">
            <label htmlFor="mer-tipo">Tipo de movimiento</label>
            <select id="mer-tipo" name="tipo" value={datos.tipo} onChange={manejarCambio}>
              <option value="MERMA">Desperdicio (descuenta stock)</option>
              <option value="AJUSTE">Ajuste de stock (suma stock)</option>
            </select>
          </div>

          <div className="campo">
            <label htmlFor="mer-cantidad">Cantidad</label>
            <input
              id="mer-cantidad"
              name="cantidad"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Ej. 2.5"
              value={datos.cantidad}
              onChange={manejarCambio}
              aria-invalid={Boolean(errores.cantidad)}
            />
            {errores.cantidad && <p className="campo__error">{errores.cantidad}</p>}
          </div>

          <div className="campo">
            <label htmlFor="mer-motivo">Motivo</label>
            <select
              id="mer-motivo"
              name="motivo"
              value={datos.motivo}
              onChange={manejarCambio}
              aria-invalid={Boolean(errores.motivo)}
            >
              {motivos.map((motivo) => (
                <option key={motivo} value={motivo}>
                  {motivo}
                </option>
              ))}
            </select>
            {errores.motivo && <p className="campo__error">{errores.motivo}</p>}
          </div>

          <div className="campo">
            <label htmlFor="mer-observaciones">Observaciones (opcional)</label>
            <textarea
              id="mer-observaciones"
              name="observaciones"
              rows="3"
              placeholder="Detalles adicionales…"
              value={datos.observaciones}
              onChange={manejarCambio}
            />
          </div>

          <div className="mermas__stock" aria-live="polite">
            <div>
              <span>Stock actual</span>
              <strong>
                {stockActual} {insumoSeleccionado?.unidad_medida ?? ''}
              </strong>
            </div>
            <div>
              <span>Stock después del movimiento</span>
              <strong className={stockProyectado < 0 ? 'stock--invalido' : ''}>
                {stockProyectado} {insumoSeleccionado?.unidad_medida ?? ''}
              </strong>
            </div>
          </div>

          {mensaje && (
            <p
              className={`ventas__mensaje ventas__mensaje--${mensaje.tipo}`}
              role={mensaje.tipo === 'error' ? 'alert' : 'status'}
            >
              {mensaje.texto}
            </p>
          )}

          <button type="submit" className="boton boton--primario" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Registrar movimiento'}
          </button>
        </form>

        <aside className="mermas__resumen">
          <h2>Resumen de movimientos</h2>
          <div className="mermas__resumen-grid">
            <div>
              <span>Total registrado</span>
              <strong>{Number(resumen.total.toFixed(2))}</strong>
            </div>
            <div>
              <span>Desperdicios</span>
              <strong className="resumen--merma">{Number(resumen.mermas.toFixed(2))}</strong>
            </div>
            <div>
              <span>Ajustes</span>
              <strong className="resumen--ajuste">{Number(resumen.ajustes.toFixed(2))}</strong>
            </div>
          </div>
          <p>El resumen se calcula sobre todos los movimientos registrados en el sistema.</p>
        </aside>
      </div>

      <section className="mermas__historial">
        <div className="mermas__historial-cabecera">
          <h2>Historial de mermas y ajustes</h2>
          <span>{mermas.length} movimientos</span>
        </div>

        {mermas.length === 0 ? (
          <p className="mermas__vacio">Todavía no hay mermas ni ajustes registrados.</p>
        ) : (
          <div className="mermas__tabla-contenedor">
            <table className="mermas__tabla">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Insumo</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Stock anterior</th>
                  <th scope="col">Stock nuevo</th>
                  <th scope="col">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {mermas.map((merma) => (
                  <tr key={merma.id}>
                    <td>{String(merma.fecha).slice(0, 10)}</td>
                    <td>{merma.insumo}</td>
                    <td>
                      <span className={`tipo ${merma.tipo === 'MERMA' ? 'tipo--merma' : 'tipo--ajuste'}`}>
                        {merma.tipo === 'MERMA' ? 'Merma' : 'Ajuste'}
                      </span>
                    </td>
                    <td>
                      {Number(merma.cantidad)} {merma.unidad_medida}
                    </td>
                    <td>{merma.motivo}</td>
                    <td>{Number(merma.stock_anterior)}</td>
                    <td>{Number(merma.stock_nuevo)}</td>
                    <td>{merma.usuario ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
