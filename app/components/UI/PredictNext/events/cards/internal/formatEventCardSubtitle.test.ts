import type { PredictTimestamp } from '../../../types';
import { formatEventCardSubtitle } from './formatEventCardSubtitle';

const CLOSES_AT = '2028-07-15T12:00:00Z' as PredictTimestamp;

describe('formatEventCardSubtitle', () => {
  it('joins the close date and the volume', () => {
    const result = formatEventCardSubtitle({
      closesAt: CLOSES_AT,
      volume: '4200000',
    });

    expect(result).toBe('Closes Jul 2028 · $4.2M');
  });

  it('shows the close date alone when volume is missing', () => {
    const result = formatEventCardSubtitle({ closesAt: CLOSES_AT });

    expect(result).toBe('Closes Jul 2028');
  });

  it('shows the volume alone when the close date is missing', () => {
    const result = formatEventCardSubtitle({ volume: '890000' });

    expect(result).toBe('$890k');
  });

  it('skips a close date that does not parse', () => {
    const result = formatEventCardSubtitle({
      closesAt: 'not-a-date' as PredictTimestamp,
      volume: '1500000',
    });

    expect(result).toBe('$1.5M');
  });

  it('returns undefined when both parts are missing', () => {
    const result = formatEventCardSubtitle({});

    expect(result).toBeUndefined();
  });
});
