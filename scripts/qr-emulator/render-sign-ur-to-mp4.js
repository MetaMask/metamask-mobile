#!/usr/bin/env node
/**
 * render-sign-ur-to-mp4.js — Render an animated, multi-part (fountain-coded)
 * BC-UR to a looping MP4 for the zero-stub `-camera-back videofile:` spike.
 *
 * This proves whether the Android emulator's `videofile:` camera mode can
 * drive the REAL react-native-vision-camera + ML Kit to decode an animated
 * fountain-code QR stream — the true analog of Chrome's
 * `--use-file-for-fake-video-capture` + Y4M.
 *
 * For the spike, we force a multi-part encoding of the PAIR account UR (using
 * a small fragment size) so the decoder must reassemble fountain-encoded
 * parts — exercising the animated path even though the content is a PAIR UR.
 * A real EthSignRequest can be substituted once the pipeline is proven.
 *
 * Usage:
 *   node scripts/qr-emulator/render-sign-ur-to-mp4.js
 *
 * Output:
 *   scripts/qr-emulator/tmp/qr-sign-response.mp4  (looping, multi-part animated QR)
 *   stdout: expected address + output path + size
 *
 * Prerequisites: ffmpeg on $PATH.
 *
 * NOTE (Node-only shim): the app patches `@ethereumjs/util` to override
 * `pubToAddress` with `@metamask/native-utils` (a Nitro native binding). This
 * script only ever runs under plain Node, so the single overridden function is
 * stubbed with the equivalent pure-JS implementation. No product code is changed.
 */

const { mkdirSync, writeFileSync, existsSync, unlinkSync, statSync } =
  require('node:fs');
const { resolve } = require('node:path');
const { execSync } = require('node:child_process');

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

// ── Render animated multi-part UR to MP4 ──────────────────────────────────
const {
  createEmulator,
  EmulatorType,
  QR_EMULATOR_ADDRESS,
} = require('@metamask/hw-emulator');

const here = __dirname;
const tmpDir = resolve(here, 'tmp');
const outPath = resolve(tmpDir, 'qr-sign-response.mp4');
const frameDir = resolve(tmpDir, 'qr-sign-frames');

if (!existsSync(tmpDir)) {
  mkdirSync(tmpDir, { recursive: true });
}
if (!existsSync(frameDir)) {
  mkdirSync(frameDir, { recursive: true });
}

async function main() {
  const emulator = createEmulator(EmulatorType.Qr);

  // Use the account PAIR UR forced into MULTIPLE fragments (small fragment size)
  // so the animated fountain-code path is exercised. A real EthSignRequest can
  // be swapped in after the videofile: pipeline is proven.
  const accountUR = emulator.getAccountUR();

  const { encodeToFragments, renderQrPng } = require('@metamask/hw-emulator');

  // Force multi-part by using a fragment size of 50 bytes (production = 200).
  const fragmentSize = 50;
  const fragments = encodeToFragments(accountUR, fragmentSize);

  console.log(
    `Rendering ${fragments.length} QR frames to ${frameDir} (fragmentSize=${fragmentSize})...`,
  );

  const framePaths = [];
  for (let i = 0; i < fragments.length; i++) {
    const png = await renderQrPng(fragments[i]);
    const framePath = resolve(frameDir, `frame-${String(i).padStart(4, '0')}.png`);
    writeFileSync(framePath, png);
    framePaths.push(framePath);
  }

  console.log(`Wrote ${framePaths.length} frames. Encoding MP4...`);

  const fps = 5;

  try {
    // ffmpeg image sequence: reads frame-0000.png → frame-NNNN.png at fps.
    execSync(
      `ffmpeg -y -r ${fps} -i '${frameDir}/frame-%04d.png' ` +
        `-vf "scale=if(gte(iw\\,ih)\\,min(1280\\,iw)\\,-2):if(lt(iw\\,ih)\\,min(720\\,ih)\\,-2):flags=lanczos,pad=1280:720:(ow-iw)/2:(oh-ih)/2" ` +
        `-c:v libx264 -profile:v baseline -pix_fmt yuv420p ` +
        `-r ${fps} '${outPath}'`,
      { stdio: 'pipe' },
    );
  } catch (ffErr) {
    console.error('ffmpeg failed:', ffErr.stderr?.toString() || ffErr.message);
    for (const p of framePaths) unlinkSync(p);
    process.exit(1);
  }

  // Clean up frame files
  for (const p of framePaths) unlinkSync(p);

  const { size } = statSync(outPath);
  console.log(`QR emulator address: ${QR_EMULATOR_ADDRESS}`);
  console.log(
    `Wrote sign QR mp4: ${outPath} (${size} bytes, ${fragments.length} frames at ${fps}fps)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
