import { createMoneyAccountBatchId } from './createMoneyAccountBatchId';

describe('createMoneyAccountBatchId', () => {
  it('returns a 0x-prefixed 16-byte hex string', () => {
    const batchId = createMoneyAccountBatchId();

    expect(batchId).toMatch(/^0x[0-9a-f]{32}$/);
  });

  it('returns a different id on each call', () => {
    const firstBatchId = createMoneyAccountBatchId();
    const secondBatchId = createMoneyAccountBatchId();

    expect(firstBatchId).not.toBe(secondBatchId);
  });
});
