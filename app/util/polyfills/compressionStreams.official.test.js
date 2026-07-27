/**
 * Smoke tests for the official Compression Streams polyfill.
 *
 * @nktkas/hyperliquid documents that React Native apps must provide
 * DecompressionStream for `fastAssetCtxs` via compression-streams-polyfill.
 * Mobile already has Web Streams + TextDecoder; this test guards the HL path:
 * deflate-raw round-trip matching the SDK decompress() shape.
 *
 * Node 18+ ships native DecompressionStream. Delete those globals before
 * loading the polyfill so the suite exercises fflate (Hermes-like), not Node.
 *
 * @jest-environment node
 * @see https://nktkas.gitbook.io/hyperliquid
 */

import pako from 'pako';

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
 * Decode ASCII bytes produced by encodeUtf8 (not general UTF-8).
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function decodeAscii(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

/**
 * @returns {new (format: string) => { readable: ReadableStream, writable: WritableStream }}
 */
function getDecompressionStream() {
  const ctor = global.DecompressionStream;
  if (typeof ctor !== 'function') {
    throw new Error('DecompressionStream global was not installed by polyfill');
  }
  return ctor;
}

/**
 * Mirrors @nktkas/hyperliquid fastAssetCtxs decompress streaming usage.
 *
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
  let nativeDecompressionStream;
  let nativeCompressionStream;

  beforeAll(async () => {
    // Force the polyfill install path (package no-ops when natives exist).
    nativeDecompressionStream = global.DecompressionStream;
    nativeCompressionStream = global.CompressionStream;
    Reflect.deleteProperty(global, 'DecompressionStream');
    Reflect.deleteProperty(global, 'CompressionStream');

    if (typeof global.TransformStream !== 'function') {
      throw new Error(
        'TransformStream must exist before loading compression-streams-polyfill',
      );
    }

    await import('compression-streams-polyfill');
  });

  afterAll(() => {
    if (nativeDecompressionStream !== undefined) {
      global.DecompressionStream = nativeDecompressionStream;
    }
    if (nativeCompressionStream !== undefined) {
      global.CompressionStream = nativeCompressionStream;
    }
  });

  it('installs DecompressionStream from the polyfill when missing', () => {
    expect(typeof global.DecompressionStream).toBe('function');
    // When a native constructor was present, polyfill must not be a no-op.
    if (typeof nativeDecompressionStream === 'function') {
      expect(global.DecompressionStream).not.toBe(nativeDecompressionStream);
    }
  });

  it('inflates deflate-raw JSON like Hyperliquid fastAssetCtxs', async () => {
    const payload = {
      ctx: [{ coin: 'BTC', markPx: '65000.5', midPx: '65001.0' }],
    };
    const compressed = pako.deflate(encodeUtf8(JSON.stringify(payload)), {
      raw: true,
    });

    const merged = await decompressDeflateRaw(compressed);
    expect(JSON.parse(decodeAscii(merged))).toEqual(payload);
  });
});
