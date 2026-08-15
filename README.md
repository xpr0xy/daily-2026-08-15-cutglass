# CUTGLASS

A deterministic rhythmic spectral gate for bass producers. Load a sustained bass, pad, or drone, paint a sixteen-step sequence with cut, ghost, open, and ratchet shards, shape the envelope, spectral bias, fracture, and afterimage, then export the exact one-bar result as stereo 48 kHz PCM WAV.

## control contract

- **material:** 16 direct-painted gate states, envelope character, spectral bias, fracture, afterimage, source audio
- **performance:** play, stop, momentary source A/B
- **transport/UI:** session-global BPM, mobile pattern scroller
- **state:** three musical job recipes and material reset; recipes preserve BPM and source

The authored boundary is a click-safe, hard-edged spectral gate with restrained cross-channel afterimage. The user owns rhythmic negative space, articulation, brightness, damage, and tail. The reachable jobs are halftime rupture, garage skip, and drum-and-bass roller teeth.

Audition and WAV export use the same deterministic PCM renderer. Live edits queue at the next bar boundary without stopping transport.

```bash
npm install
npm test
npm run build
python3 -m http.server 4176 --directory docs
node qa/run.mjs
npm run validate:wav -- qa/cutglass-test.wav
```
