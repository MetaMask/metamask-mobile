import { adaptOrderFromLighter } from '@metamask/perps-controller/utils/lighterAdapter';

type LighterOrder = Parameters<typeof adaptOrderFromLighter>[0];

const createOrder = (overrides: Partial<LighterOrder> = {}): LighterOrder => ({
  orderIndex: 123,
  clientOrderIndex: 456,
  marketIndex: 4096,
  ownerAccountIndex: 1,
  initialBaseAmount: '0.00029',
  remainingBaseAmount: '0.00000',
  price: '70000.0',
  isAsk: false,
  type: 'limit',
  timeInForce: 'good-till-time',
  reduceOnly: false,
  status: 'canceled',
  orderExpiry: 0,
  timestamp: 1789951987,
  ...overrides,
});

// Exercise the installed controller to guard the upstream fix for the
// regression observed in the Lighter testnet cancellation proof.
describe('Lighter order normalization', () => {
  it.each([
    ['canceled', '0.00000', '0'],
    ['canceled', '0.00010', '0.0001'],
    ['filled', '0.00029', '0.00029'],
  ])(
    'uses the venue filled amount for a %s order with %s filled',
    (status, filledBaseAmount, expectedFilledSize) => {
      const order = createOrder({ status, filledBaseAmount });

      const result = adaptOrderFromLighter(order, 'BTC');

      expect(result.filledSize).toBe(expectedFilledSize);
      expect(result.status).toBe(status);
      expect(result.providerId).toBe('lighter');
    },
  );

  it('preserves the explicit filled amount for an active partial order', () => {
    const order = createOrder({
      status: 'open',
      filledBaseAmount: '0.00010',
      remainingBaseAmount: '0.00019',
    });

    const result = adaptOrderFromLighter(order, 'BTC');

    expect(result.filledSize).toBe('0.0001');
    expect(result.remainingSize).toBe('0.00019');
  });

  it('retains the size-difference fallback when the venue omits filled amount', () => {
    const order = createOrder({
      status: 'open',
      initialBaseAmount: '1',
      remainingBaseAmount: '0.75',
    });

    const result = adaptOrderFromLighter(order, 'BTC');

    expect(result.filledSize).toBe('0.25');
  });
});
