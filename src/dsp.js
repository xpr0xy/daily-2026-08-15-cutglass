export const SAMPLE_RATE = 48000;
export const DEFAULT_PATTERN = [2,0,1,2,0,3,1,0,2,1,0,3,2,0,1,0];
export const PRESETS = {
  rupture: [2,0,0,1,2,0,3,0,2,0,1,0,3,0,0,1],
  skip:    [2,0,1,2,0,2,0,3,1,0,2,1,0,3,1,0],
  teeth:   [2,1,3,1,2,3,1,0,2,1,3,2,1,3,1,0]
};
export const DEFAULT_MATERIAL = { pattern: DEFAULT_PATTERN, edge:'knife', tone:0, fracture:0.32, echo:0.18 };

export function fixture(seconds=4, rate=SAMPLE_RATE) {
  const n=Math.floor(seconds*rate), mono=new Float32Array(n);
  let lp=0;
  for(let i=0;i<n;i++){
    const t=i/rate;
    const raw=Math.sin(2*Math.PI*55*t)+0.46*Math.sin(2*Math.PI*55.37*t)+0.22*Math.sin(2*Math.PI*110*t+0.4)+0.11*Math.sin(2*Math.PI*165*t);
    lp += 0.12*(raw-lp);
    const fade=Math.min(1,i/500,(n-i-1)/500);
    mono[i]=Math.tanh(lp*1.2)*0.56*Math.max(0,fade);
  }
  return mono;
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const envelope=(phase, state, edge) => {
  if(state===0) return 0;
  const level=state===1?0.33:1;
  const attack=edge==='knife'?0.015:edge==='pulse'?0.08:0.23;
  const release=edge==='knife'?0.055:edge==='pulse'?0.18:0.42;
  let local=phase;
  if(state===3) local=(phase*3)%1;
  const a=clamp(local/attack,0,1), r=clamp((1-local)/release,0,1);
  return level*Math.min(a,r);
};

export function renderMaterial(source, material=DEFAULT_MATERIAL, bpm=140, rate=SAMPLE_RATE) {
  const frames=Math.round(rate*(240/bpm)), left=new Float32Array(frames), right=new Float32Array(frames);
  let low=0, prev=0;
  const cut=material.tone<0 ? 0.035+0.16*(material.tone+1) : 0.22;
  for(let i=0;i<frames;i++){
    const x=source[i%source.length]||0;
    low += cut*(x-low);
    const high=x-prev; prev=x;
    let spectral=material.tone<0 ? low : x+high*material.tone*1.8;
    const bar=i/frames*16, step=Math.min(15,Math.floor(bar)), phase=bar-step;
    const env=envelope(phase,material.pattern[step],material.edge);
    const driven=Math.tanh(spectral*env*(1+material.fracture*8))/(1+material.fracture*0.5);
    left[i]=driven;
    right[i]=Math.tanh((spectral*env + Math.sin(i*0.00071)*driven*material.fracture*0.08)*(1+material.fracture*7))/(1+material.fracture*0.5);
  }
  const delay=Math.max(1,Math.round(frames/8));
  for(let i=delay;i<frames;i++){
    left[i]=clamp(left[i]+right[i-delay]*material.echo*0.46,-1,1);
    right[i]=clamp(right[i]+left[i-delay]*material.echo*0.46,-1,1);
  }
  return {left,right,rate};
}

export function encodeWav(rendered) {
  const {left,right,rate}=rendered, frames=left.length;
  const out=new ArrayBuffer(44+frames*4), v=new DataView(out);
  const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  str(0,'RIFF'); v.setUint32(4,36+frames*4,true); str(8,'WAVE'); str(12,'fmt ');
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,2,true); v.setUint32(24,rate,true);
  v.setUint32(28,rate*4,true); v.setUint16(32,4,true); v.setUint16(34,16,true); str(36,'data'); v.setUint32(40,frames*4,true);
  let o=44;
  for(let i=0;i<frames;i++) for(const x of [left[i],right[i]]) { const q=x<0?x*32768:x*32767; v.setInt16(o,Math.round(q),true); o+=2; }
  return new Uint8Array(out);
}

export function stateKey(material) {
  const s=JSON.stringify({pattern:material.pattern,edge:material.edge,tone:+material.tone,fracture:+material.fracture,echo:+material.echo});
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,'0').toUpperCase();
}
