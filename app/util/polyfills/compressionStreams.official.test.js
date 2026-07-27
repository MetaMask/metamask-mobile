/**
 * Smoke tests for the official Compression Streams polyfill.
 *
 * @nktkas/hyperliquid documents that React Native apps must provide
 * DecompressionStream for `fastAssetCtxs` via compression-streams-polyfill.
 * Mobile already has Web Streams + TextDecoder; this test guards the HL path:
 * deflate-raw round-trip matching the SDK decompress() shape.
 *
 * @jest-environment node
 * @see https://nktkas.gitbook.io/hyperliquid
 */

import pako from 'pako';
import 'compression-streams-polyfill';

/**
 * ASCII-only helpers under the RN ESLint env (no Buffer/TextEncoder globals).
 *
 * @param {string} text
 * @returns {Uint8Array}
 */
function encodeUtf8(text) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) {
      throw new Error('encodeUtf8 test helper only supports ASCII');
    }
    out[i] = code;
  }
  return out;
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function decodeUtf8(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

/**
 * Mirrors @nktkas/hyperliquid fastAssetCtxs decompress streaming usage.
 *
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 */
/**
 * @returns {typeof globalThis.DecompressionStream}
 */
function getDecompressionStream() {
  const ctor = global.DecompressionStream;
  if (typeof ctor !== 'function') {
    throw new Error('DecompressionStream global was not installed by polyfill');
  }
  return ctor;
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 */
async function decompressDeflateRaw(bytes) {
  const DecompressionStreamCtor = getDecompressionStream();
  const stream = new DecompressionStreamCtor('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();

  const reader = stream.readable.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let result = await reader.read();
  while (!result.done) {
    chunks.push(result.value);
    result = await reader.read();
  }

  const merged = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

describe('compression-streams-polyfill (Hyperliquid RN path)', () => {
  it('installs DecompressionStream on the global', () => {
    expect(typeof global.DecompressionStream).toBe('function');
  });

  it('inflates deflate-raw JSON like Hyperliquid fastAssetCtxs', async () => {
    const payload = {
      ctx: [{ coin: 'BTC', markPx: '65000.5', midPx: '65001.0' }],
    };
    const compressed = pako.deflate(encodeUtf8(JSON.stringify(payload)), {
      raw: true,
    });

    const merged = await decompressDeflateRaw(compressed);
    expect(JSON.parse(decodeUtf8(merged))).toEqual(payload);
  });
});
