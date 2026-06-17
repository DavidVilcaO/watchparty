# 🎤 Swiftie Ranking

Landing para votar por las mejores canciones de **Taylor Swift** y construir un
**ranking mundial** basado en la opinión y el gusto de sus fans.

![Hecho con 💜 por Swifties](https://img.shields.io/badge/hecho%20por-swifties-c89bff)

## ✨ Qué hace

- Muestra un catálogo curado de las mejores canciones de Taylor Swift por era.
- Los fans **votan** por sus favoritas con un clic.
- El ranking se ordena en tiempo real según los votos de **toda la comunidad**.
- Se ve el porcentaje de votos de cada canción y un podio destacado (🥇🥈🥉).
- Diseño responsive con estética "aurora" inspirada en los eras.

## 🚀 Cómo correrlo

No requiere instalar dependencias (usa solo Node.js).

```bash
node server.js
# luego abre http://localhost:3000
```

Para cambiar el puerto:

```bash
PORT=8080 node server.js
```

## 🗂️ Estructura

```
.
├── server.js          # Servidor HTTP nativo + API REST (/api/ranking, /api/vote)
├── data/
│   ├── songs.js       # Catálogo curado de canciones (editable)
│   └── votes.json     # Votos persistidos (se crea solo, ignorado por git)
└── public/
    ├── index.html     # La landing
    ├── styles.css     # Estilos
    └── app.js         # Lógica del frontend
```

## 🔌 API

| Método | Ruta            | Descripción                                   |
| ------ | --------------- | --------------------------------------------- |
| `GET`  | `/api/ranking`  | Devuelve el ranking actual con votos y %.     |
| `POST` | `/api/vote`     | Suma un voto. Body JSON: `{ "id": "<songId>" }` |

## ➕ Agregar canciones

Edita `data/songs.js` y añade un objeto con un `id` único y estable:

```js
{ id: "mi-cancion", title: "Mi Canción", album: "Album", year: 2024, emoji: "🎶" }
```

## 📝 Notas

- Los votos se guardan en `data/votes.json` para que el ranking sea compartido
  entre todos los visitantes del servidor.
- El "ya votaste" se recuerda en `localStorage` solo como ayuda visual; no es un
  control anti-fraude. Para un despliegue público real conviene añadir límites
  por IP, captcha o autenticación.
- Proyecto fan, sin afiliación oficial con Taylor Swift o sus sellos.
