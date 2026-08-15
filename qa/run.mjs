import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('qa',{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
const hash=async page=>page.evaluate(()=>{const b=window.__CUTGLASS_QA__.wavBytes();let h=2166136261;for(let i=0;i<b.length;i++){h^=b[i];h=Math.imul(h,16777619)}return [h>>>0,b.length,window.__CUTGLASS_QA__.stateKey()]});
const page=await browser.newPage({viewport:{width:1600,height:900},acceptDownloads:true});
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4176',{waitUntil:'networkidle'});
if(await page.title()!=='CUTGLASS — rhythmic spectral gate')throw new Error('wrong project served');
await page.screenshot({path:'qa/cutglass-desktop-1600x900.png'});
const base=await hash(page), probes=[];
for(const [name,action] of [
 ['pattern',async()=>page.locator('.step').nth(0).click()],
 ['edge',async()=>page.getByRole('button',{name:'BLOOM'}).click()],
 ['tone',async()=>page.locator('#tone').fill('-0.8')],
 ['fracture',async()=>page.locator('#fracture').fill('0.9')],
 ['echo',async()=>page.locator('#echo').fill('0.6')]
]){await page.getByRole('button',{name:'RESET'}).click();const before=await hash(page);await action();const after=await hash(page);if(before[0]===after[0])throw new Error(`${name} did not change WAV bytes`);probes.push([name,before[0],after[0]])}
await page.getByRole('button',{name:'RESET'}).click();const repeatA=await hash(page);await page.getByRole('button',{name:'RESET'}).click();const repeatB=await hash(page);if(repeatA[0]!==repeatB[0])throw new Error('identical state not deterministic');
await page.locator('#bpm').fill('173');await page.locator('#bpm').press('Enter');await page.getByRole('button',{name:'GARAGE SKIP'}).click();if(await page.locator('#bpm').inputValue()!=='173')throw new Error('preset overwrote global tempo');
const jobs=[];for(const name of ['HALFSTEP RUPTURE','GARAGE SKIP','ROLLER TEETH']){await page.getByRole('button',{name}).click();jobs.push((await hash(page))[0])}if(new Set(jobs).size!==3)throw new Error('named jobs not structurally distinct');
await page.getByRole('button',{name:'PLAY'}).click();await page.waitForTimeout(1700);if(!await page.evaluate(()=>window.__CUTGLASS_QA__.isPlaying()))throw new Error('playback did not persist beyond one loop');
await page.locator('.step').nth(3).click();if(!((await page.locator('#queue-status').textContent()).includes('QUEUED')))throw new Error('live edit was not queued');await page.waitForTimeout(1600);if((await page.locator('#queue-status').textContent())!=='LIVE')throw new Error('queued edit did not enter at loop boundary');
await page.locator('#bypass').dispatchEvent('pointerdown');if(!await page.evaluate(()=>window.__CUTGLASS_QA__.isBypassed()))throw new Error('A/B hold failed');await page.locator('#bypass').dispatchEvent('pointerup');
await page.getByRole('button',{name:'STOP'}).click();if(await page.evaluate(()=>window.__CUTGLASS_QA__.isPlaying()))throw new Error('stop failed');
const dl=page.waitForEvent('download');await page.getByRole('button',{name:'EXPORT WAV'}).click();const download=await dl;await download.saveAs('qa/cutglass-test.wav');
const mobile=await browser.newPage({viewport:{width:375,height:812}});const mobileErrors=[];mobile.on('console',m=>{if(m.type()==='error')mobileErrors.push(m.text())});mobile.on('pageerror',e=>mobileErrors.push(e.message));await mobile.goto('http://127.0.0.1:4176',{waitUntil:'networkidle'});
const geometry=await mobile.evaluate(()=>({innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,materialControls:[...document.querySelectorAll('#edge button,#tone,#fracture,#echo,.step')].filter(e=>getComputedStyle(e).display!=='none').length,stepScroll:{client:document.querySelector('.steps').clientWidth,total:document.querySelector('.steps').scrollWidth}}));
if(geometry.scrollWidth>geometry.innerWidth+1)throw new Error(`mobile page overflow ${JSON.stringify(geometry)}`);if(geometry.materialControls!==22)throw new Error(`missing mobile material controls ${geometry.materialControls}`);
await mobile.locator('.steps').evaluate(e=>e.scrollLeft=e.scrollWidth);const far=await mobile.locator('.step').nth(15).boundingBox();if(!far||far.x+far.width>376||far.x<0)throw new Error(`final step unreachable ${JSON.stringify(far)}`);await mobile.screenshot({path:'qa/cutglass-mobile-375x812.png',fullPage:false});
if(errors.length||mobileErrors.length)throw new Error(`console errors: ${[...errors,...mobileErrors].join(' | ')}`);
console.log(JSON.stringify({marker:'CUTGLASS',base,probes,jobs,geometry,export:'qa/cutglass-test.wav',screenshots:['qa/cutglass-desktop-1600x900.png','qa/cutglass-mobile-375x812.png'],consoleErrors:0},null,2));
await browser.close();
