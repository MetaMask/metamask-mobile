import type { PercentChangeAlert } from './constants';
import { formatPercentAlertSubtitle, formatPercentAlertTitle } from './utils';

const makePercentAlert = (
  overrides: Partial<PercentChangeAlert> = {},
): PercentChangeAlert => ({
  id: 'percent-alert-1',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  type: 'percent_change',
  threshold: 10,
  period: '24h',
  direction: 'up',
  recurring: true,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

describe('price alert formatting', () => {
  it.each([
    ['up', 'Moves up 10.5%'],
    ['down', 'Moves down 10.5%'],
  ] as const)('formats the %s direction title', (direction, expected) => {
    const alert = makePercentAlert({ direction, threshold: 10.5 });

    const result = formatPercentAlertTitle(alert);

    expect(result).toBe(expected);
  });

  it('removes trailing decimal zeros from percent titles', () => {
    const alert = makePercentAlert({ threshold: 10 });

    const result = formatPercentAlertTitle(alert);

    expect(result).toBe('Moves up 10%');
  });

  it.each([
    ['1h', true, '1h • Recurring'],
    ['1h', false, '1h • Once'],
    ['24h', true, '24h • Recurring'],
    ['24h', false, '24h • Once'],
  ] as const)(
    'formats the %s period when recurring is %s',
    (period, recurring, expected) => {
      const alert = makePercentAlert({ period, recurring });

      const result = formatPercentAlertSubtitle(alert);

      expect(result).toBe(expected);
    },
  );
});
