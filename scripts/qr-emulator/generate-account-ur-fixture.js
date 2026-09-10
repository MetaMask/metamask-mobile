#!/usr/bin/env node
/**
 * generate-account-ur-fixture.js — Emit the deterministic 4-fragment BC-UR
 * account-UR sequence used by the thin-seam camera mock.
 *
 * Output: tests/fixtures/qr/account-ur-fragments.json
 *   { "address": "0x...", "refreshMs": <n>, "fragmentCount": 4,
 *     "fragments": [ "ur:crypto-account/1-4/...", ... 4 ] }
 *
 * The account UR is BC-UR fountain-encoded into 4 fragments. The app's
 * URRegistryDecoder needs all 4 (receivePart × 4) to reach isSuccess().
 * A static single PNG only carries fragment 1 of 4 and will NOT import.
 *
 * Deterministic: derived from QR_EMULATOR_SEED (Hardhat/Anvil account #0).
 * Re-run if the emulator seed changes.
 *
 * Pure Node; reuses the @metamask/native-utils shim from render-account-ur.js.
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

const { writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const {
  createEmulator,
  EmulatorType,
  QR_EMULATOR_ADDRESS,
  encodeToFragments,
  QR_REFRESH_MS,
} = require('@metamask/hw-emulator');

const outPath = resolve(__dirname, '..', '..', 'tests', 'fixtures', 'qr', 'account-ur-fragments.json');

(async () => {
  const emulator = createEmulator(EmulatorType.Qr);
  const accountUR = emulator.getAccountUR();
  const fragments = await encodeToFragments(accountUR);

  if (!Array.isArray(fragments) || fragments.length === 0) {
    throw new Error('encodeToFragments returned no fragments');
  }

  const payload = {
    address: QR_EMULATOR_ADDRESS,
    refreshMs: QR_REFRESH_MS,
    fragmentCount: fragments.length,
    fragments,
  };

  mkdirSync(resolve(outPath, '..'), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');

  console.log(`address: ${QR_EMULATOR_ADDRESS}`);
  console.log(`refreshMs: ${QR_REFRESH_MS}`);
  console.log(`fragments: ${fragments.length} (each ~${fragments[0].length} chars)`);
  console.log(`wrote: ${outPath}`);
})().catch((e) => { console.error(e); process.exit(1); });
