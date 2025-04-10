const admin = require("firebase-admin");
const axios = require("axios");
const cron = require("node-cron");
const express = require("express");

// 🔹 Configurar Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// 🔹 Configurar API de AQICN
const API_KEY = process.env.API_KEY;
const AQI_URL_PANCE = `https://api.waqi.info/feed/@13323/?token=${API_KEY}`;
const AQI_URL_UNIVALLE = `https://api.waqi.info/feed/@13326/?token=${API_KEY}`;

// 🔹 Función para obtener datos del ICA
async function updateICA() {
  try {
    const startTime = new Date();
    console.log(`⏳ Iniciando actualización de ICA a las ${startTime.toLocaleTimeString()}`);
    
    // [El resto de tu función updateICA permanece igual...]
    // Obtener datos del sensor Pance
    const responsePance = await axios.get(AQI_URL_PANCE);
    if (responsePance.data.status === "ok") {
      const aqiValueP = responsePance.data.data.aqi;
      const nameStationP = responsePance.data.data.city.name;
      const latitudeP = responsePance.data.data.city.geo[0];
      const longitudeP = responsePance.data.data.city.geo[1];

      // Obtener datos del sensor Univalle
      const responseUnivalle = await axios.get(AQI_URL_UNIVALLE);
      if (responseUnivalle.data.status === "ok") {
        const aqiValueU = responseUnivalle.data.data.aqi;
        const nameStationU = responseUnivalle.data.data.city.name;
        const latitudeU = responseUnivalle.data.data.city.geo[0];
        const longitudeU = responseUnivalle.data.data.city.geo[1];
        
        console.log(`Nuevo ICA en ${nameStationP}: ${aqiValueP}`);
        console.log(`Nuevo ICA en ${nameStationU}: ${aqiValueU}`);

        // 🔹 Guardar en Firestore - Pance
        await db.collection("ICA").doc("pance").set({
          value: aqiValueP,
          name: nameStationP,
          latitude: latitudeP,
          longitude: longitudeP,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // 🔹 Guardar en Firestore - Univalle
        await db.collection("ICA").doc("univalle").set({
          value: aqiValueU,
          name: nameStationU,
          latitude: latitudeU,
          longitude: longitudeU,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        console.log(`📌 ICA actualizado en Firestore. Duración: ${duration} segundos`);
      } else {
        console.error("❌ Error en la respuesta de la API para Univalle.");
      }
    } else {
      console.error("❌ Error en la respuesta de la API para Pance.");
    }
  } catch (error) {
    console.error("❌ Error al obtener el ICA:", error);
  }
}

// 🔹 Configuración mejorada del cron
function setupCron() {
  // Ejecutar inmediatamente al iniciar
  updateICA().catch(console.error);
  
  // Programar ejecución cada 15 minutos
  const task = cron.schedule("*/15 * * * *", () => {
    console.log('⏰ Disparando tarea programada...');
    updateICA().catch(console.error);
  }, {
    scheduled: true,
    timezone: "America/Bogota"
  });

  return task;
}

// 🔹 Iniciar el servidor
const app = express();
app.get("/", (req, res) => res.send("Servidor ICA corriendo"));

// Endpoint para verificar el estado
app.get("/status", (req, res) => {
  res.json({
    status: "running",
    nextRun: getNextCronRun("*/15 * * * *", "America/Bogota"),
    lastRun: lastRunTime
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  const cronTask = setupCron();
  console.log("⏰ Programador cron iniciado. Actualizaciones cada 15 minutos.");
});

// Manejar cierre adecuado
process.on('SIGTERM', () => {
  console.log('🛑 Recibido SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

// Variables para seguimiento
let lastRunTime = null;

// Función para calcular próxima ejecución
function getNextCronRun(pattern, timezone) {
  const options = {
    scheduled: true,
    timezone: timezone
  };
  const nextDates = cron.getNextDates(pattern, 1, options);
  return nextDates[0];
}
