import { useState, useEffect } from "react";
import Login from "./components/Login";
import FormularioVenta from "./components/FormularioVenta.jsx";

function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const sesionGuardada = JSON.parse(localStorage.getItem("sesion_batidos"));
    if (sesionGuardada) {
      if (Date.now() < sesionGuardada.expira_en) {
        setUsuario(sesionGuardada.usuario);
      } else {
        localStorage.removeItem("sesion_batidos");
        alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
      }
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem("sesion_batidos");
    setUsuario(null);
  };

  if (!usuario) {
    return <Login onLoginExitoso={setUsuario} />;
  }

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "#f3f4f6",
        }}
      >
        <span>
          Bienvenido, <strong>{usuario.nombre}</strong> ({usuario.rol})
        </span>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </header>

      <main className="app">
        <FormularioVenta />
      </main>
    </div>
  );
}

export default App;