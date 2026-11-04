const dialog = document.querySelector('#episode-dialog');
const opener = document.querySelector('#episode-open');
opener.addEventListener('click', () => dialog.showModal());
dialog.querySelectorAll('.close, .back').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => opener.focus({preventScroll:true}));

// Show once per tab session. The story remains available immediately via Skip,
// navigation, Escape or scrolling. Reduced-motion visitors go straight to it.
const opening = document.querySelector('#opening');
const heroCopy = document.querySelector('.hero-copy');
const replay = document.querySelector('.opening-replay');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let openingTimer;
let playing = false;
function rememberOpening() { try { sessionStorage.setItem('warm-laundry-opening-seen', 'yes'); } catch (_) {} }
function finishOpening() {
  if (!playing) return;
  const skipHadFocus = document.activeElement === opening.querySelector('button');
  playing = false;
  clearTimeout(openingTimer);
  opening.hidden = true;
  document.body.classList.remove('is-opening');
  heroCopy.inert = false;
  rememberOpening();
  if (skipHadFocus) document.querySelector('.enter').focus({preventScroll:true});
}
function startOpening() {
  if (reducedMotion.matches) return;
  clearTimeout(openingTimer);
  playing = true;
  opening.hidden = false;
  heroCopy.inert = true;
  document.body.classList.add('is-opening');
  openingTimer = setTimeout(finishOpening, 10000);
}
opening.querySelector('.opening-skip').addEventListener('click', finishOpening);
replay.addEventListener('click', () => {
  window.scrollTo({top:0,behavior:'instant'});
  startOpening();
  opening.querySelector('button').focus({preventScroll:true});
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && playing) finishOpening(); });
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', finishOpening));
window.addEventListener('wheel', finishOpening, {passive:true});
window.addEventListener('touchmove', finishOpening, {passive:true});
reducedMotion.addEventListener('change', e => { if (e.matches) finishOpening(); });
let seenOpening = false;
try { seenOpening = sessionStorage.getItem('warm-laundry-opening-seen') === 'yes'; } catch (_) {}
if (!seenOpening && !window.location.hash && !reducedMotion.matches) startOpening();

// User-supplied soundtrack. Never autoplay or restore a previous playing state.
const music = document.querySelector('#background-music');
const musicToggle = document.querySelector('.sound-toggle');
const musicLabel = document.querySelector('.sound-label');
const soundStatus = document.querySelector('.sound-status');
let musicRequest = 0;
music.volume = 0.25;
music.muted = true;
function updateMusicUI(isPlaying) {
  musicToggle.setAttribute('aria-pressed', String(isPlaying));
  musicLabel.textContent = isPlaying ? '음악 끄기' : '음악 켜기';
}
function stopMusic() {
  musicRequest++;
  music.pause();
  music.muted = true;
  updateMusicUI(false);
}
musicToggle.addEventListener('click', async () => {
  soundStatus.textContent = '';
  if (!music.paused || musicToggle.getAttribute('aria-pressed') === 'true') {
    stopMusic();
    return;
  }
  const request = ++musicRequest;
  music.muted = false;
  music.volume = 0.25;
  try {
    await music.play();
    if (request !== musicRequest) return;
    updateMusicUI(true);
  } catch (_) {
    if (request !== musicRequest) return;
    stopMusic();
    soundStatus.textContent = '음악을 재생하지 못했어요. 다시 눌러 주세요.';
  }
});
music.addEventListener('error', () => {
  stopMusic();
  soundStatus.textContent = '음악을 불러오지 못했어요. 연결을 확인하고 다시 눌러 주세요.';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !music.paused) stopMusic();
});
window.addEventListener('pagehide', stopMusic);

// Chapter routes preserve browser Back, keyboard focus, and music playback.
const readers = [...document.querySelectorAll('.chapter-reader')];
function syncReader() {
  const hash = window.location.hash;
  const id = hash === '#father-suit' ? 'story-reader' : hash === '#father-suit-2' ? 'story-reader-2' : null;
  const wasReading = document.body.classList.contains('reading');
  readers.forEach(r => r.hidden = r.id !== id);
  if (id) {
    finishOpening();
    if (dialog.open) dialog.close();
    document.body.classList.add('reading');
    document.title = '아버지의 양복' + (id === 'story-reader-2' ? ' 2장' : '') + ' · 아직 따뜻한 세탁소';
    window.scrollTo({top:0,behavior:'instant'});
    document.querySelector('#' + id + ' h1').focus({preventScroll:true});
  } else if (wasReading) {
    document.body.classList.remove('reading');
    document.title = '아직 따뜻한 세탁소 · The Laundry That Stays Warm';
    const target = document.querySelector(hash === '#about' ? '#about' : '#stories');
    target.scrollIntoView({behavior:'instant'});
    if (target.id === 'stories') opener.focus({preventScroll:true});
  }
}
window.addEventListener('hashchange', syncReader);
document.querySelectorAll('.reader-end a[href^="#father-suit"]').forEach(a => a.addEventListener('click', () => {
  if (a.getAttribute('href') === window.location.hash) syncReader();
}));
syncReader();
