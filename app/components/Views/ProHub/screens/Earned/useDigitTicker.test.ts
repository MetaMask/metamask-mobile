import {
  buildDigitTickerFrames,
  getDigitIndexes,
  zeroDigits,
} from './useDigitTicker';

describe('zeroDigits', () => {
  it('replaces digits and keeps currency formatting', () => {
    expect(zeroDigits('$770.12')).toBe('$000.00');
  });
});

describe('getDigitIndexes', () => {
  it('returns only digit character indexes', () => {
    expect(getDigitIndexes('$770.12')).toEqual([1, 2, 3, 5, 6]);
  });
});

describe('buildDigitTickerFrames', () => {
  it('starts from zeroed digits and ends at the final value', () => {
    const frames = buildDigitTickerFrames('$12');

    expect(frames[0]).toBe('$00');
    expect(frames[frames.length - 1]).toBe('$12');
  });

  it('changes one digit place at a time from left to right', () => {
    const frames = buildDigitTickerFrames('$12');

    expect(frames).toEqual(['$00', '$10', '$11', '$12']);
  });

  it('skips counting when a digit target is already zero', () => {
    const frames = buildDigitTickerFrames('$10');

    expect(frames).toEqual(['$00', '$10']);
  });
});
