const admin = require("firebase-admin");
const axios = require("axios");
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

// 🔹 Configurar intervalo de actualización (15 minutos = 900,000 ms)
const UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutos en milisegundos

// Ejecutar inmediatamente y luego cada 15 minutos
updateICA(); // Primera ejecución inmediata
const intervalId = setInterval(updateICA, UPDATE_INTERVAL);

console.log(`🔄 Programa iniciado. Actualizando ICA cada 15 minutos...`);
