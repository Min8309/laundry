(() => {
  const carousel = document.querySelector('.story-carousel');
  const track = document.querySelector('#story-track');
  if (!carousel || !track) return;
  const previous = carousel.querySelector('.carousel-previous');
  const next = carousel.querySelector('.carousel-next');
  const status = carousel.querySelector('.carousel-status');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let settleTimer;
  let frame;
  const slides = () => [...track.querySelectorAll('.story-slide')];
  const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const behavior = () => motion.matches ? 'instant' : 'smooth';
  function positions() {
    const items = slides();
    const first = items[0]?.offsetLeft || 0;
    const max = maxScroll();
    return [...new Set(items.map(slide => Math.round(Math.min(max, slide.offsetLeft - first))))];
  }
  function sync(announce = true) {
    const items = slides();
    const english = document.documentElement.lang === 'en';
    carousel.setAttribute('aria-label', english ? 'Story collection' : '이야기 모음');
    track.setAttribute('aria-label', english ? 'Story slides. Use Left and Right arrow keys to browse.' : '이야기 슬라이드. 좌우 방향키로 넘길 수 있습니다.');
    previous.setAttribute('aria-label', english ? 'Previous stories' : '이전 이야기');
    next.setAttribute('aria-label', english ? 'Next stories' : '다음 이야기');
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maxScroll() - 2;
    items.forEach((slide, index) => slide.setAttribute('aria-label', `${index + 1} / ${items.length}`));
    if (!announce) return;
    const view = track.getBoundingClientRect();
    const visible = items.map((slide, index) => {
      const box = slide.getBoundingClientRect();
      const overlap = Math.min(box.right, view.right) - Math.max(box.left, view.left);
      return overlap >= box.width * .6 ? index + 1 : null;
    }).filter(Boolean);
    const first = visible[0] || 1;
    const last = visible.at(-1) || first;
    const range = first === last ? `${first}` : `${first}–${last}`;
    const value = `${range} / ${items.length}`;
    if (status.textContent !== value) status.textContent = value;
  }
  function move(direction) {
    const stops = positions();
    const current = track.scrollLeft;
    const destination = direction > 0
      ? stops.find(value => value > current + 3) ?? maxScroll()
      : stops.filter(value => value < current - 3).at(-1) ?? 0;
    track.scrollTo({left: destination, behavior: behavior()});
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => sync(false));
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => sync(), 150);
  }, {passive: true});
  track.addEventListener('scrollend', () => sync());
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const items = slides();
    const focused = event.target.closest('.story-slide');
    const index = items.indexOf(focused);
    if (index >= 0) {
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : Math.max(0, Math.min(items.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)));
      items[target]?.querySelector('.garment-card')?.focus({preventScroll: true});
      items[target]?.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: behavior()});
    } else if (event.key === 'Home' || event.key === 'End') {
      track.scrollTo({left: event.key === 'Home' ? 0 : maxScroll(), behavior: behavior()});
    } else move(event.key === 'ArrowRight' ? 1 : -1);
  });
  new ResizeObserver(() => sync()).observe(track);
  new MutationObserver(() => sync()).observe(track, {childList: true});
  new MutationObserver(() => sync()).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  motion.addEventListener('change', () => { if (motion.matches) track.scrollTo({left: track.scrollLeft, behavior: 'instant'}); sync(); });
  sync();
})();
