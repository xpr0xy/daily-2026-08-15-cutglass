import { readFileSync } from 'node:fs';
const file = process.argv[2];
if (!file) throw new Error('usage: npm run validate:wav -- path/to/file.wav');
const b = readFileSync(file);
const u16 = o => b.readUInt16LE(o), u32 = o => b.readUInt32LE(o);
const ok = b.length > 1000 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WAVE' && b.toString('ascii',12,16)==='fmt ' && u16(20)===1 && u16(22)===2 && u32(24)===48000 && u16(34)===16 && b.toString('ascii',36,40)==='data' && u32(40)===b.length-44;
if (!ok) { console.error('invalid CUTGLASS WAV', {bytes:b.length,channels:u16(22),rate:u32(24),bits:u16(34)}); process.exit(1); }
console.log(`valid CUTGLASS WAV: ${b.length} bytes, stereo, 48000 Hz, 16-bit PCM, ${(u32(40)/192000).toFixed(3)}s`);
