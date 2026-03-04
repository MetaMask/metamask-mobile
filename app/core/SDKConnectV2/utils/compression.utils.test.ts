import { decompressPayloadB64 } from './compression-utils';
import { inflate } from 'pako';

jest.mock('pako', () => ({
  inflate: jest.fn(),
}));

const mockInflate = inflate as jest.MockedFunction<typeof inflate>;

describe('compression-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('decompressPayloadB64', () => {
    it('decompresses a valid base64-encoded compressed string', () => {
      const originalText = 'Hello, World!';
      const compressedBase64 = btoa('compressed-data');
      const mockDecompressed = new Uint8Array([
        72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33,
      ]); // "Hello, World!" in bytes

      mockInflate.mockReturnValue(mockDecompressed);

      const result = decompressPayloadB64(compressedBase64);

      expect(result).toBe(originalText);
      expect(mockInflate).toHaveBeenCalledWith(expect.any(Uint8Array));
    });
  });
});
