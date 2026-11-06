// Run: node tests/reading-browser.cjs (installed Playwright and Chromium).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'../dist');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.join(root,pathname==='/'?'index.html':pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const out='/workspace/laundry-qa';fs.mkdirSync(out,{recursive:true});
 try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for(const lang of ['ko','en']){
   await page.selectOption('#language-select',lang);
   await page.waitForFunction(l=>document.querySelector('#stories-title').textContent===(l==='ko'?'한 벌의 소설':'A Garment, A Story'),lang);
   assert.equal(await page.locator('.site-subtitle').textContent(),lang==='ko'?'옷에 담긴 이야기를 읽는 곳':'A place to read the stories held in clothes');
   await page.screenshot({path:`${out}/home-${width}-${lang}.png`,fullPage:true});
   assert.equal(await page.locator('#opening').count(),0);
   assert.equal(await page.locator('.hero-copy').evaluate(el=>el.inert),false);
   assert(await page.locator('.enter').isVisible());
   const dock=await page.locator('.sound-dock').boundingBox();
   const button=await page.locator('.sound-toggle').boundingBox();
   assert(Math.abs(dock.y+dock.height-900)<2,'Music dock stays at viewport bottom');
   assert(button.x+button.width>width-40,'Music button remains bottom right');
   assert.equal(await page.locator('.sound-dock').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 28, 27)');
   await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
   const footer=await page.locator('footer').boundingBox();
   assert(footer.y+footer.height<=dock.y+1,'Footer can scroll completely clear of music bar');
   await page.evaluate(()=>window.scrollTo(0,0));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow');
   await page.locator('.enter').click();
   await page.locator('#episode-open').click();
   await page.waitForURL('**/#father-suit');
   await page.waitForFunction(()=>document.activeElement.id==='reader-title');
   await page.locator('#story-reader .read-shortcut').click();
   assert.equal(new URL(page.url()).hash,'#father-suit');
   await page.waitForFunction(id=>document.activeElement.id===id,'story-reader-text');
   await page.locator('#story-reader .reader-nav a').click();
   await page.waitForFunction(id=>document.activeElement.id===id,'episode-open');
   await page.keyboard.press('ArrowRight');
   await page.waitForFunction(id=>document.activeElement.id===id,'cardigan-open');
   await page.keyboard.press('Enter');await page.waitForURL('**/#grandmothers-cardigan');
   await page.locator('#cardigan-reader').waitFor({state:'visible'});
   await page.goBack();await page.waitForURL('**/#stories');
   await page.waitForFunction(id=>document.activeElement.id===id,'cardigan-open');
   await page.keyboard.press('End');await page.waitForFunction(id=>document.activeElement.id===id,'uniform-open');
   await page.keyboard.press('Enter');await page.waitForURL('**/#kindergarten-uniform');
   await page.screenshot({path:`${out}/reader-${width}-${lang}.png`,fullPage:true});
   fs.writeFileSync(`${out}/reader-${width}-${lang}.aria.txt`,await page.locator('body').ariaSnapshot());
   await page.goto(`http://127.0.0.1:${server.address().port}/#father-suit-2`);
   await page.locator('#story-reader-2').waitFor({state:'visible'});
   await page.goto(`http://127.0.0.1:${server.address().port}/#stories`);
   const track=page.locator('#story-track');
   if(width<700){
    assert(await track.evaluate(el=>el.scrollWidth>el.clientWidth));
    await track.scrollIntoViewIfNeeded();
    const box=await track.boundingBox();
    const client=await page.context().newCDPSession(page);
    const y=Math.max(190,Math.min(750,box.y+100));
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width-45,y}]});
    for(let x=width-65;x>=45;x-=20){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await page.waitForTimeout(16);}
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(400);
    assert(await track.evaluate(el=>el.scrollLeft>0),'Touch swipe moves the cards');
    await client.detach();
    await track.evaluate(el=>el.scrollTo({left:el.scrollWidth,behavior:'instant'}));
    await page.waitForTimeout(200);
    assert(await page.locator('.carousel-next').isDisabled());
    await page.locator('.carousel-previous').click();
    await page.waitForTimeout(200);
    assert(await page.locator('.carousel-next').isEnabled());
   }
   await page.screenshot({path:`${out}/cards-${width}-${lang}.png`,fullPage:true});
   await page.goto(`http://127.0.0.1:${server.address().port}/`);
  }
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}px: Korean/English, immediate entry, cards, reader focus, arrows, history, deep links, overflow.`);
 }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
