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
    console.log("⏳ Iniciando actualización de ICA...");
    
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

        console.log("📌 ICA actualizado en Firestore.");
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

// 🔹 Configurar el programador cron para ejecutar inmediatamente y luego cada 15 minutos
cron.schedule("*/15 * * * *", () => {
  updateICA();
}, {
  scheduled: true,
  timezone: "America/Bogota", // Ajusta según tu zona horaria
  runOnInit: true // Ejecuta inmediatamente al iniciar
});

// 🔹 Iniciar el servidor (necesario para Render)
const app = express();
app.get("/", (req, res) => res.send("Servidor ICA corriendo"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log("⏰ Programador cron iniciado. Actualizaciones cada 15 minutos.");
});
