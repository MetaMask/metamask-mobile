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

  it('resolves a destination-side fill by destChain txHash', () => {
    // The receiving leg of a cross-chain bridge is a separate on-chain tx
    // whose hash exists only on status.destChain.
    const item = createHistoryItem();

    expect(
      findBridgeHistoryItem({
        bridgeHistory: { 'meta-1': item },
        transactionHash: 'destsig',
      }),
    ).toBe(item);
  });

  it('prefers a source-hash match over a destination-hash match', () => {
    const bySrc = createHistoryItem({
      txMetaId: 'meta-src',
      status: { srcChain: { txHash: '0xAAA' }, destChain: { txHash: '0xBBB' } },
    });
    const byDest = createHistoryItem({
      txMetaId: 'meta-dest',
      status: { srcChain: { txHash: '0xCCC' }, destChain: { txHash: '0xAAA' } },
    });

    expect(
      findBridgeHistoryItem({
        bridgeHistory: { 'meta-src': bySrc, 'meta-dest': byDest },
        transactionHash: '0xAAA',
      }),
    ).toBe(bySrc);
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
