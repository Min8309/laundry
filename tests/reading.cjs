// DOM integration checks, not a substitute for browser, media or screen-reader QA.
// Run with jsdom available: node tests/reading.cjs
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const before = execFileSync('git',['show','HEAD:dist/index.html'],{cwd:root,encoding:'utf8'});
const original = new JSDOM(before).window.document;
const vc = new VirtualConsole(); const errors=[]; vc.on('jsdomError',e=>errors.push(e.message));
const dom = new JSDOM(html,{url:'https://laundry.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document;
w.matchMedia=()=>({matches:true,addEventListener(){}});
w.ResizeObserver=class{observe(){}}; w.scrollTo=w.scrollBy=()=>{};
w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLElement.prototype.scrollTo=function(){};
w.HTMLMediaElement.prototype.pause=function(){};
for(const src of [...d.scripts].map(s=>s.getAttribute('src')))require('node:vm').runInContext(fs.readFileSync(path.join(root,'dist',src),'utf8'),dom.getInternalVMContext());
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
(async()=>{
 await tick();
 assert.equal(d.querySelector('#opening'),null);assert.equal(d.querySelector('.opening-replay'),null);
 assert.equal(d.querySelector('.hero-copy').inert,undefined);
 assert.equal(d.querySelector('#author-blog').hidden,true);assert.equal(d.querySelector('#author-blog').hasAttribute('href'),false);
 assert.equal(d.querySelectorAll('.audio-available').length,1);
 assert.equal(d.querySelectorAll('.laundry-memo').length,3);
 for(const old of original.querySelectorAll('.story-body')){
 const i=[...original.querySelectorAll('.story-body')].indexOf(old);
 assert.equal(d.querySelectorAll('.story-body')[i].innerHTML.replaceAll(' lang="ko"',''),old.innerHTML,'Original story unchanged');
 }
 for(const asset of original.querySelectorAll('img[src],audio[src],audio source[src]'))assert(d.querySelector(`[src="${asset.getAttribute('src')}"]`),'Existing media retained');
 for(const lang of ['en','ko']){
  const select=d.querySelector('#language-select');select.value=lang;select.dispatchEvent(new w.Event('change'));await tick();
  assert.equal(d.documentElement.lang,lang);
  assert.match(d.querySelector('.hero-purpose').textContent,lang==='en'?/original fiction/:/창작/);
  assert.match(d.querySelector('.reading-estimate').textContent,lang==='en'?/16 min/:/11분/);
  for(const [route,id] of [['father-suit','story-reader'],['father-suit-2','story-reader-2'],['grandmothers-cardigan','cardigan-reader'],['kindergarten-uniform','uniform-reader']]){
   w.location.hash=route;await tick();assert.equal(d.querySelectorAll('.chapter-reader:not([hidden])').length,1);assert.equal(d.querySelector('#'+id).hidden,false);assert.equal(d.activeElement,d.querySelector('#'+id+' h1'));
   d.querySelector('#'+id+' .read-shortcut').click();assert.equal(w.location.hash,'#'+route);assert.equal(d.activeElement,d.querySelector('#'+id+' .story-body'));
  }
 }
 w.location.hash='stories';await tick();assert.equal(d.activeElement.id,'uniform-open');
 d.querySelector('#episode-open').focus();d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(d.activeElement.id,'cardigan-open');
 assert.equal(d.querySelector('#uniform-narration-toggle').disabled,true);assert.equal(d.querySelector('#cardigan-narration-toggle').disabled,true);
 d.querySelector('#chapter-narration').dispatchEvent(new w.Event('error'));assert.equal(d.querySelector('.audio-available').hidden,true);
 assert.deepEqual(errors,[]);console.log('PASS: source preservation, Korean/English, four reader routes, focus, keyboard carousel, reading shortcuts, audio availability and hidden blog.');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
