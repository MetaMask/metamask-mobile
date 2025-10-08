import { decompressPayloadB64 } from './compression-utils';
import { inflateRaw } from 'pako';

// Mock pako dependency
jest.mock('pako', () => ({
  inflateRaw: jest.fn(),
}));

const mockInflateRaw = inflateRaw as jest.MockedFunction<typeof inflateRaw>;

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

      mockInflateRaw.mockReturnValue(mockDecompressed);

      const result = decompressPayloadB64(compressedBase64);

      expect(result).toBe(originalText);
      expect(mockInflateRaw).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('handles empty string input', () => {
      const compressedBase64 = btoa('');
      const mockDecompressed = new Uint8Array([]);

      mockInflateRaw.mockReturnValue(mockDecompressed);

      const result = decompressPayloadB64(compressedBase64);

      expect(result).toBe('');
      expect(mockInflateRaw).toHaveBeenCalledWith(new Uint8Array(0));
    });

    it('handles unicode characters correctly', () => {
      const originalText = 'Hello 世界! 🌍';
      const compressedBase64 = btoa('unicode-compressed');
      const mockDecompressed = new TextEncoder().encode(originalText);

      mockInflateRaw.mockReturnValue(
        mockDecompressed as Uint8Array<ArrayBuffer>,
      );

      const result = decompressPayloadB64(compressedBase64);

      expect(result).toBe(originalText);
    });
  });

  describe('integration tests', () => {
    it('processes complex JSON data correctly', () => {
      const originalData = JSON.stringify({
        message: 'Test message',
        data: [1, 2, 3],
        nested: { key: 'value' },
      });
      const compressedBase64 = btoa('json-compressed');
      const mockDecompressed = new TextEncoder().encode(originalData);

      mockInflateRaw.mockReturnValue(
        mockDecompressed as Uint8Array<ArrayBuffer>,
      );

      const result = decompressPayloadB64(compressedBase64);

      expect(result).toBe(originalData);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('handles large payloads efficiently', () => {
      const largeString = 'A'.repeat(10000);
      const compressedBase64 = btoa('large-compressed');
      const mockDecompressed = new TextEncoder().encode(largeString);

      mockInflateRaw.mockReturnValue(
        mockDecompressed as Uint8Array<ArrayBuffer>,
      );

      const result = decompressPayloadB64(compressedBase64);

      expect(result).toBe(largeString);
      expect(result.length).toBe(10000);
    });
  });
});
