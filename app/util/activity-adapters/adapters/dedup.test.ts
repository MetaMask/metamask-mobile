import type { ActivityListItem } from '../types';
import { mergeActivityItems } from './dedup';

const makeItem = (
  source: string,
  timestamp: number,
  hash?: string,
): ActivityListItem =>
  ({
    type: 'send',
    chainId: 'eip155:1',
    status: 'success',
    timestamp,
    hash,
    data: {},
    raw: { type: source, data: {} },
  }) as unknown as ActivityListItem;

describe('mergeActivityItems', () => {
  it('lets confirmed EVM items win over local duplicates and sorts newest first', () => {
    const localDuplicate = makeItem('localTransaction', 1, '0xABC');
    const confirmed = makeItem('apiEvmTransaction', 2, '0xabc');
    const nonEvm = makeItem('keyringTransaction', 3, 'solana-hash');

    expect(mergeActivityItems([localDuplicate], [confirmed], [nonEvm])).toEqual(
      [nonEvm, confirmed],
    );
  });

  it('keeps hashless items because there is no stable dedup key', () => {
    const local = makeItem('localTransaction', 1);
    const confirmed = makeItem('apiEvmTransaction', 2);

    expect(mergeActivityItems([local], [confirmed], [])).toEqual([
      confirmed,
      local,
    ]);
  });

  it('lets perps items win over confirmed and local copies of the same hash', () => {
    // A perps deposit is also a real EVM tx: the API/local copies carry a
    // generic kind, the perps copy the specific one — perps must win.
    const localCopy = makeItem('localTransaction', 1, '0xDEPOSIT');
    const confirmedCopy = makeItem('apiEvmTransaction', 2, '0xdeposit');
    const perpsCopy = makeItem('perps', 3, '0xDeposit');

    expect(
      mergeActivityItems([localCopy], [confirmedCopy], [], [perpsCopy]),
    ).toEqual([perpsCopy]);
  });

  it('lets predict items win over confirmed copies of the same hash', () => {
    const confirmedCopy = makeItem('apiEvmTransaction', 1, '0xCLAIM');
    const predictCopy = makeItem('predict', 2, '0xclaim');

    expect(
      mergeActivityItems([], [confirmedCopy], [], [], [predictCopy]),
    ).toEqual([predictCopy]);
  });

  it('merges perps and predict items together, newest first', () => {
    const perpsFill = makeItem('perps', 1, 'perps-id');
    const predictBet = makeItem('predict', 2, 'predict-id');

    expect(mergeActivityItems([], [], [], [perpsFill], [predictBet])).toEqual([
      predictBet,
      perpsFill,
    ]);
  });

  it('lets ramp items win over confirmed and local copies of the same hash', () => {
    const localCopy = makeItem('localTransaction', 1, '0XRAMP');
    const confirmedCopy = makeItem('apiEvmTransaction', 2, '0xramp');
    const rampCopy = makeItem('rampOrder', 3, '0xRamp');

    expect(
      mergeActivityItems([localCopy], [confirmedCopy], [], [], [], [rampCopy]),
    ).toEqual([rampCopy]);
  });
});
