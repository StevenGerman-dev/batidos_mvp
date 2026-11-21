import { useEffect, useMemo, useState } from 'react'
import { listarInsumos } from '../services/insumos'
import { calcularMetricas, listarVentas, registrarVenta } from '../services/ventas'
import './FormularioVenta.css'

const formateadorMoneda = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
})

function formatearPorcentaje(valor) {
  return `${Number(valor || 0).toFixed(2)}%`
}

function fechaDeHoy() {
  const ahora = new Date()
  const desfaseZona = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - desfaseZona).toISOString().slice(0, 10)
}

function estadoInicial() {
  return { fecha: fechaDeHoy(), producto: '', cantidad: '', totalCobrado: '' }
}

function validar(datos, detalle) {
  const errores = {}

  if (!datos.fecha) {
    errores.fecha = 'Selecciona la fecha de la venta.'
  }

  if (datos.producto.trim().length < 2) {
    errores.producto = 'Ingresa el producto (mínimo 2 caracteres).'
  }

  const cantidad = Number(datos.cantidad)
  if (!datos.cantidad || !Number.isInteger(cantidad) || cantidad <= 0) {
    errores.cantidad = 'La cantidad debe ser un entero mayor a 0.'
  }

  const total = Number(datos.totalCobrado)
  if (datos.totalCobrado === '' || Number.isNaN(total) || total < 0) {
    errores.totalCobrado = 'Ingresa un total cobrado válido.'
  }

  if (detalle.length === 0) {
    errores.detalle = 'Agrega al menos un insumo para poder calcular el costo de la venta.'
  }

  return errores
}

export default function FormularioVenta() {
  const [datos, setDatos] = useState(estadoInicial)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [ventas, setVentas] = useState([])
  const [insumos, setInsumos] = useState([])
  const [insumoSeleccionado, setInsumoSeleccionado] = useState('')
  const [cantidadInsumo, setCantidadInsumo] = useState('')
  const [errorInsumo, setErrorInsumo] = useState('')
  const [detalle, setDetalle] = useState([])

  useEffect(() => {
    let activo = true

    Promise.all([listarVentas(), listarInsumos()])
      .then(([registradas, catalogo]) => {
        if (!activo) return
        setVentas(registradas)
        setInsumos(catalogo)
        setInsumoSeleccionado(String(catalogo[0]?.id ?? ''))
      })
      .catch(() => {
        if (activo) {
          setMensaje({ tipo: 'error', texto: 'No se pudo cargar el historial y el inventario.' })
        }
      })

    return () => {
      activo = false
    }
  }, [])

  const totalAcumulado = useMemo(
    () => ventas.reduce((suma, venta) => suma + Number(venta.total || 0), 0),
    [ventas],
  )

  const metricas = useMemo(
    () => calcularMetricas(datos.totalCobrado, detalle),
    [datos.totalCobrado, detalle],
  )

  function manejarCambio(evento) {
    const { name, value } = evento.target
    setDatos((previos) => ({ ...previos, [name]: value }))
    setErrores((previos) => ({ ...previos, [name]: undefined }))
    setMensaje(null)
  }

  function agregarInsumo() {
    setErrorInsumo('')

    const insumo = insumos.find((item) => Number(item.id) === Number(insumoSeleccionado))
    const cantidad = Number(cantidadInsumo)

    if (!insumo) {
      setErrorInsumo('Selecciona un insumo.')
      return
    }

    if (!cantidadInsumo || Number.isNaN(cantidad) || cantidad <= 0) {
      setErrorInsumo('Ingresa una cantidad mayor a 0.')
      return
    }

    const yaUsado = detalle
      .filter((item) => item.insumo_id === insumo.id)
      .reduce((suma, item) => suma + Number(item.cantidad_usada), 0)

    if (yaUsado + cantidad > Number(insumo.stock_actual)) {
      setErrorInsumo(
        `Stock insuficiente. Disponible: ${insumo.stock_actual} ${insumo.unidad_medida}.`,
      )
      return
    }

    setDetalle((previos) => {
      const existente = previos.find((item) => item.insumo_id === insumo.id)

      if (existente) {
        return previos.map((item) =>
          item.insumo_id === insumo.id
            ? { ...item, cantidad_usada: Number((item.cantidad_usada + cantidad).toFixed(2)) }
            : item,
        )
      }

      return [
        ...previos,
        {
          insumo_id: insumo.id,
          nombre: insumo.nombre,
          unidad_medida: insumo.unidad_medida,
          cantidad_usada: cantidad,
          costo_unitario: Number(insumo.costo_unitario || 0),
        },
      ]
    })

    setCantidadInsumo('')
    setErrores((previos) => ({ ...previos, detalle: undefined }))
    setMensaje(null)
  }

  function quitarInsumo(insumoId) {
    setDetalle((previos) => previos.filter((item) => item.insumo_id !== insumoId))
    setMensaje(null)
  }

  async function manejarEnvio(evento) {
    evento.preventDefault()

    const erroresEncontrados = validar(datos, detalle)
    setErrores(erroresEncontrados)

    if (Object.keys(erroresEncontrados).length > 0) {
      setMensaje({ tipo: 'error', texto: 'Revisa los campos marcados antes de guardar.' })
      return
    }

    setEnviando(true)
    setMensaje(null)

    try {
      const venta = await registrarVenta({ ...datos, insumos: detalle })
      setVentas((previas) => [...previas, venta])
      setDatos((previos) => ({ ...estadoInicial(), fecha: previos.fecha }))
      setDetalle([])
      setCantidadInsumo('')

      const catalogoActualizado = await listarInsumos()
      setInsumos(catalogoActualizado)
      setInsumoSeleccionado(String(catalogoActualizado[0]?.id ?? ''))

      setMensaje({
        tipo: 'exito',
        texto: `Venta de "${venta.producto}" registrada. Margen: ${formatearPorcentaje(venta.margen_porcentaje)}.`,
      })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="ventas">
      <header className="ventas__cabecera">
        <span className="ventas__etiqueta">Módulo de ventas</span>
        <h1 className="ventas__titulo">Registro de Ventas</h1>
        <p className="ventas__descripcion">
          Registra el producto vendido y los insumos utilizados. El sistema calcula el costo y el
          margen real para evitar rentabilidad oculta.
        </p>
      </header>

      <form className="ventas__formulario" onSubmit={manejarEnvio} noValidate>
        <div className="ventas__campos">
          <div className="campo">
            <label htmlFor="fecha">Fecha</label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              value={datos.fecha}
              onChange={manejarCambio}
              aria-invalid={Boolean(errores.fecha)}
              aria-describedby={errores.fecha ? 'error-fecha' : undefined}
            />
            {errores.fecha && (
              <p className="campo__error" id="error-fecha">
                {errores.fecha}
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="producto">Producto</label>
            <input
              id="producto"
              name="producto"
              type="text"
              placeholder="Ej. Batido de frutilla"
              value={datos.producto}
              onChange={manejarCambio}
              aria-invalid={Boolean(errores.producto)}
              aria-describedby={errores.producto ? 'error-producto' : undefined}
            />
            {errores.producto && (
              <p className="campo__error" id="error-producto">
                {errores.producto}
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="cantidad">Cantidad vendida</label>
            <input
              id="cantidad"
              name="cantidad"
              type="number"
              min="1"
              step="1"
              placeholder="Ej. 2"
              value={datos.cantidad}
              onChange={manejarCambio}
              aria-invalid={Boolean(errores.cantidad)}
              aria-describedby={errores.cantidad ? 'error-cantidad' : undefined}
            />
            {errores.cantidad && (
              <p className="campo__error" id="error-cantidad">
                {errores.cantidad}
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="totalCobrado">Total cobrado (USD)</label>
            <input
              id="totalCobrado"
              name="totalCobrado"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej. 8.50"
              value={datos.totalCobrado}
              onChange={manejarCambio}
              aria-invalid={Boolean(errores.totalCobrado)}
              aria-describedby={errores.totalCobrado ? 'error-totalCobrado' : undefined}
            />
            {errores.totalCobrado && (
              <p className="campo__error" id="error-totalCobrado">
                {errores.totalCobrado}
              </p>
            )}
          </div>
        </div>

        <div className="detalle">
          <div className="detalle__cabecera">
            <div>
              <h2>Insumos utilizados</h2>
              <p>Se descuentan del stock y quedan congelados en la venta para calcular el costo.</p>
            </div>
          </div>

          <div className="detalle__controles">
            <div className="campo">
              <label htmlFor="insumo">Insumo</label>
              <select
                id="insumo"
                value={insumoSeleccionado}
                onChange={(evento) => {
                  setInsumoSeleccionado(evento.target.value)
                  setErrorInsumo('')
                }}
              >
                {insumos.length === 0 && <option value="">No hay insumos disponibles</option>}
                {insumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>
                    {insumo.nombre} · stock {insumo.stock_actual} {insumo.unidad_medida} ·{' '}
                    {formateadorMoneda.format(Number(insumo.costo_unitario))}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="cantidadInsumo">Cantidad usada</label>
              <input
                id="cantidadInsumo"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Ej. 1.5"
                value={cantidadInsumo}
                onChange={(evento) => {
                  setCantidadInsumo(evento.target.value)
                  setErrorInsumo('')
                }}
              />
            </div>

            <button type="button" className="boton boton--secundario" onClick={agregarInsumo}>
              Agregar
            </button>
          </div>

          {errorInsumo && <p className="campo__error">{errorInsumo}</p>}
          {errores.detalle && <p className="campo__error">{errores.detalle}</p>}

          {detalle.length === 0 ? (
            <p className="detalle__vacio">Aún no agregas insumos a esta venta.</p>
          ) : (
            <table className="detalle__tabla">
              <thead>
                <tr>
                  <th scope="col">Insumo</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">Costo unitario</th>
                  <th scope="col">Subtotal</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((item) => (
                  <tr key={item.insumo_id}>
                    <td>{item.nombre}</td>
                    <td>
                      {item.cantidad_usada} {item.unidad_medida}
                    </td>
                    <td>{formateadorMoneda.format(Number(item.costo_unitario))}</td>
                    <td>
                      {formateadorMoneda.format(item.cantidad_usada * Number(item.costo_unitario))}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="detalle__quitar"
                        onClick={() => quitarInsumo(item.insumo_id)}
                        aria-label={`Quitar ${item.nombre}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="detalle__resumen" aria-live="polite">
            <span>
              Costo estimado: <strong>{formateadorMoneda.format(metricas.costo_total)}</strong>
            </span>
            <span>
              Ganancia estimada: <strong>{formateadorMoneda.format(metricas.ganancia)}</strong>
            </span>
            <span>
              Margen estimado: <strong>{formatearPorcentaje(metricas.margen_porcentaje)}</strong>
            </span>
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

        <div className="ventas__acciones">
          <button type="submit" className="boton boton--primario" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar Venta'}
          </button>
        </div>
      </form>

      <section className="historial">
        <div className="historial__cabecera">
          <h2>Ventas registradas</h2>
          <span className="historial__total">
            Total acumulado: <strong>{formateadorMoneda.format(totalAcumulado)}</strong>
          </span>
        </div>

        {ventas.length === 0 ? (
          <p className="historial__vacio">Aún no hay ventas registradas.</p>
        ) : (
          <div className="historial__tabla-contenedor">
            <table className="historial__tabla">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">Total cobrado</th>
                  <th scope="col">Costo</th>
                  <th scope="col">Margen</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td>{String(venta.fecha).slice(0, 10)}</td>
                    <td>{venta.producto}</td>
                    <td>{venta.cantidad}</td>
                    <td>{formateadorMoneda.format(Number(venta.total))}</td>
                    <td>{formateadorMoneda.format(Number(venta.costo_total || 0))}</td>
                    <td>{formatearPorcentaje(venta.margen_porcentaje)}</td>
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
