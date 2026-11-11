
const express = require("express");
const intervaloReal = require("./intervalo");

const app = express();

// Puerto configurado automáticamente por Render
const PORT = process.env.PORT || 3000;

/**
 * Endpoint principal para verificar
 * el estado del servidor SoulAir.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {void}
 */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Servidor SoulAir funcionando correctamente",
    service: "ICA API",
    updateInterval: "10 minutos",
  });
});

/**
 * Inicia Express y el sistema de
 * actualización periódica del ICA.
 */
app.listen(PORT, () => {
  console.log(`🚀 Servidor SoulAir listo en puerto ${PORT}`);

  // Iniciar actualizaciones automáticas una sola vez
  intervaloReal();

  console.log(
    "⏰ Sistema de actualización ICA iniciado."
  );
});
