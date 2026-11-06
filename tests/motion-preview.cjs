const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'../dist');
const server=http.createServer((req,res)=>{
 const file=path.join(root,new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const out='/workspace/laundry-motion-qa';fs.mkdirSync(out,{recursive:true});
 const url=`http://127.0.0.1:${server.address().port}/motion-preview.html`;
 try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());
  await page.goto(url);await page.waitForFunction(()=>document.documentElement.classList.contains('motion-enabled'));
  assert.equal(await page.locator('.cloth-piece').count(),14);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert(await page.locator('.motion-categories a').first().isVisible());
  for(const [name,p] of [['start',0],['zoom',.55],['door',.86]]){
   await page.evaluate(p=>{document.documentElement.style.scrollBehavior='auto';const h=document.querySelector('.motion-hero');scrollTo(0,p*(h.offsetHeight-document.querySelector('.motion-stage').offsetHeight));},p);
   await page.waitForTimeout(100);
   await page.screenshot({path:`${out}/${width}-${name}.png`});
  }
  assert(parseFloat(await page.locator('.motion-stage').evaluate(e=>e.style.getPropertyValue('--door')))<-75);
  await page.locator('.motion-bottom a').click();await page.waitForURL('**#stories');
  await page.locator('#episode-open').click();await page.locator('#story-reader').waitFor({state:'visible'});
  assert(await page.locator('.motion-hero').isHidden());
  await page.goBack();await page.waitForURL('**#stories');
  for(const [hash,id] of [['grandmothers-cardigan','cardigan-reader'],['kindergarten-uniform','uniform-reader']]){
   await page.goto(url+'#'+hash);await page.locator('#'+id).waitFor({state:'visible'});
  }
  await page.goto(url);await page.selectOption('#language-select','en');
  await page.waitForFunction(()=>document.querySelector('.motion-categories strong').textContent==='A Garment, A Story');
  await page.locator('#motion-toggle').click();assert(await page.locator('html').evaluate(e=>e.classList.contains('motion-off')));
  assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();assert.equal(await page.locator('.motion-stage').evaluate(e=>getComputedStyle(e).position),'relative');
  assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
  await page.keyboard.press('Enter');await page.waitForURL('**#stories');
  const dock=await page.locator('.sound-dock').boundingBox();assert(Math.abs(dock.y+dock.height-900)<2);
  assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS ${width}: scroll, door, all story routes, back, English, reduced motion, skip, music dock`);
 }
 const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});await nojs.goto(url);
 assert.equal(await nojs.locator('.motion-stage').evaluate(e=>getComputedStyle(e).position),'relative');
 assert(await nojs.locator('.motion-categories a').first().isVisible());await nojs.close();console.log('PASS no-JS direct navigation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
