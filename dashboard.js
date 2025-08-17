// --- Boot ---
document.addEventListener('DOMContentLoaded', async () => {
    if (!await pingApi()) return;
    if (!await protectPage()) return;

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

// --- API Ping ---
async function pingApi() {
    try {
        const res = await fetch('https://saavn.dev/api/search/songs?query=test');
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        console.log("API Ping successful");
        return true;
    } catch (err) {
        console.error("Ping failed:", err);
        return false;
    }
}

// --- User Profile ---
function initializeUserProfile(user) {
    const initial = user.user_metadata?.full_name?.charAt(0).toUpperCase()
        || user.email?.charAt(0).toUpperCase()
        || 'U';
    const el = document.getElementById('profileInitial');
    if (el) el.textContent = initial;
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function initDropdownHandler() {
    document.addEventListener('click', (e) => {
        const profile = document.getElementById('profilePic');
        const dropdown = document.getElementById('profileDropdown');
        if (!profile || !dropdown) return;
        if (!profile.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('active');
    });
}

// --- Globals ---
window.currentPlaylist = [];
window.currentIndex = -1;
window.isShuffle = false;
window.isRepeat = false;

// --- Helpers ---
function getArtistName(item) {
    if (!item) return 'Unknown Artist';
    if (item.artists?.primary) return item.artists.primary.map(a => a.name || '').filter(Boolean).join(', ');
    if (item.primaryArtists) return Array.isArray(item.primaryArtists)
        ? item.primaryArtists.map(a => a.name || a).filter(Boolean).join(', ')
        : item.primaryArtists;
    return item.singers || item.moreInfo?.singers || 'Unknown Artist';
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));
}

// --- Fetch Songs / Albums ---
async function fetchItems(type, query='') {
    try {
        let url = `https://saavn.dev/api/search/${type}`;
        if (query) url += `?query=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response failed');
        const data = await res.json();
        return data.data?.results?.map(item => ({
            id: item.id,
            title: item.name || 'Unknown Title',
            artist: getArtistName(item),
            image: item.image?.[2]?.url || '',
            url: item.downloadUrl?.[4]?.url || '',
            type: type === 'albums' ? 'album' : 'song',
            songs: item.songs || null
        })) || [];
    } catch (err) {
        console.error(err);
        showMessage(`Failed to load ${type}`, 'error');
        return [];
    }
}

// --- Load Trending Songs ---
async function loadTrendingSongs() {
    const trending = await fetchItems('songs', 'trending');
    renderSongs(trending.filter(s => s.type !== 'album'), 'trendingSongs');
    window.currentPlaylist = trending.filter(s => s.type !== 'album');
}

// --- Top Categories ---
async function fetchTopCategories() {
    const genres = ['gym', 'punjabi', 'english', 'jazz'];
    const categories = [];
    for (let genre of genres) {
        const songs = await fetchItems('songs', genre);
        if (songs.length) categories.push({
            name: genre.charAt(0).toUpperCase() + genre.slice(1),
            songCount: songs.length,
            icon: getGenreIcon(genre),
            songs
        });
    }
    return categories;
}

function getGenreIcon(genre) {
    switch(genre.toLowerCase()){
        case 'gym': return '💪';
        case 'punjabi': return '🎶';
        case 'english': return '🎤';
        case 'jazz': return '🎷';
        default: return '🎵';
    }
}

// --- Render Categories ---
function renderCategories(categories) {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    container.innerHTML = '';
    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
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
    renderSongs(category.songs.filter(s => s.type !== 'album'), 'recentSongs');
    renderSongs(category.songs.filter(s => s.type === 'album'), 'albumResults');
    window.currentPlaylist = category.songs.filter(s => s.type !== 'album');
    window.currentIndex = -1;
}

// --- Render Songs / Albums ---
function renderSongs(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!items.length) {
        container.innerHTML = '<p style="color:#888;">No items found</p>';
        return;
    }

    items.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = item.type === 'album' ? 'album-card' : 'song-card';
        card.innerHTML = `
            <div class="song-image">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.title)}">` : '🎵'}</div>
            <div class="song-title">${escapeHtml(item.title)}</div>
            <div class="song-artist">${escapeHtml(item.artist)}</div>
        `;

        card.onclick = async () => {
            if (item.type === 'album' && item.songs?.length) {
                // Fetch actual playable URLs for each song
                const albumSongs = await Promise.all(item.songs.map(async s => {
                    try {
                        const res = await fetch(`https://saavn.dev/api/song/${s.id}`);
                        if (!res.ok) throw new Error('Failed fetching song URL');
                        const data = await res.json();
                        return {
                            id: s.id,
                            title: s.name || 'Unknown Title',
                            artist: getArtistName(s),
                            image: s.image?.[2]?.url || '',
                            url: data.downloadUrl?.[4]?.url || '',
                            type: 'song'
                        };
                    } catch {
                        return null;
                    }
                }));
                const validSongs = albumSongs.filter(Boolean);
                if (!validSongs.length) return showMessage('No playable songs in album','error');

                renderSongs(validSongs, 'recentSongs');
                window.currentPlaylist = validSongs;
                window.currentIndex = 0;
                playSong(validSongs[0], 0, validSongs);
            } else {
                playSong(item, i, items);
            }
        };

        container.appendChild(card);
    });
}

// --- Search ---
function initializeSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    let debounce;
    input.addEventListener('input', () => {
        const query = input.value.trim();
        if (query.length < 3) return;
        clearTimeout(debounce);
        debounce = setTimeout(() => performSearch(), 500);
    });
    input.addEventListener('keypress', e => { if(e.key==='Enter') performSearch(); });
}

async function performSearch() {
    const query = document.getElementById('searchInput')?.value.trim();
    if (!query) return;
    const songs = await fetchItems('songs', query);
    const albums = await fetchItems('albums', query);

    renderSongs(songs, 'recentSongs');
    renderSongs(albums, 'albumResults');

    window.currentPlaylist = songs;
    window.currentIndex = -1;
}

// --- Player ---
function playSong(song, index=null, playlist=null) {
    const player = document.getElementById('audioPlayer');
    if (!player || !song?.url) return showMessage('Song cannot be played', 'error');

    if (playlist) {
        window.currentPlaylist = playlist;
        window.currentIndex = index ?? playlist.findIndex(s => s.id===song.id);
    } else {
        window.currentIndex = window.currentPlaylist?.findIndex(s => s.id===song.id) ?? 0;
    }

    player.src = song.url;
    player.play().catch(()=>{});

    document.getElementById('currentSongTitle').textContent = song.title;
    document.getElementById('currentSongArtist').textContent = song.artist;

    const coverEl = document.getElementById('currentSongCover');
    const fallback = document.querySelector('.cover-fallback');
    if (coverEl) {
        if (song.image) { coverEl.src = song.image; coverEl.style.display='block'; if(fallback) fallback.style.display='none'; }
        else { coverEl.style.display='none'; if(fallback) fallback.style.display='block'; }
    }

    document.getElementById('bottomPlayer')?.classList.add('active');
    document.getElementById('playBtn').textContent = '⏸️';
    showMessage(`Now playing: ${song.title}`, 'success');
}

function togglePlay() {
    const player = document.getElementById('audioPlayer');
    const btn = document.getElementById('playBtn');
    if (!player) return;
    if (player.paused) { player.play().catch(()=>{}); if(btn) btn.textContent='⏸️'; }
    else { player.pause(); if(btn) btn.textContent='▶️'; }
}

function previousSong() { changeSong(-1); }
function nextSong() { changeSong(1); }

function changeSong(step) {
    const list = window.currentPlaylist || [];
    if (!list.length) return showMessage('No songs in queue','info');

    if (step===1 && window.isShuffle) {
        let idx=Math.floor(Math.random()*list.length);
        if(list.length>1 && idx===window.currentIndex) idx=(idx+1)%list.length;
        window.currentIndex=idx;
        playSong(list[idx], idx, list);
        return;
    }

    let nextIndex=window.currentIndex+step;
    if(nextIndex<0) return showMessage('No previous song','info');
    if(nextIndex>=list.length) return showMessage('End of queue','info');
    window.currentIndex=nextIndex;
    playSong(list[nextIndex], nextIndex, list);
}

// --- Player Controls ---
function initPlayerControls() {
    const player = document.getElementById('audioPlayer');
    if(!player) return;

    const progress = document.getElementById('seekBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const volumeSlider = document.getElementById('volumeBar');

    const formatTime = s => {
        if(!s||isNaN(s)) return '0:00';
        const m=Math.floor(s/60);
        const sec=Math.floor(s%60).toString().padStart(2,'0');
        return `${m}:${sec}`;
    }

    player.addEventListener('loadedmetadata', ()=>{
        if(totalTimeEl) totalTimeEl.textContent=formatTime(player.duration);
        if(progress) progress.value=0;
    });

    player.addEventListener('timeupdate', ()=>{
        if(progress && player.duration) progress.value=(player.currentTime/player.duration)*100;
        if(currentTimeEl) currentTimeEl.textContent=formatTime(player.currentTime);
        if(totalTimeEl) totalTimeEl.textContent=formatTime(player.duration);
    });

    if(progress) progress.addEventListener('input', e=>{ player.currentTime=(e.target.value/100)*player.duration; });
    if(volumeSlider) volumeSlider.addEventListener('input', e=>{ player.volume=parseFloat(e.target.value); });
    player.addEventListener('ended', ()=>{ if(!window.isRepeat) nextSong(); });
}

// --- Toasts ---
function showMessage(msg,type='info') {
    document.querySelector('.auth-message')?.remove();
    const el=document.createElement('div');
    el.className=`auth-message ${type}`;
    el.textContent=msg;
    el.style.cssText=`position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:8px;color:white;font-weight:bold;z-index:9999;max-width:300px;background-color:${type==='success'?'#22c55e':type==='error'?'#ef4444':'#3b82f6'};`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),4000);
}

// --- Theme ---
function toggleTheme() {
    const isDark=document.body.classList.toggle('dark');
    showMessage(`Theme switched!`,'success');
    updateThemeText(isDark);
    toggleProfileDropdown();
}
function updateThemeText(isDark) {
    const el=document.querySelector('.profile-dropdown .theme-text');
    if(!el) return;
    el.textContent=isDark?'Light Mode':'Dark Mode';
}
function initializeThemeText() {
    updateThemeText(document.body.classList.contains('dark'));
}

// --- Window Expose ---
window.toggleProfileDropdown=toggleProfileDropdown;
window.viewProfile=()=>{ showMessage('Opening profile...','info'); toggleProfileDropdown(); };
window.viewLibrary=()=>{ showMessage('Opening library...','info'); toggleProfileDropdown(); };
window.viewSettings=()=>{ showMessage('Opening settings...','info'); toggleProfileDropdown(); };
window.toggleTheme=toggleTheme;
window.logoutUser=()=>{ showMessage('Logging out...','info'); toggleProfileDropdown(); };
window.performSearch=performSearch;
window.togglePlay=togglePlay;
window.previousSong=previousSong;
window.nextSong=nextSong;
window.playSong=playSong;
