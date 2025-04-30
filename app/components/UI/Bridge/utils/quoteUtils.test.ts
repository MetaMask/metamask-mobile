import { shouldRefreshQuote } from './quoteUtils';

describe('shouldRefreshQuote', () => {
  it('returns false when isSubmittingTx is true', () => {
    const result = shouldRefreshQuote(
      false, // insufficientBal
      0, // quotesRefreshCount
      5, // maxRefreshCount
      true, // isSubmittingTx
    );
    expect(result).toBe(false);
  });

  it('returns false when insufficientBal is true', () => {
    const result = shouldRefreshQuote(
      true, // insufficientBal
      0, // quotesRefreshCount
      5, // maxRefreshCount
      false, // isSubmittingTx
    );
    expect(result).toBe(false);
  });

  it('returns true when under max refresh count and no blocking conditions', () => {
    const result = shouldRefreshQuote(
      false, // insufficientBal
      2, // quotesRefreshCount
      5, // maxRefreshCount
      false, // isSubmittingTx
    );
    expect(result).toBe(true);
  });

  it('returns false when at max refresh count', () => {
    const result = shouldRefreshQuote(
      false, // insufficientBal
      5, // quotesRefreshCount
      5, // maxRefreshCount
      false, // isSubmittingTx
    );
    expect(result).toBe(false);
  });

  it('returns false when over max refresh count', () => {
    const result = shouldRefreshQuote(
      false, // insufficientBal
      6, // quotesRefreshCount
      5, // maxRefreshCount
      false, // isSubmittingTx
    );
    expect(result).toBe(false);
  });
});
