import type { ActivityListItem } from '../../../util/activity-adapters';
import { resolveActivityListItemTitle } from './useActivityListItemRowContent';

describe('resolveActivityListItemTitle bridge perspective', () => {
  const bridgeItem = {
    type: 'bridge',
    status: 'success',
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    data: {
      sourceToken: {
        assetId: 'stellar:pubnet/slip44:148',
        symbol: 'XLM',
        amount: '1',
      },
      destinationToken: {
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        symbol: 'SOL',
        amount: '2',
        direction: 'in',
      },
    },
  } as ActivityListItem;

  it('uses the source symbol on the source token page', () => {
    expect(
      resolveActivityListItemTitle(
        bridgeItem,
        undefined,
        'stellar:pubnet/slip44:148',
      ),
    ).toBe('Bridged XLM');
  });

  it('uses received framing on the destination token page', () => {
    expect(
      resolveActivityListItemTitle(
        bridgeItem,
        undefined,
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      ),
    ).toBe('Received SOL');
  });

  it('keeps destination-centric titles on the global activity list', () => {
    expect(resolveActivityListItemTitle(bridgeItem)).toBe('Bridged SOL');
  });
});
