//se necesita express
const express = require("express");
//se necesita intervaloReal
const intervaloReal = require("./intervalo");
// 🔹 Servidor Express (siempre activo)
const app = express();
//puerto el cual escucha
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
  //startAutoUpdate();
});

app.get("/", (req, res) => {
  const info = intervaloReal();
  res.send(`
    <html>
      <body>
        <h1 >El servidor esta funcionando</h1>
        <h3 id="mensaje">${info} </h3>
      </body>
    </html>
  `);
});



