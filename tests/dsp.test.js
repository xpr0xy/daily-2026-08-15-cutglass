import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, renderMaterial, encodeWav, DEFAULT_MATERIAL, PRESETS, stateKey } from '../src/dsp.js';
import { createHash } from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=fixture();
test('fixture and renderer produce a real one-bar stereo WAV',()=>{
  const audio=renderMaterial(source,DEFAULT_MATERIAL,140), wav=encodeWav(audio);
  assert.equal(wav.slice(0,4).toString(),'82,73,70,70');
  assert.ok(wav.length>300000);
  assert.ok(Math.max(...audio.left.slice(0,30000))>0.1);
});
test('identical material is byte identical',()=>{
  const a=encodeWav(renderMaterial(source,DEFAULT_MATERIAL,140));
  const b=encodeWav(renderMaterial(source,DEFAULT_MATERIAL,140));
  assert.equal(hash(a),hash(b));
});
test('every material family changes audible sample bytes',()=>{
  const base=hash(encodeWav(renderMaterial(source,DEFAULT_MATERIAL,140)));
  const variants=[
    {...DEFAULT_MATERIAL,pattern:PRESETS.teeth},
    {...DEFAULT_MATERIAL,edge:'bloom'},
    {...DEFAULT_MATERIAL,tone:-0.8},
    {...DEFAULT_MATERIAL,fracture:0.9},
    {...DEFAULT_MATERIAL,echo:0.6}
  ];
  for(const v of variants) assert.notEqual(hash(encodeWav(renderMaterial(source,v,140))),base);
});
test('named jobs are structurally distinct and state key excludes tempo',()=>{
  const hashes=Object.values(PRESETS).map(pattern=>hash(encodeWav(renderMaterial(source,{...DEFAULT_MATERIAL,pattern},140))));
  assert.equal(new Set(hashes).size,3);
  assert.equal(stateKey(DEFAULT_MATERIAL),stateKey({...DEFAULT_MATERIAL,bpm:99}));
});
