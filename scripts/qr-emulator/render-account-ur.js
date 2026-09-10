#!/usr/bin/env node
/**
 * render-account-ur.js — Render the QR-emulator default account UR (PAIR) to a
 * single-frame PNG, runnable with plain `node`.
 *
 * This is the transport-agnostic QR fixture for the zero-stub camera-injection
 * E2E: the same `@metamask/hw-emulator` package that drives the Ledger
 * Speculos harness also exposes `QrEmulator` / `renderToPng`, so we render the
 * default account UR exactly the way an emulated Keystone-class device would.
 *
 * Usage:
 *   node scripts/qr-emulator/render-account-ur.js
 *
 * Output:
 *   scripts/qr-emulator/tmp/qr-account.png   (single-frame account QR)
 *   stdout: the expected derived address (QR_EMULATOR_ADDRESS) + output path
 *
 * NOTE (Node-only shim): the app patches `@ethereumjs/util` to override
 * `pubToAddress` with `@metamask/native-utils` (a Nitro native binding) for
 * in-app performance. That binding pulls `react-native-nitro-modules` →
 * `react-native`, whose Flow source plain Node cannot parse. This script only
 * ever runs under plain Node, so the single overridden function is stubbed with
 * the equivalent pure-JS implementation (identical to the un-patched
 * `@ethereumjs/util` `pubToAddress`). No product code is changed.
 */

const { mkdirSync, writeFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

// ── Node-only shim for the RN-native crypto override ───────────────────────
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@metamask/native-utils') {
    const { keccak256 } = require('ethereum-cryptography/keccak');
    const { secp256k1 } = require('ethereum-cryptography/secp256k1.js');
    // Faithful pure-JS mirror of @ethereumjs/util's (pre-patch) pubToAddress.
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

// ── Render the default account UR (PAIR) ───────────────────────────────────
const {
  createEmulator,
  EmulatorType,
  QR_EMULATOR_ADDRESS,
} = require('@metamask/hw-emulator');

const here = __dirname;
const tmpDir = resolve(here, 'tmp');
const outPath = resolve(tmpDir, 'qr-account.png');

async function main() {
  const emulator = createEmulator(EmulatorType.Qr);
  const accountUR = emulator.getAccountUR();
  const png = await emulator.renderToPng(accountUR);

  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  writeFileSync(outPath, png);

  console.log(`QR emulator address: ${QR_EMULATOR_ADDRESS}`);
  console.log(`Wrote account-UR QR PNG: ${outPath} (${png.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
