import {
  getFundingAmountRange,
  fetchImportedWalletFundingAmountRange,
} from './fundingAmountRange';

jest.mock('../Logger', () => ({ log: jest.fn(), error: jest.fn() }));

describe('getFundingAmountRange', () => {
  it.each([
    [0, '< 0.01'],
    [-1, '< 0.01'],
    [0.009, '< 0.01'],
    [0.01, '0.01 - 9.99'],
    [9.99, '0.01 - 9.99'],
    [10, '10.00 - 99.99'],
    [99.99, '10.00 - 99.99'],
    [100, '100.00 - 999.99'],
    [999.99, '100.00 - 999.99'],
    [1000, '1000.00 - 9999.99'],
    [9999.99, '1000.00 - 9999.99'],
    [10000, '10000.00+'],
    [1000000, '10000.00+'],
  ])('buckets %s into %s', (amount, expectedRange) => {
    expect(getFundingAmountRange(amount as number)).toBe(expectedRange);
  });
});

describe('fetchImportedWalletFundingAmountRange', () => {
  it('always resolves undefined', async () => {
    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
  });
});
