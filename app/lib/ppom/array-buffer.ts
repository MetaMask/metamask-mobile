export const base64toArrayBuffer = (b64: string) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const buffer = window.Buffer.from(b64, 'base64');
  const uint8array = new Uint8Array(buffer);
  return uint8array.buffer;
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const uint8array = new Uint8Array(buffer);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return window.Buffer.from(uint8array).toString('base64');
};
