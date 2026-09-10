#!/usr/bin/env node
/**
 * probe-account-ur.js — Resolve the account-UR encoding structure definitively.
 *
 * 1. List top-level exports of @metamask/hw-emulator.
 * 2. Render the account QR PNG via renderToPng.
 * 3. Decode that PNG with jsqr to read the EXACT encoded string.
 * 4. Classify: single-part (ur:crypto-account/<payload>) vs BC-UR fountain
 *    multipart (ur:crypto-account/N-M/<payload>).
 * 5. If a fragment API exists at top level, dump the fragment list.
 *
 * Pure Node; reuses the @metamask/native-utils shim.
 */
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function patchedLoad(request) {
  if (request === '@metamask/native-utils') {
    const { keccak256 } = require('ethereum-cryptography/keccak');
    const { secp256k1 } = require('ethereum-cryptography/secp256k1.js');
    return {
      pubToAddress: (pubKey, sanitize = false) => {
        let key = pubKey;
        if (sanitize && key.length !== 64) {
          key = secp256k1.ProjectivePoint.fromHex(key).toRawBytes(false).slice(1);
        }
        if (key.length !== 64) throw new Error('Expected pubKey length 64');
        return Buffer.from(keccak256(key).subarray(-20));
      },
    };
  }
  return originalLoad.apply(this, arguments);
};

const hw = require('@metamask/hw-emulator');
const jsQR = require('jsqr');
const { readFileSync } = require('node:fs');
const { PNG } = require('pngjs');

function classify(str) {
  const m = String(str).match(/^ur:[^/]+\/(\d+)-(\d+)\//i);
  return m ? { kind: 'multipart', seqNum: +m[1], seqLen: +m[2] } : { kind: 'single-part' };
}

function decodePng(buf) {
  const png = PNG.sync.read(buf);
  const { width, height, data } = png;
  const out = jsQR(new Uint8ClampedArray(data), width, height);
  return out ? out.data : null;
}

(async () => {
  console.log('=== top-level hw-emulator exports ===');
  console.log(Object.keys(hw).sort().join(', '));

  const emulator = hw.createEmulator(hw.EmulatorType.Qr);
  const accountUR = emulator.getAccountUR();

  console.log('\n=== renderToPng(accountUR) → jsqr decode ===');
  const png = await emulator.renderToPng(accountUR);
  const decoded = decodePng(png);
  if (!decoded) {
    console.log('jsqr FAILED to decode the rendered PNG');
  } else {
    console.log('decoded string length:', decoded.length);
    console.log('decoded:', decoded.slice(0, 200), decoded.length > 200 ? '...' : '');
    console.log('classification:', classify(decoded));
  }

  console.log('\n=== fragment APIs (top-level) ===');
  for (const fn of ['encodeToFragments', 'encodeUR', 'renderQrPng', 'decodeQrImage']) {
    console.log(`  ${fn}: ${typeof hw[fn]}`);
  }
  if (typeof hw.encodeToFragments === 'function') {
    try {
      const frags = await hw.encodeToFragments(accountUR);
      console.log('encodeToFragments →', Array.isArray(frags) ? `array len ${frags.length}` : typeof frags);
      if (Array.isArray(frags)) {
        frags.forEach((f, i) => {
          const s = typeof f === 'string' ? f : JSON.stringify(f);
          console.log(`  frag[${i}] len=${s.length} ${JSON.stringify(classify(s))} :: ${s.slice(0, 120)}${s.length > 120 ? '...' : ''}`);
        });
      }
    } catch (e) {
      console.log('encodeToFragments threw:', e.message);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
