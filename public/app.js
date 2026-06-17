// Frontend del ranking. Carga el estado desde la API, pinta la lista y maneja
// los votos. Recordamos los votos del usuario en localStorage para mostrar qué
// canciones ya apoyó (no es un control de seguridad, solo UX amigable).

const listEl = document.getElementById("songList");
const totalVotesEl = document.getElementById("totalVotes");
const totalSongsEl = document.getElementById("totalSongs");
const myVotesEl = document.getElementById("myVotes");
const toastEl = document.getElementById("toast");
const sortBtns = document.querySelectorAll(".sort-btn");

const VOTED_KEY = "swiftie:voted";
let state = { totalVotes: 0, songs: [] };
let sortMode = "rank";
let myVoted = loadMyVoted();

function loadMyVoted() {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveMyVoted() {
  localStorage.setItem(VOTED_KEY, JSON.stringify([...myVoted]));
}

function formatNum(n) {
  return n.toLocaleString("es-ES");
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

async function fetchRanking() {
  const res = await fetch("/api/ranking");
  if (!res.ok) throw new Error("No se pudo cargar el ranking");
  return res.json();
}

async function sendVote(id) {
  const res = await fetch("/api/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("No se pudo registrar el voto");
  return res.json();
}

function sortedSongs() {
  const songs = [...state.songs];
  if (sortMode === "album") {
    return songs.sort(
      (a, b) => b.year - a.year || a.album.localeCompare(b.album) || a.title.localeCompare(b.title)
    );
  }
  return songs.sort((a, b) => a.rank - b.rank);
}

function render() {
  totalVotesEl.textContent = formatNum(state.totalVotes);
  totalSongsEl.textContent = formatNum(state.songs.length);
  myVotesEl.textContent = formatNum(myVoted.size);

  const songs = sortedSongs();
  listEl.innerHTML = "";

  for (const song of songs) {
    const li = document.createElement("li");
    li.className = `song song--${song.rank}`;
    li.style.setProperty("--share", `${song.share}%`);
    li.dataset.id = song.id;

    const voted = myVoted.has(song.id);

    li.innerHTML = `
      <div class="song__bar"></div>
      <div class="song__rank">${song.rank}</div>
      <div class="song__info">
        <div class="song__title"><span class="emoji">${song.emoji}</span>${escapeHtml(song.title)}</div>
        <div class="song__meta">${escapeHtml(song.album)} · ${song.year} · <span class="song__share">${song.share}%</span></div>
      </div>
      <div class="song__action">
        <div class="song__count" data-count>${formatNum(song.votes)} <span>votos</span></div>
        <button class="vote-btn ${voted ? "is-voted" : ""}" type="button">
          ${voted ? "♥ Votada" : "Votar"}
        </button>
      </div>
    `;

    li.querySelector(".vote-btn").addEventListener("click", () => handleVote(song.id));
    listEl.appendChild(li);
  }
}

async function handleVote(id) {
  const btn = listEl.querySelector(`.song[data-id="${id}"] .vote-btn`);
  if (btn) btn.disabled = true;

  try {
    const data = await sendVote(id);
    const prev = countFor(id);
    state = { totalVotes: data.totalVotes, songs: data.songs };

    if (!myVoted.has(id)) {
      myVoted.add(id);
      saveMyVoted();
    }

    const song = state.songs.find((s) => s.id === id);
    render();

    // Animación de "bump" en el contador recién actualizado.
    const countEl = listEl.querySelector(`.song[data-id="${id}"] [data-count]`);
    if (countEl && song && song.votes > prev) {
      countEl.classList.add("bump");
      countEl.addEventListener("animationend", () => countEl.classList.remove("bump"), { once: true });
    }

    showToast(`¡Gracias por votar por “${song ? song.title : "esa canción"}”! 💜`);
  } catch (err) {
    showToast("Ups, no se pudo registrar tu voto. Intenta de nuevo.");
    if (btn) btn.disabled = false;
  }
}

function countFor(id) {
  const s = state.songs.find((x) => x.id === id);
  return s ? s.votes : 0;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

sortBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    sortMode = btn.dataset.sort;
    sortBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
    render();
  });
});

async function init() {
  try {
    state = await fetchRanking();
    render();
  } catch (err) {
    listEl.innerHTML = `<li class="loading">No se pudo cargar el ranking 😢. Recarga la página.</li>`;
  }
}

init();
// Refresca el ranking cada 20s para reflejar votos de otros fans.
setInterval(async () => {
  try {
    state = await fetchRanking();
    render();
  } catch { /* silencioso */ }
}, 20000);
