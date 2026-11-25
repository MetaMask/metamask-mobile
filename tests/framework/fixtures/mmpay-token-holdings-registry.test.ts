import { chainIdForRpcUrl } from './mmpay-token-holdings-registry';

describe('chainIdForRpcUrl', () => {
  it('maps BSC mainnet before the generic mainnet fallback', () => {
    expect(chainIdForRpcUrl('https://bsc-mainnet.infura.io/v3/project')).toBe(
      '0x38',
    );
    expect(chainIdForRpcUrl('https://bsc-dataseed1.binance.org')).toBe('0x38');
  });

  it('keeps ethereum, polygon, arbitrum, and monad on their own chain ids', () => {
    expect(chainIdForRpcUrl('https://mainnet.infura.io/v3/project')).toBe(
      '0x1',
    );
    expect(
      chainIdForRpcUrl('https://polygon-mainnet.infura.io/v3/project'),
    ).toBe('0x89');
    expect(
      chainIdForRpcUrl('https://arbitrum-mainnet.infura.io/v3/project'),
    ).toBe('0xa4b1');
    expect(chainIdForRpcUrl('https://monad-mainnet.infura.io/v3/project')).toBe(
      '0x8f',
    );
  });
});
