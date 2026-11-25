import type { EarningsPoint } from './earningsHistory';

interface CreateEarningsPointOptions extends Partial<EarningsPoint> {
  available?: boolean;
}

export const createEarningsPoint = ({
  available = true,
  ...overrides
}: CreateEarningsPointOptions = {}): EarningsPoint => ({
  start: '2026-11-09T00:00:00.000Z',
  periodEndExclusive: '2026-11-10T00:00:00.000Z',
  timestamp: '2026-11-09T00:00:00.000Z',
  amountUsd: 1,
  granularity: 'day',
  periodStatus: 'complete',
  availability: {
    earnings: available ? 'available' : 'unavailable',
    usd_pricing: available ? 'available' : 'unavailable',
  },
  unavailableReasons: available ? [] : ['before_user_earnings_inception'],
  ...overrides,
});
