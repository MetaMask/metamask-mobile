import { deflate } from 'pako';
import {
  decompressPayloadB64,
  MAX_DECOMPRESSED_PAYLOAD_SIZE,
} from './compression-utils';

function compressAndEncode(data: string | Uint8Array): string {
  const input =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const compressed = deflate(input);
  let binary = '';
  for (const byte of compressed) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

describe('decompressPayloadB64', () => {
  it('round-trips a valid JSON payload', () => {
    const original = JSON.stringify({
      session: { id: 'abc-123' },
      metadata: { name: 'Test dApp' },
    });

    expect(decompressPayloadB64(compressAndEncode(original))).toBe(original);
  });

  it('aborts decompression when output exceeds the size limit', () => {
    const oversized = new Uint8Array(MAX_DECOMPRESSED_PAYLOAD_SIZE + 1024);
    const encoded = compressAndEncode(oversized);

    expect(() => decompressPayloadB64(encoded)).toThrow(
      'Decompressed payload too large',
    );
  });

  it('throws on corrupt compressed data', () => {
    expect(() => decompressPayloadB64(btoa('not-valid-deflate'))).toThrow(
      'Decompression failed',
    );
  });
});
