import type { ActivityListItem } from './types';
import {
  activityMatchesAssetId,
  bridgeQuoteLegMatchesAsset,
} from './activityMatchesAssetId';

describe('activityMatchesAssetId', () => {
  it('matches when any token leg shares the page asset id', () => {
    const item = {
      type: 'bridge',
      data: {
        sourceToken: {
          assetId: 'stellar:pubnet/slip44:148',
          symbol: 'XLM',
        },
        destinationToken: {
          assetId: 'eip155:1/slip44:60',
          symbol: 'ETH',
        },
      },
    } as ActivityListItem;

    expect(
      activityMatchesAssetId(item, 'stellar:pubnet/slip44:148' as const),
    ).toBe(true);
    expect(
      activityMatchesAssetId(item, 'eip155:1/slip44:60' as const),
    ).toBe(true);
    expect(
      activityMatchesAssetId(item, 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501' as const),
    ).toBe(false);
  });
});

describe('bridgeQuoteLegMatchesAsset', () => {
  it('matches NEVM native legs by assetId when address is zero', () => {
    const quote = {
      srcAsset: {
        address: '0x0000000000000000000000000000000000000000',
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      },
      destAsset: {
        address: '0x0000000000000000000000000000000000000000',
        assetId: 'eip155:1/slip44:60',
      },
    };

    expect(
      bridgeQuoteLegMatchesAsset(
        quote,
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      ),
    ).toBe(true);
    expect(
      bridgeQuoteLegMatchesAsset(
        quote,
        'eip155:1/slip44:60',
      ),
    ).toBe(true);
  });

  it('falls back to hex address matching for EVM token pages', () => {
    const quote = {
      srcAsset: {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
      },
      destAsset: {
        address: '0x0000000000000000000000000000000000000000',
        assetId: 'eip155:1/slip44:60',
      },
    };

    expect(
      bridgeQuoteLegMatchesAsset(
        quote,
        'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
        '0x6b175474e89094c44da98b954eedeac495271d0f',
      ),
    ).toBe(true);
  });
});
