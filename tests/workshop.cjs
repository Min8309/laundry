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
 const out='/workspace/laundry-workshop-qa';fs.mkdirSync(out,{recursive:true});
 try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce',acceptDownloads:true});
  const errors=[];const writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url())});
  await page.route('https://**/*',r=>r.abort());
  const url=`http://127.0.0.1:${server.address().port}`;
  await page.goto(url+'/');await page.locator('nav a[href="workshop.html"]').click();
  assert.equal(await page.locator('#manuscript').inputValue(),'');
  assert.equal(await page.locator('input[value="private"]').isChecked(),true);
  await page.screenshot({path:`${out}/workshop-${width}.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('#garment').fill('오래된 셔츠');await page.locator('#keywords').fill('첫 출근, 소매');await page.locator('#seed').fill('작은 단추에서 시작되는 이야기');
  await page.locator('#draft-title').fill('<img src=x onerror=alert(1)>');
  await page.locator('#manuscript').fill('가'.repeat(3000));assert.match(await page.locator('#word-count').textContent(),/3,000자.*권장 분량 안/);
  await page.locator('#manuscript').fill('가'.repeat(5001));assert.match(await page.locator('#word-count').textContent(),/5,001자.*길어요/);
  await page.locator('#manuscript').fill('<script>alert(1)</script>\n옷 이야기 😊');
  await page.locator('#preview-toggle').click();assert.equal(await page.locator('#draft-preview script,#draft-preview img').count(),0);
  assert.match(await page.locator('#preview-body').textContent(),/<script>/);
  await page.locator('input[value="public"]').check();assert(await page.locator('#public-options').isVisible());
  assert(await page.getByRole('button',{name:'익명으로 투고하기 · 준비 중',exact:true}).isDisabled());
  await page.locator('#save-draft').click();await page.reload();
  assert.equal(await page.locator('#garment').inputValue(),'오래된 셔츠');assert.equal(await page.locator('input[value="public"]').isChecked(),true);
  const downloaded=page.waitForEvent('download');await page.locator('#download-draft').click();const download=await downloaded;const saved=await download.path();assert.match(fs.readFileSync(saved,'utf8'),/옷 이야기 😊/);assert.equal(download.suggestedFilename(),'세탁소-내-원고.txt');
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('quota')}});await page.locator('#save-draft').click();assert.match(await page.locator('#save-status').textContent(),/저장하지 못했습니다/);
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/workshop-${width}.aria.txt`,await page.locator('body').ariaSnapshot());
  await page.close();console.log(`PASS ${width}px: entry, layout, counts, safe preview, local restore, public intent only, disabled services, export, storage failure, no network writes.`);
 }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
