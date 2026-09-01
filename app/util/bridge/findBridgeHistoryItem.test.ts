import { findBridgeHistoryItem } from './findBridgeHistoryItem';

describe('findBridgeHistoryItem', () => {
  const bridgeHistory = {
    'bridge-1': {
      txMetaId: 'bridge-1',
      status: {
        srcChain: { txHash: '0xsource' },
        destChain: { txHash: '0xdest' },
      },
    },
  };

  it('finds history by source transaction hash', () => {
    expect(
      findBridgeHistoryItem({
        bridgeHistory,
        transactionHash: '0xsource',
      }),
    ).toEqual(bridgeHistory['bridge-1']);
  });

  it('finds history by destination transaction hash', () => {
    expect(
      findBridgeHistoryItem({
        bridgeHistory,
        transactionHash: '0xdest',
      }),
    ).toEqual(bridgeHistory['bridge-1']);
  });
});
