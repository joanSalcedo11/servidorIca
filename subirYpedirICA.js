
const express = require("express");

const intervaloReal = require("./intervalo");
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
  //startAutoUpdate();
});
