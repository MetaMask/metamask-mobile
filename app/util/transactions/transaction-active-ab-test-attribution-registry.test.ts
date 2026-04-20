import {
  clearPendingTransactionActiveAbTests,
  getPendingTransactionActiveAbTests,
  registerTransactionAbTestAttributionForIds,
  takeTransactionAbTestAttributionForTransaction,
  withPendingTransactionActiveAbTests,
} from './transaction-active-ab-test-attribution-registry';

describe('withPendingTransactionActiveAbTests', () => {
  beforeEach(() => {
    clearPendingTransactionActiveAbTests();
  });

  it('exposes pending tests during fn and clears after resolve', async () => {
    const tests = [
      { key: 'homeTMCU470AbtestTrendingSections', value: 'trendingSections' },
    ];
    await withPendingTransactionActiveAbTests(tests, async () => {
      expect(getPendingTransactionActiveAbTests()).toEqual(tests);
      return 42;
    });
    expect(getPendingTransactionActiveAbTests()).toBeUndefined();
  });

  it('clears pending after fn rejects', async () => {
    const tests = [{ key: 'k', value: 'v' }];
    await expect(
      withPendingTransactionActiveAbTests(tests, async () => {
        expect(getPendingTransactionActiveAbTests()).toEqual(tests);
        throw new Error('expected failure');
      }),
    ).rejects.toThrow('expected failure');
    expect(getPendingTransactionActiveAbTests()).toBeUndefined();
  });

  it('restores outer pending after nested withPending settles', async () => {
    const outer = [{ key: 'outer', value: 'o' }];
    const inner = [{ key: 'inner', value: 'i' }];

    await withPendingTransactionActiveAbTests(outer, async () => {
      expect(getPendingTransactionActiveAbTests()).toEqual(outer);
      await withPendingTransactionActiveAbTests(inner, async () => {
        expect(getPendingTransactionActiveAbTests()).toEqual(inner);
      });
      expect(getPendingTransactionActiveAbTests()).toEqual(outer);
    });
    expect(getPendingTransactionActiveAbTests()).toBeUndefined();
  });
});

describe('registerTransactionAbTestAttributionForIds', () => {
  beforeEach(() => {
    clearPendingTransactionActiveAbTests();
  });

  it('drops oldest entries when over the cap', () => {
    for (let i = 0; i < 200; i++) {
      registerTransactionAbTestAttributionForIds(
        [`id-${i}`],
        [{ key: 'k', value: String(i) }],
      );
    }
    registerTransactionAbTestAttributionForIds(
      ['id-new'],
      [{ key: 'k', value: 'new' }],
    );
    expect(
      takeTransactionAbTestAttributionForTransaction('id-0'),
    ).toBeUndefined();
    expect(takeTransactionAbTestAttributionForTransaction('id-1')).toEqual([
      { key: 'k', value: '1' },
    ]);
    expect(takeTransactionAbTestAttributionForTransaction('id-new')).toEqual([
      { key: 'k', value: 'new' },
    ]);
  });
});
