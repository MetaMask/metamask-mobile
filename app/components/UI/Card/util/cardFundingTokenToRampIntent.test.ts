import { FundingStatus } from '../types';
import { cardFundingTokenToRampIntent } from './cardFundingTokenToRampIntent';

describe('cardFundingTokenToRampIntent', () => {
  it('returns erc20 assetId when token has an address', () => {
    const intent = cardFundingTokenToRampIntent({
      address: '0xABC',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      caipChainId: 'eip155:1',
      fundingStatus: FundingStatus.Enabled,
      spendableBalance: '0',
    });

    expect(intent).toEqual({ assetId: 'eip155:1/erc20:0xabc' });
  });

  it('returns empty intent when token has no address', () => {
    const intent = cardFundingTokenToRampIntent({
      address: null,
      symbol: 'ETH',
      decimals: 18,
      name: 'Ether',
      caipChainId: 'eip155:1',
      fundingStatus: FundingStatus.Enabled,
      spendableBalance: '0',
    });

    expect(intent).toEqual({});
  });

  it('returns empty intent when token is undefined', () => {
    expect(cardFundingTokenToRampIntent(undefined)).toEqual({});
  });
});
