import {
  deriveBreakdownErrorSource,
  musdMinimumAmount,
} from './earningsSummarySection';

describe('deriveBreakdownErrorSource', () => {
  it('reports the summary when both fetches failed', () => {
    expect(deriveBreakdownErrorSource(true, true)).toBe('summary');
  });

  it('reports the funnel when only the funnel failed', () => {
    expect(deriveBreakdownErrorSource(false, true)).toBe('funnel');
  });

  it('reports nothing when neither failed', () => {
    expect(deriveBreakdownErrorSource(false, false)).toBeNull();
  });
});

describe('musdMinimumAmount', () => {
  it('formats a whole-dollar minimum with no fraction digits', () => {
    expect(musdMinimumAmount('1000000')).toBe('$1');
  });

  it('returns undefined when the minimum is missing', () => {
    expect(musdMinimumAmount(undefined)).toBeUndefined();
    expect(musdMinimumAmount(null)).toBeUndefined();
    expect(musdMinimumAmount('')).toBeUndefined();
  });

  it('returns undefined when the minimum is unreadable', () => {
    expect(musdMinimumAmount('not-a-number')).toBeUndefined();
  });
});
