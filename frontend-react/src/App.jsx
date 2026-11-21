import { useState, useEffect } from 'react'
import Login from './components/Login'
import FormularioVenta from './components/FormularioVenta.jsx'
import Rentabilidad from './components/Rentabilidad.jsx'
import RegistroMermas from './components/RegistroMermas.jsx'

const MODULOS = [
  { id: 'ventas', etiqueta: 'Ventas', componente: FormularioVenta },
  { id: 'rentabilidad', etiqueta: 'Rentabilidad', componente: Rentabilidad },
  { id: 'mermas', etiqueta: 'Mermas', componente: RegistroMermas },
]

function App() {
  const [usuario, setUsuario] = useState(null)
  const [moduloActivo, setModuloActivo] = useState('ventas')

  useEffect(() => {
    const sesionGuardada = JSON.parse(localStorage.getItem('sesion_batidos'))
    if (sesionGuardada) {
      if (Date.now() < sesionGuardada.expira_en) {
        setUsuario(sesionGuardada.usuario)
      } else {
        localStorage.removeItem('sesion_batidos')
        alert('Tu sesión ha expirado. Inicia sesión nuevamente.')
      }
    }
  }, [])

  const cerrarSesion = () => {
    localStorage.removeItem('sesion_batidos')
    setUsuario(null)
  }

  if (!usuario) {
    return <Login onLoginExitoso={setUsuario} />
  }

  const Modulo = MODULOS.find((modulo) => modulo.id === moduloActivo)?.componente ?? FormularioVenta

  return (
    <div>
      <header className="app-header">
        <span>
          Bienvenido, <strong>{usuario.nombre}</strong> ({usuario.rol})
        </span>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </header>

      <nav className="app-nav" aria-label="Módulos del sistema">
        {MODULOS.map((modulo) => (
          <button
            key={modulo.id}
            type="button"
            className={modulo.id === moduloActivo ? 'app-nav__activo' : ''}
            onClick={() => setModuloActivo(modulo.id)}
            aria-current={modulo.id === moduloActivo ? 'page' : undefined}
          >
            {modulo.etiqueta}
          </button>
        ))}
      </nav>

      <main className="app">
        <Modulo />
      </main>
    </div>
  )
}

export default App
