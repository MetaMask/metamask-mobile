import {
  clearPendingTransactionActiveAbTests,
  getPendingTransactionActiveAbTests,
  withPendingTransactionActiveAbTests,
} from './transaction-active-ab-test-attribution-registry';

describe('withPendingTransactionActiveAbTests', () => {
  beforeEach(() => {
    clearPendingTransactionActiveAbTests();
  });

  it('exposes pending tests during fn and clears after resolve', async () => {
    const tests = [
      { key: 'homeTMCU470AbtestTrendingSections', value: 'treatment' },
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
});
