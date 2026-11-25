import type { Hex } from '@metamask/utils';
import { getLimitOrderDelegationsParams } from './getLimitOrderDelegationsParams';

const ETH = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ETH',
};

const USDC = {
  address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  chainId: '0xa' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

describe('getLimitOrderDelegationsParams', () => {
  it('converts the tokens and amounts to asset ids and minimal units', () => {
    expect(
      getLimitOrderDelegationsParams({
        sourceToken: ETH,
        destToken: USDC,
        sourceAmount: '0.1',
        destTokenAmount: '341.22',
        expiresInMinutes: 10080,
      }),
    ).toStrictEqual({
      sourceAssetId: 'eip155:1/slip44:60',
      sourceAmount: '100000000000000000',
      destAssetId: 'eip155:10/erc20:0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      destAmount: '341220000',
      expiresInMinutes: 10080,
    });
  });

  it('falls back to zero amounts when the amounts are missing', () => {
    const params = getLimitOrderDelegationsParams({
      sourceToken: ETH,
      destToken: USDC,
      expiresInMinutes: 60,
    });

    expect(params.sourceAmount).toBe('0');
    expect(params.destAmount).toBe('0');
  });

  it('leaves the asset ids undefined when a token is not selected', () => {
    const params = getLimitOrderDelegationsParams({
      sourceAmount: '0.1',
      destTokenAmount: '341.22',
      expiresInMinutes: 60,
    });

    expect(params.sourceAssetId).toBeUndefined();
    expect(params.destAssetId).toBeUndefined();
  });
});
