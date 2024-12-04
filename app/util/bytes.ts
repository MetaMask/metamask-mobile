/**
 * Converts an array of bytes into a hex string
 *
 * @param value - Array of bytes
 *
 * @returns - Hex string
 */
export default function byteArrayToHex(value: Uint8Array): string {
  const HexCharacters = '0123456789abcdef';
  const result = [];
  for (const v of value) {
    result.push(HexCharacters[(v & 0xf0) >> 4] + HexCharacters[v & 0x0f]);
  }
  return '0x' + result.join('');
}

/**
 * Converts bytes length to bits length
 *
 * @param bytesLength - Bytes length to convert
 * @returns Bits length
 */
export function bytesLengthToBitsLength(bytesLength: number): number {
  return bytesLength * 8;
}
