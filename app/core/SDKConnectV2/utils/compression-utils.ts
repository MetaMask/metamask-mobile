import { inflateRaw } from 'pako';

/**
 * Decompress a base64-encoded compressed string
 */
export function decompressPayloadB64(compressedBase64: string): string {
  const binaryString = base64Decode(compressedBase64);
  // Convert string back to Uint8Array
  const compressed = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    compressed[i] = binaryString.charCodeAt(i);
  }
  const decompressed = inflateRaw(compressed);
  return new TextDecoder().decode(decompressed);
}

/**
 * Cross-platform base64 decoding
 * Works in browser, Node.js, and React Native environments
 */
function base64Decode(str: string): string {
  if (typeof atob !== 'undefined') {
    // Browser and React Native with polyfills
    return atob(str);
  } else if (typeof Buffer !== 'undefined') {
    // Node.js
    return Buffer.from(str, 'base64').toString();
  }
  throw new Error('No base64 decoding method available');
}
