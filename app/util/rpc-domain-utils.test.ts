import { extractRpcDomain, isKnownDomain, setKnownDomainsForTesting } from './rpc-domain-utils';

describe('rpc-domain-utils', () => {
  describe('extractRpcDomain', () => {
    beforeEach(() => {
      // Set up known domains for testing
      setKnownDomainsForTesting(new Set(['example.com', 'infura.io', 'eth-mainnet.alchemyapi.io']));
    });

    afterEach(() => {
      // Clear test domains
      setKnownDomainsForTesting(null);
    });

    it('should extract domain from valid URLs', () => {
      expect(extractRpcDomain('https://example.com')).toBe('example.com');
      expect(extractRpcDomain('https://infura.io/v3/123')).toBe('infura.io');
      expect(extractRpcDomain('http://localhost:8545')).toBe('private');
      expect(extractRpcDomain('wss://eth-mainnet.alchemyapi.io/v2/key')).toBe('eth-mainnet.alchemyapi.io');
    });

    it('should return "private" for unknown domains', () => {
      expect(extractRpcDomain('https://custom-rpc.org')).toBe('private');
      expect(extractRpcDomain('https://my-private-node.com')).toBe('private');
    });

    it('should handle URLs without protocol', () => {
      expect(extractRpcDomain('infura.io/v3/123')).toBe('infura.io');
      expect(extractRpcDomain('localhost:8545')).toBe('private');
    });

    it('should return "invalid" for unparseable URLs', () => {
      expect(extractRpcDomain('')).toBe('invalid');
      expect(extractRpcDomain(null as unknown as string)).toBe('invalid');
      expect(extractRpcDomain(undefined as unknown as string)).toBe('invalid');
      expect(extractRpcDomain(':::invalid-url')).toBe('invalid');
    });
  });

  describe('isKnownDomain', () => {
    beforeEach(() => {
      setKnownDomainsForTesting(new Set(['example.com', 'infura.io']));
    });

    afterEach(() => {
      setKnownDomainsForTesting(null);
    });

    it('should return true for known domains', () => {
      expect(isKnownDomain('example.com')).toBe(true);
      expect(isKnownDomain('infura.io')).toBe(true);
    });

    it('should return false for unknown domains', () => {
      expect(isKnownDomain('unknown.com')).toBe(false);
      expect(isKnownDomain('custom.net')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isKnownDomain('EXAMPLE.COM')).toBe(true);
      expect(isKnownDomain('Infura.Io')).toBe(true);
    });
  });
});
