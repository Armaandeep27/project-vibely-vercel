// --- Boot ---
document.addEventListener('DOMContentLoaded', async function () {
    const healthy = await pingApi();
    if (!healthy) return;

    const isAuthenticated = await protectPage();
    if (!isAuthenticated) return;

    const user = await checkAuth();
    if (user) initializeUserProfile(user);

    loadSongs();
    initializeSearch();
    initOutsideClickToCloseDropdown();
    initPlayerControls();
});

// --- Ping API ---
async function pingApi() {
    try {
        const response = await fetch('https://saavn.dev/api/search/songs?query=test');
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        console.log("API Ping successful");
        return true;
    } catch (error) {
        console.error("Ping failed:", error);
        return false;
    }
}

// --- Profile ---
function initializeUserProfile(user) {
    const email = user.email || '';
    const initial = email.charAt(0).toUpperCase();
    const el = document.getElementById('profileInitial');
    if (el) el.textContent = initial;

    if (user.user_metadata?.full_name) {
        const fullInitial = user.user_metadata.full_name.charAt(0).toUpperCase();
        if (el) el.textContent = fullInitial;
    }
}

function toggleProfileDropdown() {
    const dd = document.getElementById('profileDropdown');
    if (dd) dd.classList.toggle('active');
}

function initOutsideClickToCloseDropdown() {
    document.addEventListener('click', function (event) {
        const profilePic = document.getElementById('profilePic');
        const dropdown = document.getElementById('profileDropdown');
        if (!profilePic || !dropdown) return;
        if (!profilePic.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.remove('active');
        }
    });
}

// --- Globals ---
window.songQueue = [];
window.currentPlaylist = null;
window.currentIndex = -1;
window.isShuffle = false;
window.isRepeat = false;

// --- Artist Helper ---
function getArtistName(song) {
    if (!song) return 'Unknown Artist';
    // prefer primary artists from API
    if (song.artists?.primary && Array.isArray(song.artists.primary)) {
        return song.artists.primary.map(a => a.name || '').filter(Boolean).join(', ');
    }
    // fallback to old logic
    if (song.primaryArtists) {
        if (Array.isArray(song.primaryArtists)) {
            const names = song.primaryArtists.map(a => (a?.name || a)).filter(Boolean);
            if (names.length) return names.join(', ');
        } else if (typeof song.primaryArtists === 'string' && song.primaryArtists.trim()) {
            return song.primaryArtists;
        }
    }
    if (song.singers && song.singers.trim()) return song.singers;
    if (song.moreInfo?.singers && song.moreInfo.singers.trim()) return song.moreInfo.singers;
    return 'Unknown Artist';
}


// --- Fetch Songs ---
async function fetchSongs(endpoint, query = '') {
    try {
        let url = `https://saavn.dev/api/${endpoint}`;
        if (query) url += `?query=${encodeURIComponent(query)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        if (data.data?.results) {
            return data.data.results.map(song => {
                console.log('Song object:', song); // debug artist fields
                return {
                    id: song.id,
                    title: song.name || 'Unknown Title',
                    artist: getArtistName(song),
                    image: song.image?.[2]?.url || '',
                    url: song.downloadUrl?.[4]?.url || ''
                };
            });
        }
        return [];
    } catch (error) {
        console.error('Error fetching songs:', error);
        showMessage('Failed to load songs', 'error');
        return [];
    }
}

// --- Load Songs ---
async function loadSongs() {
    const trendingSongs = await fetchSongs('search/songs', 'trending');
    const recentSongs = await fetchSongs('search/songs', 'latest');

    renderSongs(recentSongs, 'recentSongs');
    renderSongs(trendingSongs, 'trendingSongs');

    window.songQueue = [...recentSongs, ...trendingSongs];
    window.currentPlaylist = null;
    window.currentIndex = -1;
}

// --- Render Songs ---
function renderSongs(songs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    songs.forEach((song, i) => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.innerHTML = `
            <div class="song-image">${song.image ? `<img src="${song.image}" alt="${escapeHtml(song.title)}">` : '🎵'}</div>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>

        `;
        card.onclick = () => playSong(song, i, songs);
        container.appendChild(card);
    });
}

// --- Play Song ---
function playSong(song, index = null, playlist = null) {
    const player = document.getElementById('audioPlayer');
    if (!player) return;

    const src = song?.url || '';
    if (!src) { showMessage('Song has no playable URL', 'error'); return; }

    if (Array.isArray(playlist)) {
        window.currentPlaylist = playlist;
        window.currentIndex = typeof index === 'number' ? index : playlist.findIndex(s => s.id === song.id);
    } else {
        const idx = window.currentPlaylist?.findIndex(s => s.id === song.id);
        if (idx >= 0) window.currentIndex = idx;
        else {
            const gidx = window.songQueue.findIndex(s => s.id === song.id);
            window.currentIndex = gidx;
            window.currentPlaylist = null;
        }
    }

    if (player.src !== src) player.src = src;
    player.play().catch(() => {});

    const titleEl = document.getElementById('currentSongTitle');
    const artistEl = document.getElementById('currentSongArtist');
    const coverEl = document.getElementById('currentSongCover');
    const fallbackEl = document.querySelector('.cover-fallback');

    if (titleEl) titleEl.textContent = song.title || 'Unknown Title';
    if (artistEl) artistEl.textContent = song.artist || 'Unknown Artist';
    if (coverEl && song.image) {
        coverEl.src = song.image;
        coverEl.style.display = 'block';
        if (fallbackEl) fallbackEl.style.display = 'none';
    } else if (coverEl) {
        coverEl.style.display = 'none';
        if (fallbackEl) fallbackEl.style.display = 'block';
    }

    const bp = document.getElementById('bottomPlayer');
    if (bp) bp.classList.add('active');
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.textContent = '⏸️';
    showMessage(`Now playing: ${song.title}`, 'success');
}

// --- Play / Pause ---
function togglePlay() {
    const player = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playBtn');
    if (!player) return;
    if (player.paused) { player.play().catch(() => {}); if (playBtn) playBtn.textContent = '⏸️'; }
    else { player.pause(); if (playBtn) playBtn.textContent = '▶️'; }
}

// --- Next / Previous ---
function previousSong() {
    const list = Array.isArray(window.currentPlaylist) ? window.currentPlaylist : window.songQueue;
    if (!list?.length) { showMessage('No songs in queue', 'info'); return; }
    if (window.currentIndex > 0) { window.currentIndex--; playSong(list[window.currentIndex], window.currentIndex, list); }
    else showMessage('No previous song', 'info');
}

function nextSong() {
    const list = Array.isArray(window.currentPlaylist) ? window.currentPlaylist : window.songQueue;
    if (!list?.length) { showMessage('No songs in queue', 'info'); return; }

    if (window.isShuffle) {
        let idx = Math.floor(Math.random() * list.length);
        if (list.length > 1 && idx === window.currentIndex) idx = (idx + 1) % list.length;
        window.currentIndex = idx;
        playSong(list[idx], idx, list);
        return;
    }

    if (window.currentIndex < list.length - 1) { window.currentIndex++; playSong(list[window.currentIndex], window.currentIndex, list); }
    else showMessage('End of queue', 'info');
}

// --- Player Controls ---
function initPlayerControls() {
    const player = document.getElementById('audioPlayer');
    if (!player) return;

    const progressBar = document.getElementById('seekBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const volumeSlider = document.getElementById('volumeBar');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');

    function formatTime(s) { if (!s || isNaN(s)) return '0:00'; const m=Math.floor(s/60); const sec=Math.floor(s%60).toString().padStart(2,'0'); return `${m}:${sec}`; }

    player.addEventListener('loadedmetadata', () => {
        if (totalTimeEl) totalTimeEl.textContent = formatTime(player.duration);
        if (progressBar) progressBar.value = 0;
    });
    player.addEventListener('timeupdate', () => {
        if (progressBar && player.duration) progressBar.value = (player.currentTime/player.duration)*100;
        if (currentTimeEl) currentTimeEl.textContent = formatTime(player.currentTime);
        if (totalTimeEl) totalTimeEl.textContent = formatTime(player.duration);
    });

    if (progressBar) progressBar.addEventListener('input', e => {
        if (!player.duration) return;
        player.currentTime = (Number(e.target.value)/100)*player.duration;
    });

    if (volumeSlider) volumeSlider.addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        player.volume = v<=1?v:v/100;
    });

    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            window.isShuffle = !window.isShuffle;
            shuffleBtn.style.color = window.isShuffle ? 'var(--primary)' : '';
            showMessage(window.isShuffle ? 'Shuffle On' : 'Shuffle Off', 'info');
        });
    }

    if (repeatBtn) {
        repeatBtn.addEventListener('click', () => {
            window.isRepeat = !window.isRepeat;
            player.loop = window.isRepeat;
            repeatBtn.style.color = window.isRepeat ? 'var(--primary)' : '';
            showMessage(window.isRepeat ? 'Repeat On' : 'Repeat Off', 'info');
        });
    }

    player.addEventListener('ended', () => { if (!window.isRepeat) nextSong(); });
}

// --- Search ---
function initializeSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    let debounce;
    input.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length>2) {
            clearTimeout(debounce);
            debounce=setTimeout(async()=>{
                showMessage(`Searching "${query}"...`, 'info');
                const results = await fetchSongs('search/songs', query);
                renderSongs(results,'recentSongs');
                window.currentPlaylist = results; window.currentIndex=-1;
            },500);
        }
    });
    input.addEventListener('keypress', e => { if(e.key==='Enter') performSearch(); });
}

async function performSearch() {
    const input = document.getElementById('searchInput'); if(!input) return;
    const query=input.value.trim(); if(!query) return;
    showMessage(`Searching for: ${query}`,'info');
    const results=await fetchSongs('search/songs', query);
    renderSongs(results,'recentSongs');
    window.currentPlaylist=results; window.currentIndex=-1;
}

// --- Notifications ---
function showNotifications() {
    showMessage('You have 3 new notifications!','info');
    const el=document.getElementById('notificationBadge'); if(el) el.textContent='0';
}

// --- Toast Helper ---
function showMessage(msg,type='info') {
    const existing=document.querySelector('.auth-message'); if(existing) existing.remove();
    const el=document.createElement('div'); el.className=`auth-message ${type}`; el.textContent=msg;
    el.style.cssText=`position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:8px;color:white;font-weight:bold;z-index:9999;max-width:300px;${type==='success'?'background-color:#22c55e;':''}${type==='error'?'background-color:#ef4444;':''}${type==='info'?'background-color:#3b82f6;':''}`;
    document.body.appendChild(el);
    setTimeout(()=>{ if(el.parentNode) el.remove(); },4000);
}

// --- HTML Escape ---
function escapeHtml(str) { if(typeof str!=='string') return str; return str.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

// --- Expose Globals ---
window.toggleProfileDropdown = toggleProfileDropdown;
window.viewProfile = ()=>{ showMessage('Opening profile...','info'); closeDropdown(); };
window.viewLibrary = ()=>{ showMessage('Opening library...','info'); closeDropdown(); };
window.viewSettings = ()=>{ showMessage('Opening settings...','info'); closeDropdown(); };
window.toggleTheme = ()=>{ showMessage('Theme switched!','success'); closeDropdown(); };
window.logoutUser = logoutUser; // from auth.js
window.openCategory = category=>showMessage(`Opening ${category}...`,'info');
window.performSearch = performSearch;
window.showNotifications = showNotifications;
window.playSong = playSong;
window.togglePlay = togglePlay;
window.previousSong = previousSong;
window.nextSong = nextSong;
