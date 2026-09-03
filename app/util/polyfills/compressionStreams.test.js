/**
 * Smoke tests for the official Compression Streams polyfill used on Hermes.
 *
 * @nktkas/hyperliquid documents that React Native apps must provide
 * DecompressionStream for `fastAssetCtxs` via compression-streams-polyfill.
 * Mobile already has Web Streams + TextDecoder; these tests guard:
 * 1) shim.js still wires the package
 * 2) deflate-raw inflate works through the polyfill (not Node natives)
 * 3) the sync fflate branch (Hermes has no worker_threads) still works
 *
 * @see https://nktkas.gitbook.io/hyperliquid
 */

/* eslint-disable import-x/no-commonjs, import-x/no-nodejs-modules --
 * Node-only test isolation: mock fflate before require(polyfill) and read shim.js
 * source as a regression guard for the production import.
 */
const fs = require('fs');
const path = require('path');
const pako = require('pako');
/* eslint-enable import-x/no-commonjs, import-x/no-nodejs-modules */

/**
 * ASCII-only helpers under the RN ESLint env (no Buffer/TextEncoder globals).
 *
 * @param {string} text
 * @returns {Uint8Array}
 */
function encodeAscii(text) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) {
      throw new Error('encodeAscii test helper only supports ASCII');
    }
    out[i] = code;
  }
  return out;
}

/**
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
 * Mirrors @nktkas/hyperliquid fastAssetCtxs decompress streaming usage.
 *
 * @param {new (format: string) => { readable: ReadableStream, writable: WritableStream }} DecompressionStreamCtor
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 */
async function decompressDeflateRaw(DecompressionStreamCtor, bytes) {
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

/**
 * @returns {Uint8Array}
 */
function sampleCompressedPayload() {
  const payload = {
    ctx: [{ coin: 'BTC', markPx: '65000.5', midPx: '65001.0' }],
  };
  return pako.deflate(encodeAscii(JSON.stringify(payload)), { raw: true });
}

describe('compression-streams-polyfill wiring', () => {
  it('keeps the official polyfill import in shim.js', () => {
    const shimPath = path.join(__dirname, '..', '..', '..', 'shim.js');
    const shimSource = fs.readFileSync(shimPath, 'utf8');
    expect(shimSource).toMatch(
      /import\s+['"]compression-streams-polyfill['"]\s*;/,
    );
  });
});

describe('compression-streams-polyfill deflate-raw (Hyperliquid path)', () => {
  let nativeDecompressionStream;
  let nativeCompressionStream;
  /** @type {new (format: string) => { readable: ReadableStream, writable: WritableStream }} */
  let polyfilledDecompressionStream;

  beforeAll(() => {
    if (typeof global.TransformStream !== 'function') {
      throw new Error(
        'TransformStream must exist before loading compression-streams-polyfill',
      );
    }

    nativeDecompressionStream = global.DecompressionStream;
    nativeCompressionStream = global.CompressionStream;
    Reflect.deleteProperty(global, 'DecompressionStream');
    Reflect.deleteProperty(global, 'CompressionStream');

    // Force the sync fflate branch used on Hermes (no worker_threads). The
    // package probes `new AsyncDeflate()` at load; on Node that succeeds and
    // would take the async worker path instead of the device path.
    jest.resetModules();
    jest.doMock('fflate', () => {
      const actual = jest.requireActual('fflate');
      class WorkersUnavailable {
        constructor() {
          throw new Error('workers unavailable');
        }

        terminate() {
          return undefined;
        }
      }
      return {
        ...actual,
        AsyncDeflate: WorkersUnavailable,
        AsyncInflate: WorkersUnavailable,
        AsyncGzip: WorkersUnavailable,
        AsyncGunzip: WorkersUnavailable,
        AsyncZlib: WorkersUnavailable,
        AsyncUnzlib: WorkersUnavailable,
      };
    });

    // Load after mock so hasWorker=0 and DecompressionStream uses wrapSync(Inflate).
    // eslint-disable-next-line import-x/no-commonjs -- intentional CJS for jest.doMock isolation
    require('compression-streams-polyfill');

    if (typeof global.DecompressionStream !== 'function') {
      throw new Error('DecompressionStream was not installed by the polyfill');
    }
    polyfilledDecompressionStream = global.DecompressionStream;
  });

  afterAll(() => {
    jest.dontMock('fflate');
    jest.resetModules();
    if (nativeDecompressionStream !== undefined) {
      global.DecompressionStream = nativeDecompressionStream;
    } else {
      Reflect.deleteProperty(global, 'DecompressionStream');
    }
    if (nativeCompressionStream !== undefined) {
      global.CompressionStream = nativeCompressionStream;
    } else {
      Reflect.deleteProperty(global, 'CompressionStream');
    }
  });

  it('installs a non-native DecompressionStream when the host API is missing', () => {
    expect(typeof polyfilledDecompressionStream).toBe('function');
    if (typeof nativeDecompressionStream === 'function') {
      expect(polyfilledDecompressionStream).not.toBe(nativeDecompressionStream);
    }
  });

  it('inflates deflate-raw JSON like Hyperliquid fastAssetCtxs on the sync path', async () => {
    const compressed = sampleCompressedPayload();
    const merged = await decompressDeflateRaw(
      polyfilledDecompressionStream,
      compressed,
    );
    expect(JSON.parse(decodeAscii(merged))).toEqual({
      ctx: [{ coin: 'BTC', markPx: '65000.5', midPx: '65001.0' }],
    });
  });
});
