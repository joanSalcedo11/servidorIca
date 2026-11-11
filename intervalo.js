
const admin = require("firebase-admin");
const axios = require("axios");

// Variables de entorno de Render
const API_KEY = process.env.API_KEY;
const FIREBASE_KEY = process.env.FIREBASE_KEY;

if (!API_KEY || !FIREBASE_KEY) {
  throw new Error(
    "Faltan las variables API_KEY o FIREBASE_KEY"
  );
}

// Inicialización de Firebase
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(FIREBASE_KEY);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Estaciones AQICN de Cali
const STATIONS = [
  { id: "A492682", name: "Calle 23" },
  { id: "A254464", name: "Calle 18" },
  { id: "A250198", name: "Calle 13D" },
  { id: "A370834", name: "Parcelaciones Pance" },
  { id: "A492703", name: "Cuarteles de Nápoles" },
  { id: "A350872", name: "Calle 31 Norte" },
  { id: "A492670", name: "Carrera 5A Norte" },
  { id: "A249310", name: "Calle 65 Norte" },
];

const UPDATE_INTERVAL = 10 * 60 * 1000;
const MAX_AGE_DAYS = 180;

// Documento de seguimiento del backend
const statusRef = db.collection("system").doc("icaUpdater");

let intervalId = null;
let updating = false;

/**
 * Convierte un ICA numérico o una cadena numérica
 * a un número válido.
 *
 * @param {number|string} value
 * @returns {number|null}
 */
function parseAQI(value) {
  if (
    typeof value !== "number" &&
    !(typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim()))
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : null;
}

/**
 * Consulta una estación de AQICN y guarda su
 * información válida en Firestore.
 *
 * @param {{id: string, name: string}} station
 * @returns {Promise<object|null>}
 */
async function updateStation(station) {
  try {
    const response = await axios.get(
      `https://api.waqi.info/feed/${station.id}/?token=`,
      {
        params: { token: API_KEY },
        timeout: 15000,
      }
    );

    const payload = response.data;

    if (payload?.status !== "ok") {
      console.warn(
        `⚠️ ${station.name}: ${JSON.stringify(payload?.data)}`
      );
      return null;
    }

    const data = payload.data;
    const aqi = parseAQI(data?.aqi);
    const latitude = Number(data?.city?.geo?.[0]);
    const longitude = Number(data?.city?.geo?.[1]);

    if (
      aqi === null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !data?.time?.s
    ) {
      console.warn(
        `⚠️ ${station.name}: datos incompletos. ` +
        `ICA recibido: ${JSON.stringify(data?.aqi)}`
      );
      return null;
    }

    // Determinar antigüedad de la medición
    const measuredAt = data.time.iso
      ? new Date(data.time.iso)
      : new Date(
          `${data.time.s.replace(" ", "T")}${data.time.tz || "-05:00"}`
        );

    if (Number.isNaN(measuredAt.getTime())) {
      console.warn(
        `⚠️ ${station.name}: fecha de medición inválida`
      );
      return null;
    }

    const ageDays = Math.max(
      0,
      Math.floor(
        (Date.now() - measuredAt.getTime()) / 86400000
      )
    );

    const isHistorical = ageDays > MAX_AGE_DAYS;

    // Mantener la estructura que consume SoulAir
    await db.collection("ICA").doc(station.name).set(
      {
        value: aqi,
        name: data.city.name || station.name,
        latitude,
        longitude,
        takenDate: data.time.s,
        timestamp:
          admin.firestore.FieldValue.serverTimestamp(),

        // Campos adicionales para trazabilidad
        stationId: station.id,
        measurementDate:
          admin.firestore.Timestamp.fromDate(measuredAt),
        ageDays,
        isHistorical,
        source: "AQICN",
      },
      { merge: true }
    );

    console.log(
      `✅ ${station.name}: ICA ${aqi} | ` +
      `${ageDays} días de antigüedad` +
      (isHistorical ? " | HISTÓRICO" : "")
    );

    return {
      name: station.name,
      aqi,
      ageDays,
      isHistorical,
      measuredAt,
    };
  } catch (error) {
    console.error(
      `❌ Error en ${station.name}: ${error.message}`
    );
    return null;
  }
}

/**
 * Actualiza todas las estaciones y registra
 * el resultado del ciclo en Firestore.
 *
 * @returns {Promise<void>}
 */
async function updateICA() {
  if (updating) {
    console.warn("⚠️ Actualización en curso.");
    return;
  }

  updating = true;

  console.log("🌍 Iniciando consulta de estaciones...");

  try {
    const results = await Promise.all(
      STATIONS.map(updateStation)
    );

    const successful = results.filter(Boolean);
    const historical = successful.filter(
      (item) => item.isHistorical
    );

    const latestMeasurement =
      successful.length > 0
        ? new Date(
            Math.max(
              ...successful.map(
                (item) => item.measuredAt.getTime()
              )
            )
          )
        : null;

    // Registrar resultado del ciclo
    const metadata = {
      lastAttempt:
        admin.firestore.FieldValue.serverTimestamp(),
      configuredStations: STATIONS.length,
      updatedStations: successful.length,
      historicalStations: historical.length,
      intervalMinutes: 10,
    };

    // Solo actualizar la fecha de éxito
    // si hubo al menos una escritura válida.
    if (successful.length > 0) {
      metadata.lastSuccessfulUpdate =
        admin.firestore.FieldValue.serverTimestamp();

      metadata.lastMeasurementDate =
        admin.firestore.Timestamp.fromDate(
          latestMeasurement
        );
    }

    await statusRef.set(metadata, { merge: true });

    console.log(
      `📊 Resultado: ${successful.length}/${STATIONS.length} ` +
      `estaciones guardadas. Históricas: ${historical.length}`
    );
  } catch (error) {
    console.error(
      "❌ Error general de actualización:",
      error.message
    );
  } finally {
    updating = false;
  }
}

/**
 * Inicia una actualización inmediata y programa
 * posteriores actualizaciones cada diez minutos.
 *
 * Evita registrar múltiples intervalos
 * dentro del mismo proceso Node.js.
 *
 * @returns {NodeJS.Timeout}
 */
function intervaloReal() {
  if (intervalId) {
    return intervalId;
  }

  void updateICA();

  intervalId = setInterval(
    updateICA,
    UPDATE_INTERVAL
  );

  return intervalId;
}

module.exports = {
  intervaloReal,
  db,
  STATIONS,
};
