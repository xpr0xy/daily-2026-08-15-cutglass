import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const app=await browser.newPage({viewport:{width:1600,height:900},acceptDownloads:true});const errors=[];app.on('console',m=>{if(m.type()==='error')errors.push(m.text())});app.on('pageerror',e=>errors.push(e.message));
await app.goto(`https://xpr0xy.github.io/daily-2026-08-15-cutglass/?v=${Date.now()}`,{waitUntil:'networkidle'});
const live=await app.evaluate(()=>({marker:document.querySelector('[data-product="CUTGLASS"]')?.id,assets:[...document.querySelectorAll('script[src],link[href]')].map(e=>e.src||e.href),qa:!!window.__CUTGLASS_QA__}));
if(live.marker!=='cutglass-app'||!live.qa||live.assets.some(x=>x.includes('github.io/assets/')))throw new Error(`live marker/assets failed ${JSON.stringify(live)}`);
await app.getByRole('button',{name:'GARAGE SKIP'}).click();await app.getByRole('button',{name:'PLAY'}).click();await app.waitForTimeout(400);if(!await app.evaluate(()=>window.__CUTGLASS_QA__.isPlaying()))throw new Error('live audio transport failed');await app.getByRole('button',{name:'STOP'}).click();
const promise=app.waitForEvent('download');await app.getByRole('button',{name:'EXPORT WAV'}).click();const dl=await promise;await mkdir('qa',{recursive:true});await dl.saveAs('qa/cutglass-live.wav');
let blogResult=null;for(let attempt=1;attempt<=3;attempt++){
 const blog=await browser.newPage({viewport:{width:1280,height:800}});await blog.goto(`https://pr0xy.dev/posts/2026-08-15-cutglass/?analytics=off&v=${Date.now()}`,{waitUntil:'networkidle'}).catch(()=>{});
 blogResult=await blog.evaluate(()=>{const text=document.body.innerText;const img=[...document.images].find(i=>i.src.includes('/images/cutglass.png'));return {title:document.title,marker:text.includes('CUTGLASS: Paint the Gaps Into a Bassline'),appLink:[...document.links].some(a=>a.href.includes('daily-2026-08-15-cutglass')),image:img?{src:img.src,w:img.naturalWidth,h:img.naturalHeight}:null}}).catch(()=>null);await blog.close();
 if(blogResult?.marker&&blogResult?.appLink&&blogResult?.image?.w===1600&&blogResult?.image?.h===900)break;
 if(attempt<3)await new Promise(r=>setTimeout(r,30000));
}
if(!blogResult?.marker||!blogResult?.appLink||blogResult?.image?.w!==1600||blogResult?.image?.h!==900)throw new Error(`blog live failed ${JSON.stringify(blogResult)}`);
if(errors.length)throw new Error(`live console errors ${errors.join(' | ')}`);console.log(JSON.stringify({app:live,export:'qa/cutglass-live.wav',blog:blogResult,consoleErrors:0},null,2));await browser.close();
