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
const playerCover = $('#player-cover');
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

function initSignupDisplay(){
  const saved = localStorage.getItem('myplayer_user');
  const signupLink = document.getElementById('signup-link');
  const welcomeArea = document.getElementById('welcome-area');
  const welcomeMsg = document.getElementById('welcome-msg');
  const signoutBtn = document.getElementById('signout-btn');

  if (saved) {

    if (signupLink) signupLink.style.display = 'none';
    if (welcomeArea) welcomeArea.style.display = 'flex';
    if (welcomeMsg) welcomeMsg.textContent = 'Welcome, ' + saved + '';
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
      delete window[cb];
      script.remove();
    };
    const script = document.createElement('script');
    script.src = url + (url.includes('?') ? '&' : '?') + 'output=jsonp&callback=' + cb;
    script.onerror = () => {
      delete window[cb];
      script.remove();
      reject(new Error('Network error loading JSONP'));
    };
    document.body.appendChild(script);
  });
}

async function searchDeezer(query){
  const q = encodeURIComponent(query);
  const url = 'https://api.deezer.com/search?q=' + q;
  feedback.textContent = 'Searching...';
  try {
    const data = await jsonp(url);
    feedback.textContent = '';
    return data && data.data ? data.data : [];
  } catch(err){
    feedback.textContent = '';
    throw err;
  }
}

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
      <img class="cover" src="${t.album?.cover_medium || t.album?.cover_small}" alt="${escapeHtml(t.title)}" />
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

function loadTrack(index){
  const t = state.tracks[index];
  if(!t) return;
  state.currentIndex = index;
  audio.src = t.preview;
  audio.load();

  playerCover.src = t.album?.cover_big || t.album?.cover_medium || t.album?.cover_small || 'https://via.placeholder.com/600x400?text=No+Image';
  playerTitle.textContent = t.title;
  playerArtist.textContent = t.artist?.name || '';
  playerAlbum.textContent = t.album?.title || '';
  timeCurrent.textContent = '0:00';
  timeTotal.textContent = '0:30';
  progress.value = 0;
  errorMsg.textContent = '';
}

function playAudio(){
  if(!audio.src){ alert('Pick a track first'); return; }
  audio.play().then(()=> playBtn.textContent = 'Pause').catch((e) => {
    console.warn('play failed', e);
    errorMsg.textContent = 'Playback blocked. Tap Play to allow audio.';
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
  try {
    feedback.textContent = 'Searching...';
    const tracks = await searchDeezer(q);
    state.tracks = tracks;
    renderResults(tracks);
    if(tracks.length) loadTrack(0);
    feedback.textContent = tracks.length ? `Found ${tracks.length} tracks` : '';
  } catch(err){
    console.error(err);
    feedback.textContent = '';
    errorMsg.textContent = 'Search failed. Try again later.';
  }
}

// helpers
function formatTime(s){
  if(!s || isNaN(s)) return '0:00';
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return mm + ':' + ss;
}

// init
function init(){
  initSignupDisplay();
  const savedVol = parseFloat(localStorage.getItem('myplayer_volume'));
  if(!isNaN(savedVol)) { audio.volume = savedVol; volumeEl.value = savedVol; }
  else audio.volume = parseFloat(volumeEl.value);


  searchInput.value = 'coldplay';
  doSearch();
}
document.addEventListener('DOMContentLoaded', init);
