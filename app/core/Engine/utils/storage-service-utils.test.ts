import { encodeStorageKey, decodeStorageKey } from './storage-service-utils';

describe('storage-service-utils', () => {
  describe('encodeStorageKey', () => {
    it('encodes hyphens as %2D', () => {
      const result = encodeStorageKey('simple-key');

      expect(result).toBe('simple%2Dkey');
    });

    it('encodes slashes as %2F', () => {
      const result = encodeStorageKey('nested/path/key');

      expect(result).toBe('nested%2Fpath%2Fkey');
    });

    it('encodes percent signs as %25', () => {
      const result = encodeStorageKey('percent%key');

      expect(result).toBe('percent%25key');
    });

    it('encodes multiple hyphens', () => {
      const result = encodeStorageKey('key-with-multiple-hyphens');

      expect(result).toBe('key%2Dwith%2Dmultiple%2Dhyphens');
    });

    it('encodes multiple slashes', () => {
      const result = encodeStorageKey('a/b/c/d');

      expect(result).toBe('a%2Fb%2Fc%2Fd');
    });

    it('encodes mixed special characters', () => {
      const result = encodeStorageKey('mixed-key/with%special');

      expect(result).toBe('mixed%2Dkey%2Fwith%25special');
    });

    it('encodes snap IDs with npm scope', () => {
      const result = encodeStorageKey('npm:@metamask/bip32-keyring-snap');

      expect(result).toBe('npm:@metamask%2Fbip32%2Dkeyring%2Dsnap');
    });

    it('does not encode colons', () => {
      const result = encodeStorageKey('tokensChainsCache:0x1');

      expect(result).toBe('tokensChainsCache:0x1');
    });

    it('does not encode underscores', () => {
      const result = encodeStorageKey('safe_key_name');

      expect(result).toBe('safe_key_name');
    });

    it('does not encode alphanumeric characters', () => {
      const result = encodeStorageKey('SimpleKey123');

      expect(result).toBe('SimpleKey123');
    });

    it('returns empty string for empty input', () => {
      const result = encodeStorageKey('');

      expect(result).toBe('');
    });

    it('encodes percent first to avoid double-encoding', () => {
      const result = encodeStorageKey('key%2Dalready');

      expect(result).toBe('key%252Dalready');
    });
  });

  describe('decodeStorageKey', () => {
    it('decodes %2D back to hyphens', () => {
      const result = decodeStorageKey('simple%2Dkey');

      expect(result).toBe('simple-key');
    });

    it('decodes %2F back to slashes', () => {
      const result = decodeStorageKey('nested%2Fpath%2Fkey');

      expect(result).toBe('nested/path/key');
    });

    it('decodes %25 back to percent signs', () => {
      const result = decodeStorageKey('percent%25key');

      expect(result).toBe('percent%key');
    });

    it('decodes multiple encoded hyphens', () => {
      const result = decodeStorageKey('key%2Dwith%2Dmultiple%2Dhyphens');

      expect(result).toBe('key-with-multiple-hyphens');
    });

    it('decodes multiple encoded slashes', () => {
      const result = decodeStorageKey('a%2Fb%2Fc%2Fd');

      expect(result).toBe('a/b/c/d');
    });

    it('decodes mixed encoded characters', () => {
      const result = decodeStorageKey('mixed%2Dkey%2Fwith%25special');

      expect(result).toBe('mixed-key/with%special');
    });

    it('decodes snap IDs with npm scope', () => {
      const result = decodeStorageKey('npm:@metamask%2Fbip32%2Dkeyring%2Dsnap');

      expect(result).toBe('npm:@metamask/bip32-keyring-snap');
    });

    it('handles lowercase encoding', () => {
      const result = decodeStorageKey('key%2dvalue%2fpath');

      expect(result).toBe('key-value/path');
    });

    it('handles uppercase encoding', () => {
      const result = decodeStorageKey('key%2Dvalue%2Fpath');

      expect(result).toBe('key-value/path');
    });

    it('returns empty string for empty input', () => {
      const result = decodeStorageKey('');

      expect(result).toBe('');
    });

    it('returns unencoded strings unchanged', () => {
      const result = decodeStorageKey('SimpleKey123');

      expect(result).toBe('SimpleKey123');
    });
  });

  describe('encode/decode roundtrip', () => {
    const testCases = [
      'simple-key',
      'nested/path/key',
      'mixed-key/with/path',
      'percent%encoded',
      'npm:@metamask/bip32-keyring-snap',
      'tokensChainsCache:0x1',
      'cache:0x1:tokens',
      'safe_key',
      'CamelCaseKey',
      'complex-key/with%special-chars',
      '',
    ];

    it.each(testCases)('roundtrips "%s" correctly', (original) => {
      const encoded = encodeStorageKey(original);
      const decoded = decodeStorageKey(encoded);

      expect(decoded).toBe(original);
    });

    it('handles double encoding prevention', () => {
      const original = 'key%2Dalready-encoded';
      const encoded = encodeStorageKey(original);
      const decoded = decodeStorageKey(encoded);

      expect(decoded).toBe(original);
    });
  });
});
