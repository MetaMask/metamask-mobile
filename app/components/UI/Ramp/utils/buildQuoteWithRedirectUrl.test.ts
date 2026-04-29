import { getCheckoutContext } from './buildQuoteWithRedirectUrl';

describe('getCheckoutContext', () => {
  describe('network from chainId', () => {
    it('extracts network as part after colon when chainId contains colon', () => {
      const result = getCheckoutContext({ chainId: 'eip155:1' }, '0xabc', null);

      expect(result.network).toBe('1');
    });

    it('uses full chainId as network when chainId has no colon', () => {
      const result = getCheckoutContext({ chainId: '0x1' }, '0xabc', null);

      expect(result.network).toBe('0x1');
    });

    it('returns empty network when chainId is undefined', () => {
      const result = getCheckoutContext(null, '0xabc', null);

      expect(result.network).toBe('');
    });

    it('returns empty network when chainId ends with colon and no suffix', () => {
      const result = getCheckoutContext({ chainId: 'eip155:' }, '0xabc', null);

      expect(result.network).toBe('');
    });
  });
});
