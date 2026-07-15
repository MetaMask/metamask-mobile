import { getCardTokenDisplay } from './getCardTokenDisplay';

const VEDA_ADDRESS = '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae';
const MONAD_CAIP = 'eip155:143';

describe('getCardTokenDisplay', () => {
  it('returns mUSD branding when displaySymbol is mUSD', () => {
    const result = getCardTokenDisplay({
      address: VEDA_ADDRESS,
      caipChainId: MONAD_CAIP,
      symbol: 'veda',
      displaySymbol: 'mUSD',
      isMoneyAccountEntry: true,
    });
    expect(result.symbol).toBe('mUSD');
    expect(typeof result.iconSource).toBe('number');
  });

  it('falls back to mUSD branding when isMoneyAccountEntry is true even without displaySymbol', () => {
    const result = getCardTokenDisplay({
      address: VEDA_ADDRESS,
      caipChainId: MONAD_CAIP,
      symbol: 'veda',
      isMoneyAccountEntry: true,
    });
    expect(result.symbol).toBe('mUSD');
    expect(typeof result.iconSource).toBe('number');
  });

  it('returns the token symbol and CDN icon URL for non-Veda tokens', () => {
    const result = getCardTokenDisplay({
      address: '0xabc',
      caipChainId: 'eip155:1',
      symbol: 'USDC',
    });
    expect(result.symbol).toBe('USDC');
    expect(result.iconSource).toEqual({
      uri: expect.stringContaining('/tokenIcons/'),
    });
  });

  it('returns empty symbol when token has no symbol and is not a Money Account', () => {
    const result = getCardTokenDisplay({
      address: '0xabc',
      caipChainId: 'eip155:1',
      symbol: null,
    });
    expect(result.symbol).toBe('');
  });
});
