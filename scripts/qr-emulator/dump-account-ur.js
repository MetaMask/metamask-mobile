#!/usr/bin/env node
/**
 * dump-account-ur.js — Inspect the QR-emulator account-UR structure.
 *
 * Resolves a critical ambiguity for the thin-seam injection: is the account UR
 * single-part (one receivePart completes the decoder) or BC-UR fountain
 * multi-part (the `1-4` sequence seen in status doc §7.1)?
 *
 * Prints:
 *   - getAccountUR() raw string + length
 *   - whether it carries a `N-M` fountain sequence prefix
 *   - the full fragment list (via encodeToFragments if exposed), one per line
 *   - the fragment count
 *
 * Pure Node. Reuses the same @metamask/native-utils Node-only shim as
 * render-account-ur.js (no product code changed).
 */

// ── Node-only shim for the RN-native crypto override ───────────────────────
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@metamask/native-utils') {
    const { keccak256 } = require('ethereum-cryptography/keccak');
    const { secp256k1 } = require('ethereum-cryptography/secp256k1.js');
    const pubToAddress = (pubKey, sanitize = false) => {
      let key = pubKey;
      if (sanitize && key.length !== 64) {
        key = secp256k1.ProjectivePoint.fromHex(key)
          .toRawBytes(false)
          .slice(1);
      }
      if (key.length !== 64) {
        throw new Error('Expected pubKey to be of length 64');
      }
      return Buffer.from(keccak256(key).subarray(-20));
    };
    return { pubToAddress };
  }
  return originalLoad.apply(this, arguments);
};

const {
  createEmulator,
  EmulatorType,
  QR_EMULATOR_ADDRESS,
} = require('@metamask/hw-emulator');

function seqOf(str) {
  // BC-UR fountain fragments look like ur:<type>/<seqNum>-<seqLen>/<payload>
  // e.g. ur:crypto-account/1-4/lpad...
  const m = String(str).match(/^ur:[^/]+\/(\d+)-(\d+)\//i);
  return m ? { seqNum: +m[1], seqLen: +m[2], raw: m[0] } : null;
}

async function main() {
  const emulator = createEmulator(EmulatorType.Qr);
  const accountUR = emulator.getAccountUR();
  console.log('QR_EMULATOR_ADDRESS:', QR_EMULATOR_ADDRESS);
  console.log('getAccountUR() typeof:', typeof accountUR);
  if (typeof accountUR === 'object' && accountUR) {
    console.log('  .type:', accountUR.type);
    console.log('  .cbor length:', accountUR.cbor ? accountUR.cbor.length : '(none)');
  }

  // Probe fragment APIs actually exposed.
  const candidates = ['encodeToFragments', 'encodeToSingleFragment', 'getFragments', 'renderQrPng', 'renderToPng', 'encodeUR', 'encodeSinglePart'];
  console.log('emulator methods present:', candidates.filter((m) => typeof emulator[m] === 'function'));

  let fragments = null;
  if (typeof emulator.encodeToFragments === 'function') {
    try {
      fragments = await emulator.encodeToFragments(accountUR);
    } catch (e) {
      console.log('encodeToFragments(accountUR) threw:', e.message);
    }
  }
  if (!fragments && typeof emulator.encodeUR === 'function') {
    try {
      const enc = await emulator.encodeUR(accountUR);
      console.log('encodeUR() typeof:', typeof enc, Array.isArray(enc) ? `(array len ${enc.length})` : '');
      if (typeof enc === 'string') {
        fragments = [enc];
      } else if (Array.isArray(enc)) {
        fragments = enc;
      }
    } catch (e) {
      console.log('encodeUR(accountUR) threw:', e.message);
    }
  }
  if (fragments) {
    console.log('fragment count:', fragments.length);
    fragments.forEach((f, i) => {
      const s = typeof f === 'string' ? f : JSON.stringify(f);
      const seq = seqOf(s);
      console.log(`  frag[${i}] len=${s.length}${seq ? ` seq=${seq.seqNum}-${seq.seqLen}` : ' (single-part)'}`);
      console.log(`           ${s.slice(0, 160)}${s.length > 160 ? '...' : ''}`);
    });
  } else {
    console.log('No fragment API produced output.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
