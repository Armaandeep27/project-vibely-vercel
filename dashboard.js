// === Dashboard Boot ===
document.addEventListener("DOMContentLoaded", async () => {
  if (!(await pingApi())) return;
  if (!(await protectPage())) return;

  const user = await checkAuth();
  if (user) initializeUserProfile(user);

  await loadTrendingSongs();
  initializeSearch();
  initDropdownHandler();
  initPlayerControls();
  initializeThemeText();

  const topCategories = await fetchTopCategories();
  renderCategories(topCategories);
});

// === API Health Check ===
async function pingApi() {
  try {
    const res = await fetch("https://saavn.dev/api/search/songs?query=test");
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    console.log("✅ API Ping successful");
    return true;
  } catch (err) {
    console.error("❌ API Ping failed:", err);
    return false;
  }
}

// === User Info ===
function initializeUserProfile(user) {
  const initial =
    user.user_metadata?.full_name?.[0]?.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "U";
  const el = document.getElementById("profileInitial");
  if (el) el.textContent = initial;
}

function toggleProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown) dropdown.classList.toggle("active");
}

function initDropdownHandler() {
  document.addEventListener("click", (e) => {
    const profile = document.getElementById("profilePic");
    const dropdown = document.getElementById("profileDropdown");
    if (!profile || !dropdown) return;
    if (!profile.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });
}

// === Globals ===
window.currentPlaylist = [];
window.currentIndex = -1;
window.isShuffle = false;
window.isRepeat = false;

// === Helpers ===
function getArtistName(item) {
  if (!item) return "Unknown Artist";
  if (item.artists?.primary) {
    return item.artists.primary.map((a) => a.name).filter(Boolean).join(", ");
  }
  if (item.primaryArtists) {
    return Array.isArray(item.primaryArtists)
      ? item.primaryArtists.map((a) => a.name || a).join(", ")
      : item.primaryArtists;
  }
  return item.singers || item.moreInfo?.singers || "Unknown Artist";
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"']/g, (m) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m];
  });
}

// === API Data Fetching ===
async function fetchItems(type, query = "") {
  try {
    let url = `https://saavn.dev/api/search/${type}`;
    if (query) url += `?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();

    if (type === "artists") {
      return (
        data.data?.results?.map((artist) => ({
          id: artist.id,
          name: artist.name || "Unknown Artist",
          image: artist.image?.[2]?.url || "",
          type: "artist",
        })) || []
      );
    }

    return (
      data.data?.results?.map((item) => ({
        id: item.id,
        title: item.name || "Unknown Title",
        artist: getArtistName(item),
        image: item.image?.[2]?.url || "",
        url: item.downloadUrl?.[4]?.url || "",
        type: type === "albums" ? "album" : "song",
        songs: item.songs || null,
      })) || []
    );
  } catch (err) {
    console.error(err);
    showMessage(`Failed to load ${type}`, "error");
    return [];
  }
}

// === Trending Songs ===
async function loadTrendingSongs() {
  const songs = await fetchItems("songs", "trending");
  const filtered = songs.filter((s) => s.type !== "album");
  renderSongs(filtered, "trendingSongs");
  window.currentPlaylist = filtered;
}

// === Categories ===
async function fetchTopCategories() {
  const genres = ["gym", "punjabi", "english", "jazz"];
  const categories = [];

  for (let genre of genres) {
    const songs = await fetchItems("songs", genre);
    if (songs.length) {
      categories.push({
        name: genre.charAt(0).toUpperCase() + genre.slice(1),
        songCount: songs.length,
        icon: getGenreIcon(genre),
        songs,
      });
    }
  }

  return categories;
}

function getGenreIcon(genre) {
  const icons = {
    gym: "💪",
    punjabi: "🎶",
    english: "🎤",
    jazz: "🎷",
  };
  return icons[genre.toLowerCase()] || "🎵";
}

function renderCategories(categories) {
  const container = document.getElementById("categoriesContainer");
  if (!container) return;

  container.innerHTML = "";
  categories.forEach((cat) => {
    const card = document.createElement("div");
    card.className = "category-card";
    card.innerHTML = `
      <div class="category-icon">${cat.icon}</div>
      <div class="category-name">${escapeHtml(cat.name)}</div>
      <div class="category-count">${cat.songCount} songs</div>
    `;
    card.onclick = () => openCategoryPage(cat);
    container.appendChild(card);
  });
}

function openCategoryPage(category) {
  const songsOnly = category.songs.filter((s) => s.type !== "album");
  const albumsOnly = category.songs.filter((s) => s.type === "album");
  renderSongs(songsOnly, "recentSongs");
  renderSongs(albumsOnly, "albumResults");
  window.currentPlaylist = songsOnly;
  window.currentIndex = -1;
}

// === Render Artists ===
function renderArtists(artists, containerId = "artistResults") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  if (!artists.length) {
    container.innerHTML = '<p style="color:#888;">No artists found</p>';
    return;
  }

  artists.forEach((artist) => {
    const card = document.createElement("div");
    card.className = "artist-card";
    card.innerHTML = `
      <div class="artist-image">${
        artist.image
          ? `<img src="${artist.image}" alt="${escapeHtml(artist.name)}">`
          : "🎤"
      }</div>
      <div class="artist-name">${escapeHtml(artist.name)}</div>
    `;
    card.onclick = () => {
      window.location.href = `artist/artist.html?id=${artist.id}`;
    };
    container.appendChild(card);
  });
}

// === Render Songs/Albums ===
function renderSongs(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = '<p style="color:#888;">No items found</p>';
    return;
  }

  items.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = item.type === "album" ? "album-card" : "song-card";
    card.innerHTML = `
      <div class="song-image">${
        item.image
          ? `<img src="${item.image}" alt="${escapeHtml(item.title)}">`
          : "🎵"
      }</div>
      <div class="song-title">${escapeHtml(item.title)}</div>
      <div class="song-artist">${escapeHtml(item.artist)}</div>
    `;
    card.onclick = () => {
      if (item.type === "album") {
        handleAlbumClick(item.id);
      } else {
        playSong(item, i, items);
      }
    };
    container.appendChild(card);
  });
}

async function handleAlbumClick(albumId) {
  try {
    const res = await fetch(`https://saavn.dev/api/albums?id=${albumId}`);
    if (!res.ok) throw new Error("Album fetch failed");
    const data = await res.json();

    const albumSongs =
      data.data?.songs?.map((s) => ({
        id: s.id,
        title: s.name || "Unknown Title",
        artist: getArtistName(s),
        image: s.image?.[2]?.url || "",
        url: s.downloadUrl?.[4]?.url || "",
        type: "song",
      })) || [];

    if (!albumSongs.length)
      return showMessage("No songs in this album", "error");

    renderSongs(albumSongs, "recentSongs");
    window.currentPlaylist = albumSongs;
    window.currentIndex = -1;
  } catch (err) {
    console.error("Album click error:", err);
    showMessage("Failed to load album", "error");
  }
}

// === Search ===
function initializeSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  let debounce;
  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (query.length < 3) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => performSearch(), 500);
  });
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });
}

async function performSearch() {
  const query = document.getElementById("searchInput")?.value.trim();
  if (!query) return;

  const [songs, albums, artists] = await Promise.all([
    fetchItems("songs", query),
    fetchItems("albums", query),
    fetchItems("artists", query),
  ]);

  renderSongs(songs, "recentSongs");
  renderSongs(albums, "albumResults");
  renderArtists(artists.slice(0, 1), "artistResults");

  window.currentPlaylist = songs;
  window.currentIndex = -1;
}

// === Player ===
function playSong(song, index = null, playlist = null) {
  const player = document.getElementById("audioPlayer");
  const playIcon = document.getElementById("play-icon");
  if (!player || !song.url)
    return showMessage("Song cannot be played", "error");

  if (playlist) {
    window.currentPlaylist = playlist;
    window.currentIndex = index ?? playlist.findIndex((s) => s.id === song.id);
  } else {
    window.currentIndex =
      window.currentPlaylist?.findIndex((s) => s.id === song.id) ?? 0;
  }

  player.src = song.url;
  player.play().catch(() => {});

  if (playIcon) {
    playIcon.classList.remove("fa-play");
    playIcon.classList.add("fa-pause");
  }

  document.getElementById("currentSongTitle").textContent = song.title;
  document.getElementById("currentSongArtist").textContent = song.artist;

  const cover = document.getElementById("currentSongCover");
  const fallback = document.querySelector(".cover-fallback");
  if (cover) {
    if (song.image) {
      cover.src = song.image;
      cover.style.display = "block";
      if (fallback) fallback.style.display = "none";
    } else {
      cover.style.display = "none";
      if (fallback) fallback.style.display = "block";
    }
  }

  document.getElementById("bottomPlayer")?.classList.add("active");
  showMessage(`Now playing: ${song.title}`, "success");
}

// === Player Controls ===
function togglePlay() {
  const player = document.getElementById("audioPlayer");
  const icon = document.getElementById("play-icon");
  if (!player) return;

  if (player.paused) {
    player.play().catch(() => {});
    icon?.classList.replace("fa-play", "fa-pause");
  } else {
    player.pause();
    icon?.classList.replace("fa-pause", "fa-play");
  }
}

function previousSong() {
  changeSong(-1);
}
function nextSong() {
  changeSong(1);
}

function changeSong(step) {
  const list = window.currentPlaylist || [];
  if (!list.length) return showMessage("No songs in queue", "info");

  if (step === 1 && window.isShuffle) {
    let idx = Math.floor(Math.random() * list.length);
    if (list.length > 1 && idx === window.currentIndex)
      idx = (idx + 1) % list.length;
    window.currentIndex = idx;
    return playSong(list[idx], idx, list);
  }

  const nextIndex = window.currentIndex + step;
  if (nextIndex < 0) return showMessage("No previous song", "info");
  if (nextIndex >= list.length) return showMessage("End of queue", "info");

  window.currentIndex = nextIndex;
  playSong(list[nextIndex], nextIndex, list);
}

function initPlayerControls() {
  const player = document.getElementById("audioPlayer");
  const progress = document.getElementById("seekBar");
  const currentTimeEl = document.getElementById("currentTime");
  const totalTimeEl = document.getElementById("totalTime");
  const volumeSlider = document.getElementById("volumeBar");

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, "0");
    return `${m}:${sec}`;
  };

  player.addEventListener("loadedmetadata", () => {
    totalTimeEl.textContent = formatTime(player.duration);
    progress.value = 0;
  });

  player.addEventListener("timeupdate", () => {
    progress.value = (player.currentTime / player.duration) * 100;
    currentTimeEl.textContent = formatTime(player.currentTime);
    totalTimeEl.textContent = formatTime(player.duration);
  });

  progress.addEventListener("input", (e) => {
    player.currentTime = (e.target.value / 100) * player.duration;
  });

  volumeSlider.addEventListener("input", (e) => {
    player.volume = parseFloat(e.target.value);
  });

  player.addEventListener("ended", () => {
    if (!window.isRepeat) nextSong();
  });
}

// === Theme ===
function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  updateThemeText(isDark);
  showMessage("Theme switched!", "success");
  toggleProfileDropdown();
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

function updateThemeText(isDark) {
  const el = document.querySelector(".profile-dropdown .theme-text");
  if (el) el.textContent = isDark ? "Light Mode" : "Dark Mode";
}

function initializeThemeText() {
  updateThemeText(document.body.classList.contains("dark"));
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
});

// === Toast Message ===
function showMessage(msg, type = "info") {
  document.querySelector(".auth-message")?.remove();
  const el = document.createElement("div");
  el.className = `auth-message ${type}`;
  el.textContent = msg;
  el.style.cssText = `
    position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:8px;
    color:white;font-weight:bold;z-index:9999;max-width:300px;
    background-color:${type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#3b82f6"};
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// === Keyboard Shortcuts ===
document.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  }
});

// === Expose to Window ===
window.toggleTheme = toggleTheme;
window.togglePlay = togglePlay;
window.previousSong = previousSong;
window.nextSong = nextSong;
window.performSearch = performSearch;
window.playSong = playSong;
window.toggleProfileDropdown = toggleProfileDropdown;
window.viewProfile = () => {
  showMessage("Opening profile...", "info");
  toggleProfileDropdown();
};
window.viewLibrary = () => {
  showMessage("Opening library...", "info");
  toggleProfileDropdown();
};
window.viewSettings = () => {
  showMessage("Opening settings...", "info");
  toggleProfileDropdown();
};
window.logoutUser = () => {
  showMessage("Logging out...", "info");
  toggleProfileDropdown();
};
