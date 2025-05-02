// 🔹 Función robusta para actualizar ICA
const cantidad=1;
// 🔹 Configuración API AQICN
const API_KEY = process.env.API_KEY;
const STATIONS = [
  { id: "@13323", name: "pance" },
  { id: "@13326", name: "univalle" }
];

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
          cantidad++;
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
    cantidad;
  }, 60000); // cada 1 minutos
  
}

module.exports = intervaloReal;
