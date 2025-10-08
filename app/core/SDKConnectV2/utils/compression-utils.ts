import { inflateRaw } from 'pako';

/**
 * Decompress a base64-encoded compressed string
 */
export function decompressPayloadB64(compressedBase64: string): string {
  const binaryString = atob(compressedBase64);
  // Convert string back to Uint8Array
  const compressed = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    compressed[i] = binaryString.charCodeAt(i);
  }
  const decompressed = inflateRaw(compressed);
  return new TextDecoder().decode(decompressed);
}
