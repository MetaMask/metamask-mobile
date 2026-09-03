import type { CaipAssetType } from '@metamask/utils';

import { createMockBalanceData } from '../testUtils/fixtures';
import type { BridgeToken } from '../types';
import { mergeBridgeTokensWithBalances } from './mergeBridgeTokensWithBalances';

const makeToken = (
  overrides: Partial<BridgeToken & { assetId: CaipAssetType }> = {},
): BridgeToken & { assetId: CaipAssetType } => ({
  assetId: 'eip155:1/slip44:60',
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  chainId: '0x1',
  balance: '0',
  ...overrides,
});

describe('mergeBridgeTokensWithBalances', () => {
  it('returns tokens unchanged when balances map is undefined', () => {
    const tokens = [makeToken()];

    expect(mergeBridgeTokensWithBalances(tokens, undefined)).toStrictEqual(
      tokens,
    );
  });

  it('merges balance data by normalized CAIP asset ID', () => {
    const tokens = [makeToken({ balance: '0' })];
    const balancesByAssetId = {
      'eip155:1/slip44:60': createMockBalanceData({
        balance: '2.5',
        balanceFiat: '$5,000.00',
        tokenFiatAmount: 5000,
      }),
    };

    expect(
      mergeBridgeTokensWithBalances(tokens, balancesByAssetId)[0],
    ).toMatchObject({
      balance: '2.5',
      balanceFiat: '$5,000.00',
      tokenFiatAmount: 5000,
    });
  });

  it('preserves existing formatted fiat when merged balance data omits it', () => {
    const tokens = [
      makeToken({
        balance: '0',
        balanceFiat: '$0.00',
        tokenFiatAmount: 0,
      }),
    ];
    const balancesByAssetId = {
      'eip155:1/slip44:60': createMockBalanceData({
        balance: '0',
        balanceFiat: undefined,
        tokenFiatAmount: 0,
      }),
    };

    expect(
      mergeBridgeTokensWithBalances(tokens, balancesByAssetId)[0].balanceFiat,
    ).toBe('$0.00');
  });
});
