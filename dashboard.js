// --- Boot ---
document.addEventListener('DOMContentLoaded', async function () {
  // Protect this page - require authentication
  const isAuthenticated = await protectPage();
  if (!isAuthenticated) return;

  // Get current user and display profile
  const user = await checkAuth();
  if (user) initializeUserProfile(user);

  // Load lists
  loadRecentSongs();
  loadTrendingSongs();

  // Init search + global click
  initializeSearch();
  initOutsideClickToCloseDropdown();
});

// --- Profile ---
function initializeUserProfile(user) {
  const email = user.email || '';
  const initial = email.charAt(0).toUpperCase();
  document.getElementById('profileInitial').textContent = initial;

  if (user.user_metadata && user.user_metadata.full_name) {
    const fullName = user.user_metadata.full_name;
    const firstInitial = fullName.charAt(0).toUpperCase();
    document.getElementById('profileInitial').textContent = firstInitial;
  }
}

function toggleProfileDropdown() {
  document.getElementById('profileDropdown').classList.toggle('active');
}

function initOutsideClickToCloseDropdown() {
  document.addEventListener('click', function (event) {
    const profilePic = document.getElementById('profilePic');
    const dropdown = document.getElementById('profileDropdown');
    if (!profilePic.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.classList.remove('active');
    }
  });
}

// --- Data (mock) ---
const sampleSongs = [
  { title: 'Blinding Lights', artist: 'The Weeknd', icon: '🌟' },
  { title: 'Shape of You', artist: 'Ed Sheeran', icon: '💝' },
  { title: 'Stay', artist: 'The Kid LAROI', icon: '🎭' },
  { title: 'Good 4 U', artist: 'Olivia Rodrigo', icon: '🔥' },
  { title: 'Levitating', artist: 'Dua Lipa', icon: '✨' }
];

const trendingSongs = [
  { title: 'As It Was', artist: 'Harry Styles', icon: '🎨' },
  { title: 'Heat Waves', artist: 'Glass Animals', icon: '🌊' },
  { title: 'Bad Habit', artist: 'Steve Lacy', icon: '🎵' },
  { title: 'Anti-Hero', artist: 'Taylor Swift', icon: '🦸‍♀️' },
  { title: 'Unholy', artist: 'Sam Smith', icon: '😈' }
];

// --- Renderers ---
function loadRecentSongs() {
  const container = document.getElementById('recentSongs');
  container.innerHTML = '';
  sampleSongs.forEach((song) => {
    const songCard = document.createElement('div');
    songCard.className = 'song-card';
    songCard.innerHTML = `
      <div class="song-image">${song.icon}</div>
      <div class="song-title">${song.title}</div>
      <div class="song-artist">${song.artist}</div>
    `;
    songCard.onclick = () => playSong(song);
    container.appendChild(songCard);
  });
}

function loadTrendingSongs() {
  const container = document.getElementById('trendingSongs');
  container.innerHTML = '';
  trendingSongs.forEach((song) => {
    const songCard = document.createElement('div');
    songCard.className = 'song-card';
    songCard.innerHTML = `
      <div class="song-image">${song.icon}</div>
      <div class="song-title">${song.title}</div>
      <div class="song-artist">${song.artist}</div>
    `;
    songCard.onclick = () => playSong(song);
    container.appendChild(songCard);
  });
}

// --- Player ---
function playSong(song) {
  document.getElementById('currentSongTitle').textContent = song.title;
  document.getElementById('currentSongArtist').textContent = song.artist;
  document.getElementById('bottomPlayer').classList.add('active');
  document.getElementById('playBtn').textContent = '⏸️';
  showMessage(`Now playing: ${song.title}`, 'success');
}

function togglePlay() {
  const playBtn = document.getElementById('playBtn');
  playBtn.textContent = playBtn.textContent === '▶️' ? '⏸️' : '▶️';
}

function previousSong() { showMessage('Previous song', 'info'); }
function nextSong() { showMessage('Next song', 'info'); }

// --- Profile menu actions ---
function viewProfile() { showMessage('Opening profile...', 'info'); closeDropdown(); }
function viewLibrary() { showMessage('Opening your library...', 'info'); closeDropdown(); }
function viewSettings() { showMessage('Opening settings...', 'info'); closeDropdown(); }
function toggleTheme() { showMessage('Theme switched!', 'success'); closeDropdown(); }
function closeDropdown() { document.getElementById('profileDropdown').classList.remove('active'); }

// --- Categories ---
function openCategory(category) { showMessage(`Opening ${category} category...`, 'info'); }

// --- Search ---
function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', function () {
    const query = this.value.toLowerCase();
    if (query.length > 2) {
      setTimeout(() => { showMessage(`Found results for "${query}"`, 'info'); }, 500);
    }
  });
  searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') performSearch();
  });
}

function performSearch() {
  const query = document.getElementById('searchInput').value;
  if (query.trim()) showMessage(`Searching for: ${query}`, 'info');
}

// --- Notifications ---
function showNotifications() {
  showMessage('You have 3 new notifications!', 'info');
  document.getElementById('notificationBadge').textContent = '0';
}

// --- Toast helper ---
function showMessage(message, type = 'info') {
  const existingMsg = document.querySelector('.auth-message');
  if (existingMsg) existingMsg.remove();

  const messageEl = document.createElement('div');
  messageEl.className = `auth-message ${type}`;
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 15px 20px;
    border-radius: 8px; color: white; font-weight: bold; z-index: 9999; max-width: 300px;
    ${type === 'success' ? 'background-color: #22c55e;' : ''}
    ${type === 'error' ? 'background-color: #ef4444;' : ''}
    ${type === 'info' ? 'background-color: #3b82f6;' : ''}
  `;
  document.body.appendChild(messageEl);
  setTimeout(() => { if (messageEl.parentNode) messageEl.remove(); }, 4000);
}



// Expose functions used by inline HTML onclicks (global scope)
window.toggleProfileDropdown = toggleProfileDropdown;
window.viewProfile = viewProfile;
window.viewLibrary = viewLibrary;
window.viewSettings = viewSettings;
window.toggleTheme = toggleTheme;
window.logoutUser = logoutUser; // comes from your auth.js
window.openCategory = openCategory;
window.performSearch = performSearch;
window.showNotifications = showNotifications;
window.playSong = playSong;
window.togglePlay = togglePlay;
window.previousSong = previousSong;
window.nextSong = nextSong;
