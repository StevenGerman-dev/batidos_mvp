import { useState } from "react";
import { usarApi } from "../services/api";

export default function Login({ onLoginExitoso }) {
  const [email, setEmail] = useState("admin@batidos.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Modo demostración: sin VITE_API_URL no hay backend PHP disponible.
    if (!usarApi()) {
      const usuarioDemo = {
        id: 1,
        nombre: email.split("@")[0] || "Demo",
        rol: "Administrador",
      };

      localStorage.setItem(
        "sesion_batidos",
        JSON.stringify({
          usuario: usuarioDemo,
          expira_en: Date.now() + 1800 * 1000,
        }),
      );

      onLoginExitoso(usuarioDemo);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.ok) {
        localStorage.setItem(
          "sesion_batidos",
          JSON.stringify({
            usuario: data.usuario,
            expira_en: data.expira_en,
          }),
        );
        onLoginExitoso(data.usuario);
      } else {
        setError(data.mensaje);
      }
    } catch {
      setError("No se pudo conectar con el servidor PHP");
    }
  };

  return (
    <div
      style={{
        maxWidth: "360px",
        margin: "60px auto",
        padding: "24px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h2>Iniciar Sesión - Batidos MVP</h2>
      {!usarApi() && (
        <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "12px" }}>
          Modo demostración: usa cualquier contraseña. Los datos se guardan en este navegador.
        </p>
      )}
      <form onSubmit={manejarSubmit}>
        <div style={{ marginBottom: "12px" }}>
          <label>Correo:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label>Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
