import React from "react";

function App() {
  return (
    <div
      style={{
        backgroundColor: "#f7f9fc",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        padding: "30px",
      }}
    >
      {/* ENCABEZADO */}
      <header>
        <h1 style={{ color: "#111", marginBottom: "5px" }}>
          🚀 Digital Twins Dashboard
        </h1>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ color: "#007bff", fontWeight: "bold", margin: 0 }}>
            Página Principal
          </h2>
        </div>

        <hr
          style={{
            width: "60%",
            margin: "30px auto",
            border: "1px solid #ddd",
          }}
        />
      </header>

      {/* SECCIONES DEL DASHBOARD */}
      <main
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "40px",
          flexWrap: "wrap",
        }}
      >
        {/* INVENTARIOS */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            width: "280px",
            padding: "20px",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <h3>📦 Inventarios</h3>
          <p>
            Gestión de productos, existencias y stock en tiempo real.
          </p>
          <button
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            Ir a Inventarios
          </button>
        </div>

        {/* RECOMENDACIONES */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            width: "280px",
            padding: "20px",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <h3>💡 Recomendaciones</h3>
          <p>
            Sugerencias inteligentes basadas en datos y rendimiento.
          </p>
          <button
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            Ir a Recomendaciones
          </button>
        </div>

        {/* LOGÍSTICA */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            width: "280px",
            padding: "20px",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <h3>🚚 Logística</h3>
          <p>
            Control de envíos, rutas y optimización de entregas.
          </p>
          <button
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            Ir a Logística
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
