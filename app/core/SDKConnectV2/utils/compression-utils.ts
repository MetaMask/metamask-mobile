import { Inflate } from 'pako';

export const MAX_DECOMPRESSED_PAYLOAD_SIZE = 1024 * 1024; // 1 MB

/**
 * Decompress a base64-encoded compressed string using streaming inflation.
 * Aborts early if cumulative output exceeds MAX_DECOMPRESSED_PAYLOAD_SIZE,
 * preventing decompression bomb attacks from exhausting heap memory.
 */
export function decompressPayloadB64(compressedBase64: string): string {
  const binaryString = atob(compressedBase64);
  const compressed = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    compressed[i] = binaryString.charCodeAt(i);
  }

  const inflator = new Inflate();
  let outputSize = 0;
  const collectChunk = inflator.onData;

  inflator.onData = (chunk) => {
    outputSize += chunk.byteLength;
    if (outputSize > MAX_DECOMPRESSED_PAYLOAD_SIZE) {
      throw new Error(`Decompressed payload too large (max 1MB).`);
    }
    collectChunk.call(inflator, chunk);
  };

  inflator.push(compressed, true);

  if (inflator.err) {
    throw new Error(`Decompression failed: ${inflator.msg}`);
  }

  return new TextDecoder().decode(inflator.result as Uint8Array);
}
