# Servidor ICA con Node.js, Firebase y Express

Este proyecto implementa un servidor Node.js que consulta periódicamente la API de calidad del aire (WAQI), guarda los resultados en Firebase Firestore y los expone mediante un servidor Express.


## Estructura del proyecto
```json
├── intervalo.js       # Define la lógica de actualización periódica del ICA
├── subirYpedirICA.js  # Inicializa el servidor Express y expone los datos
├── package.json
└── README.md
````

## Flujo de ejecución

**1. intervalo.js:**
  - Configura Firebase y la API de WAQI.
  - Define la función asíncrona updateICA() que:
      - Consulta la API de WAQI para las estaciones configuradas.
      - Guarda los datos (ICA, ciudad, coordenadas, fecha) en Firestore.
  - Define intervaloReal(), que ejecuta updateICA() automáticamente cada 2 minutos.
  - Exporta intervaloReal para ser usado por otros módulos.
    
**2. subirYpedirICA.js**
  - Importa la función intervaloReal desde intervalo.js.
  - Inicia un servidor Express en el puerto configurado (PORT, por defecto 3000).

##Rutas:
  - / → devuelve un HTML con un script que refresca datos cada 15 segundos.
  - /mensaje → ejecuta intervaloReal() y responde con el valor retornado.



## Datos guardados en Firebase

Los documentos se guardan en la colección ICA, con esta estructura:
```json
{
  "value": 57,
  "name": "Parcelaciones Pance",
  "latitude": 3.34,
  "longitude": -76.53,
  "takenDate": "2025-09-21 20:00:00",
  "timestamp": "2025-09-21T01:23:45.678Z"
}
````
## Notas

- intervaloReal() ejecuta updateICA() automáticamente cada 2 minutos.
- El cliente HTML consulta /mensaje cada 15 segundos para refrescar datos.
- Puedes modificar el tiempo del setInterval en intervalo.js según tus necesidades.
