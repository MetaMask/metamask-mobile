function hexStringToUint8Array(hexString) {
  if (hexString.startsWith('0x')) {
    hexString = hexString.slice(2);
  }
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes;
}

export default hexStringToUint8Array;
