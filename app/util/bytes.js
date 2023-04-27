/**
 * Converts an array of bytes into a hex string
 *
 * @param value - Array of bytes
 *
 * @returns - Hex string
 */
export default function byteArrayToHex(value) {
  const HexCharacters = '0123456789abcdef';
  const result = [];
  for (let i = 0; i < value.length; i++) {
    const v = value[i];
    result.push(HexCharacters[(v & 0xf0) >> 4] + HexCharacters[v & 0x0f]);
  }
  return '0x' + result.join('');
}
