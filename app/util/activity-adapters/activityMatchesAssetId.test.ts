import type { ActivityListItem } from './types';
import { activityMatchesAssetId } from './activityMatchesAssetId';

describe('activityMatchesAssetId', () => {
  it('matches enriched bridge rows by either quote leg', () => {
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
  });
});
