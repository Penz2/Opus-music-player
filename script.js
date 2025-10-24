const $ = (s) => document.querySelector(s);

const resultsEl = $('#results');
const noResultsEl = $('#no-results');
const searchInput = $('#search-input');
const searchBtn = $('#search-btn');
const feedback = $('#search-feedback');

const audio = $('#audio');
const playBtn = $('#play-btn');
const prevBtn = $('#prev-btn');
const nextBtn = $('#next-btn');
const progress = $('#progress');
const timeCurrent = $('#time-current');
const timeTotal = $('#time-total');
const volumeEl = $('#volume');

let playerCover = $('#player-cover') || $('#song-cover');
const playerTitle = $('#player-title');
const playerArtist = $('#player-artist');
const playerAlbum = $('#player-album');
const errorMsg = $('#error-msg');

const signupForm = $('#signup-form');
const nameInput = $('#name-input');
const welcomeMsg = $('#welcome-msg');

const state = {
  tracks: [],
  currentIndex: -1
};

/* -- Cover helper & fallback -- */
function setCover(url) {
  // ensure we have element reference
  if (!playerCover) playerCover = $('#player-cover') || $('#song-cover');
  if (!playerCover) return;
  playerCover.src = url || 'https://via.placeholder.com/600x400?text=No+Image';
}

// fallback in case remote image fails to load
(function initCoverFallback(){
  if (!playerCover) playerCover = $('#player-cover') || $('#song-cover');
  if (!playerCover) return;
  playerCover.onerror = () => {
    try {
      playerCover.src = 'https://via.placeholder.com/600x400?text=No+Image';
    } catch (e) { /* ignore */ }
  };
})();

/* -- Signup display -- */
function initSignupDisplay(){
  const saved = localStorage.getItem('myplayer_user');
  const signupLink = document.getElementById('signup-link');
  const welcomeArea = document.getElementById('welcome-area');
  const welcomeMsg = document.getElementById('welcome-msg');
  const signoutBtn = document.getElementById('signout-btn');

  if (saved) {
    if (signupLink) signupLink.style.display = 'none';
    if (welcomeArea) welcomeArea.style.display = 'flex';
    if (welcomeMsg) welcomeMsg.textContent = 'Welcome, ' + saved;
  } else {
    if (signupLink) signupLink.style.display = 'inline-block';
    if (welcomeArea) welcomeArea.style.display = 'none';
  }

  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      localStorage.removeItem('myplayer_user');

      if (signupLink) signupLink.style.display = 'inline-block';
      if (welcomeArea) welcomeArea.style.display = 'none';
    });
  }
}

function jsonp(url){
  return new Promise((resolve, reject) => {
    const cb = 'dcb_' + Math.random().toString(36).slice(2);
    window[cb] = (data) => {
      resolve(data);
      try { delete window[cb]; } catch (e) {}
      script.remove();
    };
    const script = document.createElement('script');
    script.src = url + (url.includes('?') ? '&' : '?') + 'output=jsonp&callback=' + cb;
    script.onerror = () => {
      try { delete window[cb]; } catch (e) {}
      script.remove();
      reject(new Error('Network error loading JSONP'));
    };
    document.body.appendChild(script);
  });
}

/* -- Search with logs -- */
async function searchDeezer(query){
  const q = encodeURIComponent(query);
  const url = 'https://api.deezer.com/search?q=' + q;
  feedback.textContent = 'Searching...';

  console.log('[searchDeezer] url:', url);

  try {
    const data = await jsonp(url);
    console.log('[searchDeezer] received data:', data);
    feedback.textContent = '';
    return data && data.data ? data.data : [];
  } catch(err){
    feedback.textContent = '';
    console.error('[searchDeezer] error:', err);
    throw err;
  }
}

/* -- Render results -- */
function renderResults(tracks){
  resultsEl.innerHTML = '';
  if(!tracks || tracks.length === 0){
    noResultsEl.style.display = 'block';
    return;
  }
  noResultsEl.style.display = 'none';
  tracks.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img class="cover" src="${t.album?.cover_medium || t.album?.cover_small || 'https://via.placeholder.com/300x300?text=No+Image'}" alt="${escapeHtml(t.title)}" />
      <p class="meta">${escapeHtml(t.title)}</p>
      <p class="submeta">${escapeHtml(t.artist?.name || '')}</p>
      <p class="submeta" style="margin-top:6px;font-size:0.82rem;color:var(--muted)">${escapeHtml(t.album?.title || '')}</p>
    `;
    card.addEventListener('click', () => {
      loadTrack(i);
      playAudio();
    });
    resultsEl.appendChild(card);
  });
}

function escapeHtml(s){
  if(!s) return '';
  return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* -- Player control functions -- */
function loadTrack(index){
  const t = state.tracks[index];
  if(!t) return;
  state.currentIndex = index;
  audio.src = t.preview;
  audio.load();

  setCover(t.album?.cover_big || t.album?.cover_medium || t.album?.cover_small || 'https://via.placeholder.com/600x400?text=No+Image');

  playerTitle.textContent = t.title;
  playerArtist.textContent = t.artist?.name || '';
  playerAlbum.textContent = t.album?.title || '';
  timeCurrent.textContent = '0:00';
  timeTotal.textContent = '0:30';
  progress.value = 0;
  // hide any search error when we have a track
  hideSearchError();
  if (errorMsg) errorMsg.textContent = '';
}

function playAudio(){
  if(!audio.src){ alert('Pick a track first'); return; }
  audio.play().then(()=> playBtn.textContent = 'Pause').catch((e) => {
    console.warn('play failed', e);
    if (errorMsg) errorMsg.textContent = 'Playback blocked. Tap Play to allow audio.';
  });
}
function pauseAudio(){ audio.pause(); playBtn.textContent = 'Play'; }
function togglePlay(){ if(audio.paused) playAudio(); else pauseAudio(); }

function nextTrack(){
  if(state.tracks.length === 0) return;
  const next = (state.currentIndex + 1) % state.tracks.length;
  loadTrack(next);
  playAudio();
}
function prevTrack(){
  if(state.tracks.length === 0) return;
  const prev = (state.currentIndex - 1 + state.tracks.length) % state.tracks.length;
  loadTrack(prev);
  playAudio();
}

audio.addEventListener('timeupdate', () => {
  const dur = audio.duration || 30;
  const cur = audio.currentTime || 0;
  const pct = (cur / dur) * 100;
  progress.value = pct;
  timeCurrent.textContent = formatTime(cur);
  timeTotal.textContent = formatTime(dur);
});

audio.addEventListener('ended', nextTrack);

/* -- UI interactions -- */
progress.addEventListener('input', (e) => {
  const dur = audio.duration || 30;
  const pct = parseFloat(e.target.value);
  audio.currentTime = (pct / 100) * dur;
});

volumeEl.addEventListener('input', (e) => {
  audio.volume = parseFloat(e.target.value);
  localStorage.setItem('myplayer_volume', audio.volume);
});

playBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') doSearch(); });

async function doSearch(){
  const q = searchInput.value.trim();
  if(!q){ feedback.textContent = 'Please type a search term'; return; }

  // hide previous error before starting
  hideSearchError();

  try {
    feedback.textContent = 'Searching...';
    const tracks = await searchDeezer(q);
    state.tracks = tracks;
    renderResults(tracks);
    if(tracks.length) loadTrack(0);
    feedback.textContent = tracks.length ? `Found ${tracks.length} tracks` : '';
    if (!tracks || tracks.length === 0) {
      // show friendly message if no results
      showSearchError('No tracks found.');
    }
  } catch(err){
    console.error('[doSearch] failed:', err);
    feedback.textContent = '';
    showSearchError('Search failed. Try again later.');
  }
}

/* --Error display helpers -- */
function showSearchError(msg) {
  // you can use #search-error element, create it dynamically if not present
  let el = document.getElementById('search-error');
  if (!el) {
    // create a small error element beneath the feedback area
    el = document.createElement('div');
    el.id = 'search-error';
    el.className = 'error';
    // insert after feedback if possible
    if (feedback && feedback.parentNode) feedback.parentNode.insertBefore(el, feedback.nextSibling);
    else document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
}
function hideSearchError() {
  const el = document.getElementById('search-error');
  if (el) el.style.display = 'none';
}

/* ----------------- Utility: format time ----------------- */
function formatTime(t) {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
const localSignupForm = $('#signup-form-local');
const localNameInput = $('#signup-name');

if (localSignupForm && localNameInput) {
  const saved = localStorage.getItem('myplayer_user');
  if (saved) localNameInput.value = saved;

  localSignupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = localNameInput.value.trim();
    if (!name) {
      alert('Please enter a name');
      localNameInput.focus();
      return;
    }

    localStorage.setItem('myplayer_user', name);

    // create minimal opusUsers entry for consistency (no password)
    try {
      const usersRaw = localStorage.getItem('opusUsers');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      const username = name.replace(/\s+/g, '').toLowerCase().slice(0, 12) || name.toLowerCase();
      if (!users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        const userObj = { username, displayName: name, passwordHash: null, createdAt: new Date().toISOString() };
        users.push(userObj);
        localStorage.setItem('opusUsers', JSON.stringify(users));
      }
      localStorage.setItem('opusCurrentUser', JSON.stringify({ username, displayName: name }));
    } catch (err) {
      console.error('Error creating opus user from legacy form', err);
    }

    window.location.href = 'index.html';
  });
}

/* ----------------- init ----------------- */
function init(){
  initSignupDisplay();
  const savedVol = parseFloat(localStorage.getItem('myplayer_volume'));
  if(!isNaN(savedVol)) { audio.volume = savedVol; volumeEl.value = savedVol; }
  else audio.volume = parseFloat(volumeEl.value);

  // Optionally pre-run a search on load (you did 'coldplay')
  searchInput.value = 'coldplay';
  doSearch();
}
document.addEventListener('DOMContentLoaded', init);
