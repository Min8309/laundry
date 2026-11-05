// Run: node tests/audio.cjs
// Requires Playwright and Chromium; no production dependencies.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
// Byte ranges let Chromium seek through the actual MP3s for end/loop tests.
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.join(__dirname, '../dist', pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  const body = fs.readFileSync(file);
  const type = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.mp3':'audio/mpeg', '.webp':'image/webp'}[path.extname(file)];
  const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  const start = range ? Number(range[1]) : 0;
  const end = range && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
  res.writeHead(range ? 206 : 200, {'Content-Type':type, 'Accept-Ranges':'bytes', 'Content-Length':end-start+1, ...(range ? {'Content-Range':`bytes ${start}-${end}/${body.length}`} : {})});
  res.end(body.subarray(start,end+1));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args:['--no-sandbox']});
  try {
    for (const mobile of [false, true]) {
      for (const fallback of [false, true]) {
        const page = await browser.newPage({viewport: mobile ? {width:390,height:844} : {width:1280,height:900}, isMobile:mobile, hasTouch:mobile, reducedMotion:'reduce'});
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        if (fallback) await page.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
        await page.route('https://**/*', route => route.abort());
        await page.goto(`http://127.0.0.1:${server.address().port}/#father-suit`);
        const state = () => page.evaluate(() => ({music:!music.paused, narration:!narration.paused, muted:music.muted, pressed:musicToggle.getAttribute('aria-pressed'), narrationPressed:narrationToggle.getAttribute('aria-pressed'), volume:musicGain ? musicGain.gain.value : music.volume}));
        const settle = async (volume) => { await page.waitForFunction(v => Math.abs((musicGain ? musicGain.gain.value : music.volume) - v) < .002, volume); };
        assert.equal((await state()).music, false);
        await page.locator('.sound-toggle').focus();
        await page.keyboard.press('Enter');
        await settle(.25);
        await page.locator('#narration-toggle').click();
        await settle(.07);
        assert.equal((await state()).music, true);
        assert.equal((await state()).narration, true);
        assert.equal((await state()).narrationPressed, 'true');
        await page.locator('#narration-toggle').click();
        await settle(.25);
        await page.locator('#narration-toggle').click();
        await settle(.07);
        await page.locator('.sound-toggle').click();
        assert.equal((await state()).narration, true);
        await page.locator('#narration-toggle').click();
        assert.equal((await state()).music, false);
        assert.equal((await state()).muted, true);
        await page.locator('#narration-toggle').click();
        await page.locator('.sound-toggle').click();
        await settle(.07);
        assert.equal((await state()).narration, true);
        // Real media completion and replay, rather than synthetic ended events.
        await page.evaluate(() => { narration.currentTime = narration.duration - .15; });
        await page.waitForFunction(() => narration.ended);
        await settle(.25);
        await page.locator('#narration-toggle').click();
        await settle(.07);
        // Music wraps without interrupting narration or losing attenuation.
        await page.evaluate(() => { music.currentTime = music.duration - .15; });
        await page.waitForFunction(() => music.currentTime < 2);
        assert.equal((await state()).narration, true);
        await settle(.07);
        await page.evaluate(() => { location.hash = '#father-suit-2'; });
        await page.waitForFunction(() => narration.paused);
        await settle(.25);
        assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#story-reader-2 h1')), true);
        assert.equal((await state()).music, true);
        await page.goBack();
        assert.equal((await state()).narration, false);
        await page.locator('#narration-toggle').click();
        await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        assert.equal((await state()).music, false);
        assert.equal((await state()).narration, false);
        assert.equal((await state()).pressed, 'false');
        await page.locator('.sound-toggle').click();
        await settle(.25);
        assert.equal(await page.locator('.sound-status').getAttribute('aria-live'), 'polite');
        assert.equal(await page.locator('.narration-status').getAttribute('role'), 'status');
        await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', {configurable:true, value:true});
          document.dispatchEvent(new Event('visibilitychange'));
          Object.defineProperty(document, 'hidden', {configurable:true, value:false});
          document.dispatchEvent(new Event('visibilitychange'));
        });
        assert.equal((await state()).music, false);
        // Rejected play requests must not leave music enabled or change narration.
        await page.evaluate(() => { music.play = () => Promise.reject(new Error('blocked')); });
        await page.locator('.sound-toggle').click();
        await page.waitForFunction(() => soundStatus.textContent.length > 0);
        assert.equal((await state()).pressed, 'false');
        await page.evaluate(() => { delete music.play; });
        await page.locator('.sound-toggle').click();
        await settle(.25);
        await page.evaluate(() => { narration.play = () => Promise.reject(new Error('blocked')); });
        await page.locator('#narration-toggle').click();
        await page.waitForFunction(() => narrationStatus.textContent.length > 0);
        assert.equal((await state()).music, true);
        await settle(.25);
        // A second click cancels a still-pending music request; resolution cannot re-enable it.
        await page.locator('.sound-toggle').click();
        await page.evaluate(() => { music.play = () => new Promise(resolve => { window.finishMusicRequest = resolve; }); });
        await page.locator('.sound-toggle').click();
        await page.locator('.sound-toggle').click();
        await page.evaluate(() => window.finishMusicRequest());
        assert.equal((await state()).pressed, 'false');
        assert.equal((await state()).muted, true);
        assert.deepEqual(errors, []);
        console.log(`PASS ${mobile ? 'mobile' : 'desktop'} / ${fallback ? 'media fallback' : 'Web Audio'}: overlap, fade, pause, off, reverse start, end/replay, loop, chapter/back/focus, pagehide/visibility, keyboard, ARIA, rejected/pending requests`);
        await page.close();
      }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
