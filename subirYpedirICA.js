const admin = require("firebase-admin");
const axios = require("axios");
const express = require("express");

// 🔹 Configuración de Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// 🔹 Configuración API AQICN
const API_KEY = process.env.API_KEY;
const STATIONS = [
  { id: "@13323", name: "pance" },
  { id: "@13326", name: "univalle" }
];

// 🔹 Función robusta para actualizar ICA
async function updateICA() {
  try {
    const updates = STATIONS.map(async (station) => {
      try {
        const response = await axios.get(`https://api.waqi.info/feed/${station.id}/?token=${API_KEY}`);
        if (response.data.status === "ok") {
          const { aqi, city } = response.data.data;
          await db.collection("ICA").doc(station.name).set({
            value: aqi,
            name: city.name,
            latitude: city.geo[0],
            longitude: city.geo[1],
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log(`✅ ${station.name.toUpperCase()} actualizado: ICA ${aqi}`);
          return true;
        }
      } catch (error) {
        console.error(`⚠️ Error en ${station.name}:`, error.message);
        return false;
      }
    });

    await Promise.all(updates);
  } catch (error) {
    console.error("❌ Error general en updateICA:", error.message);
  }
}

// 🔹 Sistema de actualización automática mejorado
function startAutoUpdate() {
  // Ejecutar inmediatamente
  updateICA().catch(console.error);
  
  // Programar cada 15 minutos (900,000 ms)
  const interval = setInterval(() => {
    console.log("🔄 Iniciando actualización programada...");
    updateICA().catch(console.error);
  }, 15 * 60 * 1000);

  // Manejar errores inesperados en el intervalo
  interval.unref(); // Permite que Node.js termine si solo queda este timer activo

  // Reintentar si hay fallos (opcional)
  process.on("unhandledRejection", (err) => {
    console.error("⚠️ Error no manejado, reintentando...", err);
    setTimeout(updateICA, 30000); // Reintentar después de 30 segundos
  });
}

// 🔹 Servidor Express (siempre activo)
const app = express();
app.get("/", (req, res) => res.json({ 
  status: "ACTIVE",
  message: "Servidor de ICA funcionando",
  nextUpdate: new Date(Date.now() + 15 * 60 * 1000).toISOString()
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
  startAutoUpdate();
});

// 🔹 Manejar señales para registro (sin detener nada)
process.on("SIGTERM", () => console.log("📝 Recibida SIGTERM (ignorada)"));
process.on("SIGINT", () => console.log("📝 Recibida SIGINT (ignorada)"));
