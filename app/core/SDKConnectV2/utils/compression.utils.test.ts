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
      // Arrange
      const originalText = 'Hello, World!';
      const compressedBase64 = btoa('compressed-data');
      const mockDecompressed = new Uint8Array([
        72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33,
      ]); // "Hello, World!" in bytes

      mockInflateRaw.mockReturnValue(mockDecompressed);

      // Act
      const result = decompressPayloadB64(compressedBase64);

      // Assert
      expect(result).toBe(originalText);
      expect(mockInflateRaw).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('handles empty string input', () => {
      // Arrange
      const compressedBase64 = btoa('');
      const mockDecompressed = new Uint8Array([]);

      global.atob = jest.fn().mockReturnValue('');
      mockInflateRaw.mockReturnValue(mockDecompressed);

      // Act
      const result = decompressPayloadB64(compressedBase64);

      // Assert
      expect(result).toBe('');
      expect(global.atob).toHaveBeenCalledWith(compressedBase64);
      expect(mockInflateRaw).toHaveBeenCalledWith(new Uint8Array(0));
    });

    it('handles unicode characters correctly', () => {
      // Arrange
      const originalText = 'Hello 世界! 🌍';
      const compressedBase64 = btoa('unicode-compressed');
      const mockDecompressed = new TextEncoder().encode(originalText);

      global.atob = jest.fn().mockReturnValue('unicode-compressed');
      mockInflateRaw.mockReturnValue(
        mockDecompressed as Uint8Array<ArrayBuffer>,
      );

      // Act
      const result = decompressPayloadB64(compressedBase64);

      // Assert
      expect(result).toBe(originalText);
    });

    it('throws error when pako decompression fails', () => {
      // Arrange
      const compressedBase64 = btoa('invalid-data');

      global.atob = jest.fn().mockReturnValue('invalid-data');
      mockInflateRaw.mockImplementation(() => {
        throw new Error('Decompression failed');
      });

      // Act & Assert
      expect(() => decompressPayloadB64(compressedBase64)).toThrow(
        'Decompression failed',
      );
    });
  });

  describe('base64Decode', () => {
    it('uses atob when available (browser/React Native)', () => {
      // Arrange
      const testString = 'SGVsbG8gV29ybGQ=';
      const expectedResult = 'Hello World';

      global.atob = jest.fn().mockReturnValue(expectedResult);
      mockInflateRaw.mockReturnValue(new Uint8Array());

      // Act
      decompressPayloadB64(testString);

      // Assert
      expect(global.atob).toHaveBeenCalledWith(testString);
    });

    it('handles base64 padding correctly', () => {
      // Arrange
      const testString = 'SGVsbG8='; // "Hello" with padding
      const expectedResult = 'Hello';

      global.atob = jest.fn().mockReturnValue(expectedResult);
      mockInflateRaw.mockReturnValue(new Uint8Array());

      // Act
      decompressPayloadB64(testString);

      // Assert
      expect(global.atob).toHaveBeenCalledWith(testString);
    });
  });

  describe('integration tests', () => {
    it('processes complex JSON data correctly', () => {
      // Arrange
      const originalData = JSON.stringify({
        message: 'Test message',
        data: [1, 2, 3],
        nested: { key: 'value' },
      });
      const compressedBase64 = btoa('json-compressed');
      const mockDecompressed = new TextEncoder().encode(originalData);

      global.atob = jest.fn().mockReturnValue('json-compressed');
      mockInflateRaw.mockReturnValue(
        mockDecompressed as Uint8Array<ArrayBuffer>,
      );

      // Act
      const result = decompressPayloadB64(compressedBase64);

      // Assert
      expect(result).toBe(originalData);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('handles large payloads efficiently', () => {
      // Arrange
      const largeString = 'A'.repeat(10000);
      const compressedBase64 = btoa('large-compressed');
      const mockDecompressed = new TextEncoder().encode(largeString);

      global.atob = jest.fn().mockReturnValue('large-compressed');
      mockInflateRaw.mockReturnValue(
        mockDecompressed as Uint8Array<ArrayBuffer>,
      );

      // Act
      const result = decompressPayloadB64(compressedBase64);

      // Assert
      expect(result).toBe(largeString);
      expect(result.length).toBe(10000);
    });
  });
});
