import { formatQuoteCountdown } from './formatQuoteCountdown';

describe('formatQuoteCountdown', () => {
  it('formats sub-minute values as 0:ss', () => {
    expect(formatQuoteCountdown(30)).toBe('0:30');
    expect(formatQuoteCountdown(9)).toBe('0:09');
  });

  it('formats values at or above 60 seconds as m:ss', () => {
    expect(formatQuoteCountdown(90)).toBe('1:30');
    expect(formatQuoteCountdown(65)).toBe('1:05');
  });
});
