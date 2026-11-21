import { useEffect, useState } from 'react'
import { obtenerRentabilidad } from '../services/rentabilidad'
import './Rentabilidad.css'

const formateadorMoneda = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
})

function formatearPorcentaje(valor) {
  return `${Number(valor || 0).toFixed(2)}%`
}

function claseMargen(valor) {
  if (valor >= 30) return 'margen--alto'
  if (valor >= 15) return 'margen--medio'
  return 'margen--bajo'
}

function resumenVacio() {
  return {
    total_ventas: 0,
    total_cobrado: 0,
    total_costo: 0,
    ganancia_total: 0,
    margen_global: 0,
    producto_mas_rentable: null,
  }
}

export default function Rentabilidad() {
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', producto: '' })
  const [filtrosAplicados, setFiltrosAplicados] = useState(filtros)
  const [datos, setDatos] = useState({ resumen: resumenVacio(), ventas: [] })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true

    obtenerRentabilidad(filtrosAplicados)
      .then((respuesta) => {
        if (activo) setDatos(respuesta)
      })
      .catch(() => {
        if (activo) setError('No se pudo obtener el análisis de rentabilidad.')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [filtrosAplicados])

  function manejarCambio(evento) {
    const { name, value } = evento.target
    setFiltros((previos) => ({ ...previos, [name]: value }))
  }

  function aplicarFiltros(evento) {
    evento.preventDefault()
    setCargando(true)
    setError('')
    setFiltrosAplicados({ ...filtros })
  }

  function limpiarFiltros() {
    const vacios = { desde: '', hasta: '', producto: '' }
    setCargando(true)
    setError('')
    setFiltros(vacios)
    setFiltrosAplicados(vacios)
  }

  const { resumen, ventas } = datos

  const tarjetas = [
    { etiqueta: 'Total cobrado', valor: formateadorMoneda.format(resumen.total_cobrado) },
    { etiqueta: 'Costo total', valor: formateadorMoneda.format(resumen.total_costo) },
    { etiqueta: 'Ganancia total', valor: formateadorMoneda.format(resumen.ganancia_total) },
    { etiqueta: 'Margen global', valor: formatearPorcentaje(resumen.margen_global), destacado: true },
    { etiqueta: 'Ventas analizadas', valor: String(resumen.total_ventas) },
    {
      etiqueta: 'Producto más rentable',
      valor: resumen.producto_mas_rentable ?? '—',
    },
  ]

  return (
    <section className="rentabilidad">
      <header className="rentabilidad__cabecera">
        <span className="rentabilidad__etiqueta">Analítica</span>
        <h1>Rentabilidad por producto</h1>
        <p>
          Costo de insumos, ganancia y margen exacto de cada venta. Los costos quedan congelados al
          momento de registrar la venta.
        </p>
      </header>

      <form className="rentabilidad__filtros" onSubmit={aplicarFiltros}>
        <div className="campo">
          <label htmlFor="rent-desde">Desde</label>
          <input
            id="rent-desde"
            name="desde"
            type="date"
            value={filtros.desde}
            onChange={manejarCambio}
          />
        </div>
        <div className="campo">
          <label htmlFor="rent-hasta">Hasta</label>
          <input
            id="rent-hasta"
            name="hasta"
            type="date"
            value={filtros.hasta}
            onChange={manejarCambio}
          />
        </div>
        <div className="campo">
          <label htmlFor="rent-producto">Producto</label>
          <input
            id="rent-producto"
            name="producto"
            type="search"
            placeholder="Buscar producto…"
            value={filtros.producto}
            onChange={manejarCambio}
          />
        </div>
        <div className="rentabilidad__filtros-acciones">
          <button type="submit" className="boton boton--primario">
            Aplicar filtros
          </button>
          <button type="button" className="boton boton--secundario" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </form>

      {error && <p className="rentabilidad__error">{error}</p>}

      <div className="rentabilidad__tarjetas">
        {tarjetas.map((tarjeta) => (
          <article
            key={tarjeta.etiqueta}
            className={`rentabilidad__tarjeta${tarjeta.destacado ? ' rentabilidad__tarjeta--destacada' : ''}`}
          >
            <span>{tarjeta.etiqueta}</span>
            <strong>{tarjeta.valor}</strong>
          </article>
        ))}
      </div>

      <section className="rentabilidad__tabla-contenedor">
        <div className="rentabilidad__tabla-cabecera">
          <h2>Detalle por venta</h2>
          {cargando && <span>Actualizando…</span>}
        </div>

        {ventas.length === 0 && !cargando ? (
          <p className="rentabilidad__vacio">
            No hay ventas que coincidan con los filtros. Registra una venta con insumos para ver su
            margen.
          </p>
        ) : (
          <table className="rentabilidad__tabla">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Producto</th>
                <th scope="col">Cant.</th>
                <th scope="col">Cobrado</th>
                <th scope="col">Costo</th>
                <th scope="col">Ganancia</th>
                <th scope="col">Margen</th>
                <th scope="col">Gan./unidad</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => (
                <tr key={venta.venta_id}>
                  <td>{String(venta.fecha).slice(0, 10)}</td>
                  <td>{venta.producto}</td>
                  <td>{venta.cantidad}</td>
                  <td>{formateadorMoneda.format(Number(venta.total_cobrado))}</td>
                  <td>{formateadorMoneda.format(Number(venta.costo_total))}</td>
                  <td>{formateadorMoneda.format(Number(venta.ganancia))}</td>
                  <td>
                    <span className={`margen ${claseMargen(Number(venta.margen_porcentaje))}`}>
                      {formatearPorcentaje(venta.margen_porcentaje)}
                    </span>
                  </td>
                  <td>{formateadorMoneda.format(Number(venta.ganancia_por_unidad))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}
