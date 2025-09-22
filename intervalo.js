const admin = require("firebase-admin");


// 🔹 Función robusta para actualizar ICA
let cantidad=1;
let mensaje="";
// 🔹 Configuración API AQICN
const API_KEY = process.env.API_KEY;
const STATIONS = [
  { id: "@-492664", name: "carrera125" },
  { id: "A370834", name: "Parcelaciones Pance" },
  {id: "A492670", name:"Carrera 5A Norte"},
  {id: "A363883", name:"Carrera 23"}
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
        mensaje= ("Voy a pedir los datos");
        const response = await axios.get(`https://api.waqi.info/feed/${station.id}/?token=${API_KEY}`);
        if (response.data.status === "ok") {
          mensaje ="datos pedidos, los voy a guardar";
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
          mensaje ="datos guardados";
          return true;
        } else {
          console.log(response.status(500).json({message: "Hubo un error consultando la api de waqi"}));
          return false;
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
    //return cantidad;
  }, 120000); // cada 2 minutos
  
}

module.exports = intervaloReal;
