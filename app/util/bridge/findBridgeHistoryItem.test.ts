import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { findBridgeHistoryItem } from './findBridgeHistoryItem';

const createHistoryItem = (
  overrides: Record<string, unknown> = {},
): BridgeHistoryItem =>
  ({
    txMetaId: 'meta-1',
    status: {
      srcChain: { txHash: '0xSRC' },
      destChain: { txHash: 'DESTSIG' },
    },
    ...overrides,
  }) as unknown as BridgeHistoryItem;

describe('findBridgeHistoryItem', () => {
  it('resolves by transaction meta id key first', () => {
    const item = createHistoryItem();

    expect(
      findBridgeHistoryItem({
        bridgeHistory: { 'meta-1': item },
        transactionMetaId: 'meta-1',
      }),
    ).toBe(item);
  });

  it('resolves by source tx hash, case-insensitively', () => {
    const item = createHistoryItem();

    expect(
      findBridgeHistoryItem({
        bridgeHistory: { 'meta-1': item },
        transactionHash: '0xsrc',
      }),
    ).toBe(item);
  });

  it('returns undefined when nothing matches', () => {
    expect(
      findBridgeHistoryItem({
        bridgeHistory: { 'meta-1': createHistoryItem() },
        transactionHash: '0xUNRELATED',
      }),
    ).toBeUndefined();
  });
});
