import './style.css';
import { fixture, renderMaterial, encodeWav, DEFAULT_MATERIAL, PRESETS, stateKey, SAMPLE_RATE } from './dsp.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let source=fixture(), sourceLabel='REESE FIXTURE';
let material={...DEFAULT_MATERIAL,pattern:[...DEFAULT_MATERIAL.pattern]};
let audioContext=null, wetNode=null, dryNode=null, wetGain=null, dryGain=null, startedAt=0, playing=false, replacementTimer=0;
let painting=false, paintState=0, lastRendered=null, bypassHeld=false;
const stepsEl=$('#steps'), notice=$('#notice'), queueStatus=$('#queue-status');

for(let i=0;i<16;i++){
  const b=document.createElement('button'); b.className='step'; b.dataset.index=String(i+1).padStart(2,'0'); b.dataset.step=i; b.setAttribute('aria-label',`Step ${i+1}`);
  stepsEl.append(b);
}
const stepEls=$$('.step');
function renderUI(){
  stepEls.forEach((b,i)=>{b.dataset.state=material.pattern[i];b.setAttribute('aria-label',`Step ${i+1}: ${['cut','ghost','open','ratchet'][material.pattern[i]]}`)});
  $$('#edge button').forEach(b=>b.classList.toggle('active',b.dataset.value===material.edge));
  $('#tone').value=material.tone; $('#fracture').value=material.fracture; $('#echo').value=material.echo;
  $('#tone-out').value=material.tone<-.2?'DARK':material.tone>.2?'BRIGHT':'CENTER';
  $('#fracture-out').value=`${Math.round(material.fracture*100)}%`; $('#echo-out').value=`${Math.round(material.echo*100)}%`;
  $('#checksum').textContent=`STATE ${stateKey(material)}`;
}
function currentBpm(){return Math.max(70,Math.min(190,+$('#bpm').value||140))}
function rendered(){lastRendered=renderMaterial(source,material,currentBpm());return lastRendered}
function audioBuffer(data){
  const b=audioContext.createBuffer(2,data.left.length,data.rate); b.copyToChannel(data.left,0); b.copyToChannel(data.right,1); return b;
}
function dryRender(){
  const frames=Math.round(SAMPLE_RATE*(240/currentBpm())), left=new Float32Array(frames),right=new Float32Array(frames);
  for(let i=0;i<frames;i++) left[i]=right[i]=source[i%source.length]||0;
  return {left,right,rate:SAMPLE_RATE};
}
function startPair(when, offset=0){
  const wet=audioContext.createBufferSource(),dry=audioContext.createBufferSource(); wet.buffer=audioBuffer(rendered()); dry.buffer=audioBuffer(dryRender());
  wet.loop=dry.loop=true; wet.connect(wetGain); dry.connect(dryGain); wet.start(when,offset);dry.start(when,offset); return {wet,dry};
}
async function play(){
  if(playing)return; audioContext ||= new AudioContext(); await audioContext.resume();
  wetGain ||= audioContext.createGain(); dryGain ||= audioContext.createGain(); wetGain.connect(audioContext.destination);dryGain.connect(audioContext.destination);
  wetGain.gain.value=1;dryGain.gain.value=0; const pair=startPair(audioContext.currentTime+.02); wetNode=pair.wet;dryNode=pair.dry;startedAt=audioContext.currentTime+.02;playing=true;
  $('#play').textContent='PLAYING'; notice.textContent='loop running. edits enter at the next bar line.'; animate();
}
function stop(){
  clearTimeout(replacementTimer);replacementTimer=0; for(const n of [wetNode,dryNode])try{n?.stop()}catch{} wetNode=dryNode=null;playing=false;
  $('#play').textContent='PLAY';queueStatus.textContent='LIVE';stepEls.forEach(x=>x.classList.remove('current'));$('#playhead').style.transform='translateX(0)';
}
function queueRender(){
  renderUI();drawScope();if(!playing)return;
  queueStatus.textContent='QUEUED ↗';clearTimeout(replacementTimer);
  const dur=240/currentBpm(), elapsed=Math.max(0,audioContext.currentTime-startedAt), remain=dur-(elapsed%dur);
  replacementTimer=setTimeout(()=>{
    if(!playing)return;const when=audioContext.currentTime+.025,pair=startPair(when);try{wetNode.stop(when);dryNode.stop(when)}catch{}
    wetNode=pair.wet;dryNode=pair.dry;startedAt=when;queueStatus.textContent='LIVE';notice.textContent='material entered cleanly on the bar line.';
  },Math.max(0,(remain-.03)*1000));
}
function setBypass(on){bypassHeld=on;$('#bypass').classList.toggle('held',on);if(!wetGain)return;const t=audioContext.currentTime;wetGain.gain.setTargetAtTime(on?0:1,t,.012);dryGain.gain.setTargetAtTime(on?1:0,t,.012)}
function animate(){
  if(!playing)return;const dur=240/currentBpm(), phase=((audioContext.currentTime-startedAt)%dur+dur)%dur/dur, step=Math.floor(phase*16);
  stepEls.forEach((x,i)=>x.classList.toggle('current',i===step));$('#playhead').style.transform=`translateX(${phase*1500}%)`;$('#meter-fill').style.width=`${20+70*Math.abs(Math.sin(phase*Math.PI*8))}%`;requestAnimationFrame(animate);
}
function mutateStep(i,state){if(material.pattern[i]===state)return;material.pattern=[...material.pattern];material.pattern[i]=state;queueRender()}
stepsEl.addEventListener('pointerdown',e=>{const b=e.target.closest('.step');if(!b)return;painting=true;paintState=(material.pattern[+b.dataset.step]+1)%4;stepsEl.setPointerCapture(e.pointerId);mutateStep(+b.dataset.step,paintState)});
stepsEl.addEventListener('pointermove',e=>{if(!painting)return;const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('.step');if(b&&stepsEl.contains(b))mutateStep(+b.dataset.step,paintState)});
stepsEl.addEventListener('pointerup',()=>painting=false);stepsEl.addEventListener('pointercancel',()=>painting=false);

$('#edge').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;material.edge=b.dataset.value;queueRender()});
for(const id of ['tone','fracture','echo']) $(`#${id}`).addEventListener('input',e=>{material[id]=+e.target.value;queueRender()});
$$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{material.pattern=[...PRESETS[b.dataset.preset]];queueRender();notice.textContent=`${b.textContent.toLowerCase()} loaded. tempo stayed at ${currentBpm()} bpm.`}));
$('#reset').addEventListener('click',()=>{material={...DEFAULT_MATERIAL,pattern:[...DEFAULT_MATERIAL.pattern]};queueRender();notice.textContent='material reset. source and tempo preserved.'});
$('#fixture').addEventListener('click',()=>{source=fixture();sourceLabel='REESE FIXTURE';$('#source-status').textContent='FIXTURE ARMED';queueRender()});
$('#audio-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{audioContext ||= new AudioContext();const decoded=await audioContext.decodeAudioData(await file.arrayBuffer());source=new Float32Array(decoded.length);const channels=decoded.numberOfChannels;for(let c=0;c<channels;c++){const ch=decoded.getChannelData(c);for(let i=0;i<ch.length;i++)source[i]+=ch[i]/channels}sourceLabel=file.name.toUpperCase();$('#source-status').textContent='LOCAL AUDIO ARMED';queueRender();notice.textContent=`${file.name} loaded locally. first bar wraps if needed.`}catch{notice.textContent='could not decode that audio file. try WAV, MP3, or M4A.'}});
$('#play').addEventListener('click',play);$('#stop').addEventListener('click',stop);$('#bpm').addEventListener('change',()=>{queueRender();notice.textContent=`tempo set to ${currentBpm()} bpm. presets will not overwrite it.`});
$('#bypass').addEventListener('pointerdown',()=>setBypass(true));for(const ev of ['pointerup','pointercancel','pointerleave'])$('#bypass').addEventListener(ev,()=>setBypass(false));
function downloadWav(){const bytes=encodeWav(rendered()),blob=new Blob([bytes],{type:'audio/wav'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`cutglass-${stateKey(material).toLowerCase()}.wav`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);notice.textContent=`exported ${Math.round(bytes.length/1024)} KB from the audible state.`;return bytes}
$('#export').addEventListener('click',downloadWav);window.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(e.code==='Space'){e.preventDefault();playing?stop():play()}if(e.key.toLowerCase()==='e')downloadWav()});
function drawScope(){const c=$('#scope'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle='#dcff39';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<w;x++){const i=Math.floor(x/w*source.length),y=h/2+(source[i]||0)*h*.35;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.strokeStyle='#4a4a37';ctx.beginPath();for(let r=30;r<110;r+=25){ctx.moveTo(w/2+r,h/2);ctx.arc(w/2,h/2,r,0,Math.PI*2)}ctx.stroke()}
window.__CUTGLASS_QA__={getMaterial:()=>structuredClone(material),setMaterial:m=>{material={...material,...m,pattern:m.pattern?[...m.pattern]:material.pattern};queueRender()},wavBytes:()=>encodeWav(rendered()),stateKey:()=>stateKey(material),isPlaying:()=>playing,isBypassed:()=>bypassHeld,sourceLabel:()=>sourceLabel};
renderUI();drawScope();
