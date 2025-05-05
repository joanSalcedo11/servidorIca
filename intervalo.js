const admin = require("firebase-admin");


// 🔹 Función robusta para actualizar ICA
let cantidad=1;
// 🔹 Configuración API AQICN
const API_KEY = process.env.API_KEY;
const STATIONS = [
  { id: "@-492664", name: "carrera125" },
  { id: "A370834", name: "Parcelaciones Pance" }
];
const axios = require("axios");

// 🔹 Configuración de Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();


async function updateICA() {
  try {
    const updates = STATIONS.map(async (station) => {
      try {
        const response = await axios.get(`https://api.waqi.info/feed/${station.id}/?token=${API_KEY}`);
        if (response.data.status === "ok") {
          const { aqi, city, time } = response.data.data;
          await db.collection("ICA").doc(station.name).set({
            value: aqi,
            name: city.name,
            latitude: city.geo[0],
            longitude: city.geo[1],
            takenDate: time.s,
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
function intervaloReal() {
  setInterval(() => {
    updateICA();
    console.log(cantidad);
    cantidad=cantidad+1;
    return cantidad;
  }, 120000); // cada 1 minutos
  
}

module.exports = intervaloReal;
