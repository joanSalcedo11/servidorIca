//const admin = require("firebase-admin");
//const axios = require("axios");
const express = require("express");

const intervaloReal = require("./intervalo");

/*// 🔹 Configuración de Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();*/

/*// 🔹 Configuración API AQICN
const API_KEY = process.env.API_KEY;
const STATIONS = [
  { id: "@13323", name: "pance" },
  { id: "@13326", name: "univalle" }
];*/



// 🔹 Sistema de actualización automática mejorado
/*function startAutoUpdate() {
  // Ejecutar inmediatamente
  updateICA().catch(console.error);
  
  // Programar cada 15 minutos (900,000 ms)
  const interval = setInterval(() => {
    console.log("🔄 Iniciando actualización programada...");
    updateICA().catch(console.error);
  }, 15 * 60 * 1000);*/


// 🔹 Servidor Express (siempre activo)
const app = express();
  
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1 >El servidor esta funcionando</h1>
        <h3 id="mensaje">hola.... </h3>
        <script>
          async function actualizarMensaje() {
            const res = await fetch('/mensaje');
            const texto = await res.text();
            document.getElementById('mensaje').innerText = texto;
          }

          actualizarMensaje(); // primera carga
          setInterval(actualizarMensaje, 15000); // actualiza cada 15s
        </script>
      </body>
    </html>
  `);
});

app.get("/mensaje", (req, res) => {
  const mensaje = intervaloReal();
  res.send(mensaje);
});


  
/*app.get("/", (req, res) => res.json({ 
  status: "ACTIVE",
  message: "Servidor de ICA funcionando",
  nextUpdate: new Date(Date.now() + 15 * 60 * 1000).toISOString()
}));*/

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
  //startAutoUpdate();
});

// 🔹 Manejar señales para registro (sin detener nada)
/*process.on("SIGTERM", () => console.log("📝 Recibida SIGTERM (ignorada)"));
process.on("SIGINT", () => console.log("📝 Recibida SIGINT (ignorada)"));*/
