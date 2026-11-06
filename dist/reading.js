(() => {
  // Set only after the author confirms the exact public Naver blog URL.
  const AUTHOR_BLOG_URL = '';
  const blog = document.querySelector('#author-blog');
  if (AUTHOR_BLOG_URL) {
    try {
      const url = new URL(AUTHOR_BLOG_URL);
      if (url.protocol === 'https:' && ['blog.naver.com', 'm.blog.naver.com'].includes(url.hostname)) {
        blog.href = url.href;
        blog.hidden = false;
      }
    } catch (_) { /* Leave an invalid or missing destination hidden. */ }
  }
  document.querySelectorAll('.read-shortcut').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const body = document.querySelector(link.getAttribute('href'));
      body.focus({preventScroll:true});
      body.scrollIntoView({block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    });
  });
  // A failed audio request must not continue advertising available narration.
  const audio = document.querySelector('#chapter-narration');
  const badge = document.querySelector('.audio-available');
  audio.addEventListener('error', () => { badge.hidden = true; });
  audio.addEventListener('canplay', () => { badge.hidden = false; });
})();
