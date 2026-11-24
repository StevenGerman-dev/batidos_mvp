import './PantallaInicio.css'

const OPCIONES = [
  {
    id: 'ventas',
    titulo: 'Registrar Venta',
    detalle: 'Anota una nueva venta e historial',
    icono: '🥤',
  },
  {
    id: 'inventario',
    titulo: 'Inventario',
    detalle: 'Stock y control de insumos',
    icono: '📦',
  },
  {
    id: 'rentabilidad',
    titulo: 'Rentabilidad',
    detalle: 'Ganancias, costos y márgenes',
    icono: '📈',
  },
  {
    id: 'mermas',
    titulo: 'Mermas y Ajustes',
    detalle: 'Registro de desperdicios',
    icono: '📉',
  },
]

export default function PantallaInicio({ onSeleccionarModulo }) {
  return (
    <section className="pantalla-inicio">
      <header className="pantalla-inicio__encabezado">
        <p className="pantalla-inicio__mini">Negocio de Batidos</p>
        <h1>Inicio</h1>
        <p className="pantalla-inicio__sub">Elige una opción para continuar</p>
      </header>

      <nav className="pantalla-inicio__menu" aria-label="Menú principal">
        {OPCIONES.map((op) => (
          <button
            key={op.id}
            type="button"
            className="pantalla-inicio__boton"
            onClick={() => onSeleccionarModulo(op.id)}
          >
            <span className="pantalla-inicio__icono" aria-hidden="true">
              {op.icono}
            </span>
            <span className="pantalla-inicio__titulo">{op.titulo}</span>
            <span className="pantalla-inicio__detalle">{op.detalle}</span>
          </button>
        ))}
      </nav>

      <footer className="pantalla-inicio__pie">MVP · Sprint 1</footer>
    </section>
  )
}