import { extractRpcDomain } from './rpc-domain-utils';

describe('rpc-domain-utils', () => {
  describe('extractRpcDomain', () => {
    it('should extract domain from valid URLs', () => {
      expect(extractRpcDomain('https://example.com')).toBe('example.com');
      expect(extractRpcDomain('https://infura.io/v3/123')).toBe('infura.io');
      expect(extractRpcDomain('http://localhost:8545')).toBe('localhost');
      expect(extractRpcDomain('wss://eth-mainnet.alchemyapi.io/v2/key')).toBe('eth-mainnet.alchemyapi.io');
    });

    it('should handle URLs without protocol', () => {
      expect(extractRpcDomain('infura.io/v3/123')).toBe('infura.io');
      expect(extractRpcDomain('localhost:8545')).toBe('localhost');
    });

    it('should return "invalid" for unparseable URLs', () => {
      expect(extractRpcDomain('')).toBe('invalid');
      expect(extractRpcDomain(null as unknown as string)).toBe('invalid');
      expect(extractRpcDomain(undefined as unknown as string)).toBe('invalid');
      expect(extractRpcDomain(':::invalid-url')).toBe('invalid');
    });
  });
});
