
const admin = require("firebase-admin");
const axios = require("axios");

// Variables de entorno configuradas en Render
const API_KEY = process.env.API_KEY;
const FIREBASE_KEY = process.env.FIREBASE_KEY;

// Validación de variables de entorno
if (!API_KEY || !FIREBASE_KEY) {
  throw new Error(
    "Faltan las variables de entorno API_KEY o FIREBASE_KEY."
  );
}

// Configuración de Firebase
let serviceAccount;

try {
  serviceAccount = JSON.parse(FIREBASE_KEY);
} catch (error) {
  throw new Error(
    `FIREBASE_KEY no contiene un JSON válido: ${error.message}`
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Configuración de las estaciones
const STATIONS = [
  { id: "@-492664", name: "carrera125" },
  { id: "A370834", name: "Parcelaciones Pance" },
  { id: "A492670", name: "Carrera 5A Norte" },
  { id: "A363883", name: "Carrera 23" },
];

const UPDATE_INTERVAL = 600000; // 10 minutos

/**
 * Consulta los datos ICA de AQICN y los almacena
 * en la colección ICA de Firebase Firestore.
 *
 * @returns {Promise<void>}
 */
async function updateICA() {
  console.log("🌍 Iniciando actualización de datos ICA...");

  const updates = STATIONS.map(async (station) => {
    try {
      const response = await axios.get(
        `https://api.waqi.info/feed/${station.id}/`,
        {
          params: {
            token: API_KEY,
          },
          timeout: 15000,
        }
      );

      const payload = response.data;

      // Verificar respuesta de AQICN
      if (payload?.status !== "ok") {
        console.error(
          `❌ Error AQICN en ${station.name}:`,
          payload?.data
        );
        return false;
      }

      const { aqi, city, time } = payload.data;

      // Validar información recibida
      if (
        typeof aqi !== "number" ||
        !Number.isFinite(aqi) ||
        !city?.name ||
        !Array.isArray(city.geo) ||
        city.geo.length < 2 ||
        !Number.isFinite(Number(city.geo[0])) ||
        !Number.isFinite(Number(city.geo[1])) ||
        !time?.s
      ) {
        console.warn(
          `⚠️ Datos incompletos o ICA inválido en ${station.name}`
        );
        return false;
      }

      // Guardar información en Firestore
      await db.collection("ICA").doc(station.name).set(
        {
          value: aqi,
          name: city.name,
          latitude: Number(city.geo[0]),
          longitude: Number(city.geo[1]),
          takenDate: time.s,
          timestamp:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(
        `✅ ${station.name} actualizado correctamente. ICA: ${aqi}`
      );

      return true;
    } catch (error) {
      console.error(
        `❌ Error actualizando ${station.name}:`,
        error.message
      );

      return false;
    }
  });

  // Esperar todas las consultas
  const results = await Promise.all(updates);

  const successful = results.filter(Boolean).length;

  console.log(
    `📊 Actualización finalizada: ${successful}/${STATIONS.length} estaciones actualizadas.`
  );
}

/**
 * Inicia la actualización automática del ICA.
 *
 * Ejecuta una actualización inmediatamente
 * y programa nuevas consultas cada 10 minutos.
 *
 * Evita que se ejecuten dos actualizaciones
 * simultáneamente dentro del mismo proceso.
 *
 * @returns {NodeJS.Timeout} Identificador del intervalo.
 */
function intervaloReal() {
  let updating = false;

  /**
   * Ejecuta la actualización de forma controlada.
   *
   * @returns {Promise<void>}
   */
  async function runUpdate() {
    if (updating) {
      console.warn(
        "⚠️ Ya existe una actualización en curso."
      );
      return;
    }

    updating = true;

    try {
      await updateICA();
    } catch (error) {
      console.error(
        "❌ Error general en la actualización:",
        error.message
      );
    } finally {
      updating = false;
    }
  }

  // Ejecutar inmediatamente
  void runUpdate();

  // Ejecutar cada 10 minutos
  return setInterval(runUpdate, UPDATE_INTERVAL);
}

module.exports = intervaloReal;
