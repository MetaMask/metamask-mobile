import { arrayBufferToBase64, base64toArrayBuffer } from './array-buffer';

describe('ArrayBuffer', () => {
  it('should correclly inter-convert string to arrayBuffer', () => {
    const base64Str = btoa('DUMMY');
    const buffer = base64toArrayBuffer(base64Str);
    const str = arrayBufferToBase64(buffer);
    expect(str).toBe(base64Str);
  });
});
