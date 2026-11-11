
const express = require("express");

const {
  intervaloReal,
  db,
  STATIONS,
} = require("./intervalo");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Formatea un Timestamp de Firestore a
 * fecha y hora de Colombia.
 *
 * @param {FirebaseFirestore.Timestamp|undefined} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Sin registros disponibles";
  }

  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "full",
    timeStyle: "medium",
  }).format(timestamp.toDate());
}

/**
 * Muestra el estado del servidor y la
 * última actualización exitosa en Firebase.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
app.get("/", async (req, res) => {
  try {
    const snapshot = await db
      .collection("system")
      .doc("icaUpdater")
      .get();

    const status = snapshot.exists
      ? snapshot.data()
      : {};

    const lastUpdate = formatDate(
      status.lastSuccessfulUpdate
    );

    const lastAttempt = formatDate(
      status.lastAttempt
    );

    const lastMeasurement = formatDate(
      status.lastMeasurementDate
    );

    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport"
              content="width=device-width, initial-scale=1.0">

        <title>SoulAir | Estado del servidor</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            background: #f4f7f9;
            font-family: Arial, sans-serif;
            color: #203342;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 24px;
          }

          .container {
            background: white;
            width: 100%;
            max-width: 650px;
            border-radius: 20px;
            padding: 36px;
            box-shadow:
              0 12px 40px rgba(0,0,0,0.06);
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }

          h1 {
            margin: 0;
            font-size: 30px;
          }

          h2 {
            font-size: 20px;
            margin-top: 28px;
          }

          .badge {
            background: #e2f6ec;
            color: #16834b;
            padding: 8px 12px;
            border-radius: 30px;
            font-size: 12px;
            font-weight: bold;
          }

          .subtitle {
            color: #64748b;
            line-height: 1.6;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-top: 24px;
          }

          .card {
            background: #f4f7f9;
            padding: 20px;
            border-radius: 14px;
          }

          .card p {
            font-size: 13px;
            color: #64748b;
            margin: 0 0 10px;
          }

          .card strong {
            font-size: 27px;
          }

          .detail {
            border-top: 1px solid #e5e7eb;
            padding: 18px 0;
          }

          .detail label {
            display: block;
            color: #64748b;
            font-size: 13px;
            margin-bottom: 8px;
          }

          .detail strong {
            font-size: 15px;
            line-height: 1.5;
          }

          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #94a3b8;
            text-align: center;
          }
        </style>
      </head>

      <body>
        <main class="container">

          <div class="header">
            <h1>SoulAir</h1>
            <span class="badge">Servidor activo</span>
          </div>

          <p class="subtitle">
            Sistema de monitoreo y recolección
            de datos de calidad del aire.
          </p>

          <div class="grid">

            <div class="card">
              <p>Estaciones configuradas</p>
              <strong>${STATIONS.length}</strong>
            </div>

            <div class="card">
              <p>Estaciones en último ciclo</p>
              <strong>${status.updatedStations ?? 0}</strong>
            </div>

            <div class="card">
              <p>Mediciones históricas</p>
              <strong>${status.historicalStations ?? 0}</strong>
            </div>

            <div class="card">
              <p>Intervalo configurado</p>
              <strong>10 min</strong>
            </div>

          </div>

          <h2>Estado de actualización</h2>

          <div class="detail">
            <label>Última escritura exitosa en Firebase</label>
            <strong>${lastUpdate}</strong>
          </div>

          <div class="detail">
            <label>Último intento de actualización</label>
            <strong>${lastAttempt}</strong>
          </div>

          <div class="detail">
            <label>Medición más reciente recibida</label>
            <strong>${lastMeasurement}</strong>
          </div>

          <p class="footer">
            SoulAir · Cali, Colombia ·
            Fuente de datos: AQICN
          </p>

        </main>
      </body>
      </html>
    `);
  } catch (error) {
    console.error(
      "Error consultando estado de Firebase:",
      error.message
    );

    res.status(500).json({
      status: "error",
      message:
        "No fue posible consultar el estado de Firebase.",
    });
  }
});

/**
 * Inicia Express y el ciclo automático
 * de actualización de datos.
 */
app.listen(PORT, () => {
  console.log(
    `🚀 Servidor SoulAir listo en puerto ${PORT}`
  );

  intervaloReal();

  console.log(
    "⏰ Actualizaciones programadas cada 10 minutos."
  );
});
