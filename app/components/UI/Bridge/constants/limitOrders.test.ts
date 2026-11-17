import { getSwapsLimitOrderExpirationLabel } from './limitOrders';

describe('getSwapsLimitOrderExpirationLabel', () => {
  it.each([
    { minutes: 10, label: '10 minutes' },
    { minutes: 60, label: '1 hour' },
    { minutes: 1440, label: '1 day' },
    { minutes: 4320, label: '3 days' },
    { minutes: 10080, label: '1 week' },
    { minutes: 43200, label: '1 month' },
  ] as const)(
    'returns "$label" when expiration is $minutes minutes',
    ({ minutes, label }) => {
      expect(getSwapsLimitOrderExpirationLabel(minutes)).toBe(label);
    },
  );
});
