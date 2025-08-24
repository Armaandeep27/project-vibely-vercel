// ---------- Tiny helpers (copied from dashboard style) ----------
const escapeHtml = (str) =>
  typeof str === "string"
    ? str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]))
    : str;

function showMessage(msg, type = "info") {
  document.querySelector(".auth-message")?.remove();
  const el = document.createElement("div");
  el.className = `auth-message ${type}`;
  el.textContent = msg;
  el.style.cssText =
    `position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:8px;` +
    `color:white;font-weight:bold;z-index:9999;max-width:300px;` +
    `background-color:${type==="success"?"#22c55e":type==="error"?"#ef4444":"#3b82f6"};`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function getBestUrl(arr) {
  if (!Array.isArray(arr) || !arr.length) return "";
  const withUrl = arr.filter(x => x && (x.url || x.link));
  if (!withUrl.length) return "";
  const q320 = withUrl.find(x => String(x.quality||"").includes("320"));
  return (q320?.url || q320?.link || withUrl[withUrl.length-1].url || withUrl[withUrl.length-1].link || "");
}

function getArtistName(item) {
  if (!item) return "Unknown Artist";
  if (item.artists?.primary)
    return item.artists.primary.map(a => a.name || "").filter(Boolean).join(", ");
  if (item.primaryArtists)
    return Array.isArray(item.primaryArtists)
      ? item.primaryArtists.map(a => a.name || a).filter(Boolean).join(", ")
      : item.primaryArtists;
  return item.singers || item.moreInfo?.singers || "Unknown Artist";
}

// ---------- Render cards (same look as dashboard) ----------
function renderSongs(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  if (!items?.length) {
    container.innerHTML = '<p style="color:#888;">No items found</p>';
    return;
  }

  items.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.innerHTML = `
      <div class="song-image">
        ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.title)}">` : "🎵"}
      </div>
      <div class="song-title">${escapeHtml(item.title)}</div>
      <div class="song-artist">${escapeHtml(item.artist)}</div>
    `;
    card.onclick = () => playSong(item, i, items);
    container.appendChild(card);
  });
}

// ---------- Player (same behavior as dashboard) ----------
window.currentPlaylist = [];
window.currentIndex = -1;
window.isShuffle = false;
window.isRepeat = false;

function playSong(song, index = null, playlist = null) {
  const player = document.getElementById("audioPlayer");
  const playIcon = document.getElementById("play-icon");
  if (!player) return;

  if (!song?.url) {
    showMessage("Song cannot be played (no stream found)", "error");
    return;
  }

  if (playlist) {
    window.currentPlaylist = playlist;
    window.currentIndex = index ?? playlist.findIndex((s) => s.id === song.id);
  } else {
    window.currentIndex = window.currentPlaylist?.findIndex((s) => s.id === song.id) ?? 0;
  }

  player.src = song.url;
  player.play().catch(() => {});

  if (playIcon) { playIcon.classList.remove("fa-play"); playIcon.classList.add("fa-pause"); }

  document.getElementById("currentSongTitle").textContent = song.title || "Unknown";
  document.getElementById("currentSongArtist").textContent = song.artist || "Unknown";
  const coverEl = document.getElementById("currentSongCover");
  const fallback = document.querySelector(".cover-fallback");
  if (coverEl) {
    if (song.image) { coverEl.src = song.image; coverEl.style.display = "block"; if (fallback) fallback.style.display = "none"; }
    else { coverEl.style.display = "none"; if (fallback) fallback.style.display = "block"; }
  }
  document.getElementById("bottomPlayer")?.classList.add("active");
}

function togglePlay() {
  const player = document.getElementById("audioPlayer");
  const playIcon = document.getElementById("play-icon");
  if (!player) return;
  if (player.paused) { player.play().catch(()=>{}); playIcon?.classList.replace("fa-play","fa-pause"); }
  else { player.pause(); playIcon?.classList.replace("fa-pause","fa-play"); }
}

function changeSong(step) {
  const list = window.currentPlaylist || [];
  if (!list.length) return showMessage("No songs in queue", "info");
  if (step === 1 && window.isShuffle) {
    let idx = Math.floor(Math.random() * list.length);
    if (list.length > 1 && idx === window.currentIndex) idx = (idx + 1) % list.length;
    window.currentIndex = idx;
    return playSong(list[idx], idx, list);
  }
  let nextIndex = window.currentIndex + step;
  if (nextIndex < 0) return showMessage("No previous song", "info");
  if (nextIndex >= list.length) return showMessage("End of queue", "info");
  window.currentIndex = nextIndex;
  playSong(list[nextIndex], nextIndex, list);
}
function previousSong(){ changeSong(-1); }
function nextSong(){ changeSong(1); }

function initPlayerControls() {
  const player = document.getElementById("audioPlayer");
  if (!player) return;
  const progress = document.getElementById("seekBar");
  const currentTimeEl = document.getElementById("currentTime");
  const totalTimeEl = document.getElementById("totalTime");
  const volumeSlider = document.getElementById("volumeBar");

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  player.addEventListener("loadedmetadata", () => {
    totalTimeEl.textContent = formatTime(player.duration);
    progress.value = 0;
  });
  player.addEventListener("timeupdate", () => {
    if (player.duration) progress.value = (player.currentTime / player.duration) * 100;
    currentTimeEl.textContent = formatTime(player.currentTime);
    totalTimeEl.textContent = formatTime(player.duration);
  });
  progress.addEventListener("input", (e) => {
    player.currentTime = (e.target.value / 100) * player.duration;
  });
  volumeSlider.addEventListener("input", (e) => {
    player.volume = parseFloat(e.target.value);
  });
  player.addEventListener("ended", () => { if (!window.isRepeat) nextSong(); });
}

// expose for buttons
window.togglePlay = togglePlay;
window.previousSong = previousSong;
window.nextSong = nextSong;

// ---------- Page logic ----------
document.addEventListener("DOMContentLoaded", async () => {
  // Back behavior (no redirect to login)
  document.getElementById("backBtn").addEventListener("click", (e)=>{
    e.preventDefault();
    if (window.history.length > 1) window.history.back();
    else window.location.href = "../dashboard.html";
  });

  initPlayerControls();

  const params = new URLSearchParams(window.location.search);
  const artistId = params.get("id");
  if (!artistId) return;

  try {
    // Use saavn.dev (same family as dashboard)
    const res = await fetch(`https://saavn.dev/api/artists?id=${artistId}`);
    if (!res.ok) throw new Error("Failed to fetch artist");
    const data = await res.json();
    const artist = data.data;

    document.getElementById("artistName").textContent = artist.name || "Artist";
    document.getElementById("artistImage").src = artist.image?.[2]?.url || "";
    document.getElementById("artistExtra").textContent =
      (artist.followerCount ? `${artist.followerCount.toLocaleString()} followers • ` : "") +
      (artist.dominantType ? artist.dominantType : "Artist");

    // Build songs
    let songs = (artist.topSongs || []).map((s) => {
      const artistStr = getArtistName(s);
      const img = s.image?.[2]?.url || s.image?.[1]?.url || "";
      return {
        id: s.id,
        title: s.name || "Unknown Title",
        artist: artistStr || "Unknown",
        image: img,
        url: getBestUrl(s.downloadUrl),
        year: s.year ? parseInt(s.year) : (s.releaseDate ? parseInt(String(s.releaseDate).slice(0,4)) : 0),
        releaseDate: s.releaseDate || null,
        type: "song",
      };
    });

    // Sort latest first (by date, fallback to year)
    songs.sort((a, b) => {
      const da = a.releaseDate ? new Date(a.releaseDate) : new Date(a.year || 0, 0, 1);
      const db = b.releaseDate ? new Date(b.releaseDate) : new Date(b.year || 0, 0, 1);
      return db - da;
    });

    // Render & wire playlist
    renderSongs(songs, "artistSongs");
    window.currentPlaylist = songs;
    window.currentIndex = -1;

    // Auto-show player bar when first card clicked; handled in playSong

  } catch (err) {
    console.error(err);
    showMessage("Failed to load artist", "error");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const artistId = params.get("id");
  if (!artistId) return;

  try {
    const res = await fetch(`https://saavn.dev/api/artists?id=${artistId}`);
    if (!res.ok) throw new Error("Failed to fetch artist");

    const data = await res.json();
    const artist = data.data;

    // Set artist name + image
    document.getElementById("artistName").textContent = artist.name;
    document.getElementById("artistImage").src = artist.image?.[2]?.url || "";

    // Process songs
    let songs = artist.topSongs || [];
    if (!songs.length) return;

    songs = songs.map((s) => ({
  id: s.id,
  title: s.name || "Unknown Title",
  artist:
    (Array.isArray(s.primaryArtists)
      ? s.primaryArtists.map((a) => a.name || a).join(", ")
      : s.primaryArtists) ||
    (s.artists?.primary?.map((a) => a.name).join(", ")) ||
    s.singers ||
    "Unknown",
  image: s.image?.[2]?.url || s.image?.[1]?.url || "",
  url: getBestUrl(s.downloadUrl),
  year: parseInt(s.year) || (s.releaseDate ? parseInt(String(s.releaseDate).slice(0, 4)) : 0),
  releaseDate: s.releaseDate || null,
  type: "song",
}));


    // Sort by year (latest first)
    songs.sort((a, b) => b.year - a.year);

    // Render ALL songs (not just 2)
    renderSongs(songs, "artistSongs");

    // Save playlist
    window.currentPlaylist = songs;
    window.currentIndex = -1;

  } catch (err) {
    console.error("Artist fetch error:", err);
    showMessage("Failed to load artist", "error");
  }
});

// 👇 Keep theme consistent
const theme = localStorage.getItem("theme") || "dark";
document.body.classList.add(theme === "light" ? "light-mode" : "dark-mode");
