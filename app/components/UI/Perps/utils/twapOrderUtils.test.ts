import type { TwapOrder, TwapOrderFill } from '@metamask/perps-controller';
import {
  getTwapDirectionLabelKey,
  getTwapOrderIdentityKey,
  reconcileTwapOrderExecution,
} from './twapOrderUtils';

const buildIdentity = (
  overrides: Partial<Pick<TwapOrder, 'orderId' | 'providerId'>> = {},
) => ({
  orderId: 'twap-1',
  ...overrides,
});

describe('getTwapOrderIdentityKey', () => {
  it('includes the venue so aggregated order IDs cannot collide', () => {
    expect(
      getTwapOrderIdentityKey(
        buildIdentity({ providerId: 'lighter', orderId: 'shared' }),
      ),
    ).toBe('lighter:shared');
  });

  it('uses the default venue for legacy rows without a provider ID', () => {
    expect(getTwapOrderIdentityKey(buildIdentity())).toBe('hyperliquid:twap-1');
  });
});

describe('getTwapDirectionLabelKey', () => {
  it.each([
    [{ side: 'buy', reduceOnly: false }, 'perps.market.long'],
    [{ side: 'sell', reduceOnly: false }, 'perps.market.short'],
    [{ side: 'buy', reduceOnly: true }, 'perps.market.close_short'],
    [{ side: 'sell', reduceOnly: true }, 'perps.market.close_long'],
  ] as const)('maps %o to %s', (twapOrder, expected) => {
    expect(getTwapDirectionLabelKey(twapOrder)).toBe(expected);
  });
});

const buildFill = (overrides: Partial<TwapOrderFill> = {}): TwapOrderFill => ({
  fillId: 'fill-1',
  orderId: 'child-1',
  side: 'buy',
  price: '80000',
  size: '0.0001',
  fee: '0.004',
  feeToken: 'USDC',
  timestamp: 1_700_000_000_000,
  transactionHash: '0xabc',
  ...overrides,
});

const buildTwapOrder = (overrides: Partial<TwapOrder> = {}): TwapOrder => ({
  orderId: 'twap-1',
  symbol: 'BTC',
  side: 'buy',
  size: '0.001',
  executedSize: '0',
  remainingSize: '0.001',
  executedNotional: '0.0',
  fillProgressBps: 0,
  timeProgressBps: 100,
  elapsedTimeMilliseconds: 18_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_700_000_000_000,
  lastUpdated: 1_700_000_000_000,
  fills: [],
  ...overrides,
});

describe('reconcileTwapOrderExecution', () => {
  it('rebuilds the execution totals a running schedule reports from its slice fills', () => {
    const twapOrder = buildTwapOrder({
      fills: [
        buildFill({ fillId: 'fill-1', size: '0.0001', price: '80000' }),
        buildFill({ fillId: 'fill-2', size: '0.0001', price: '82000' }),
      ],
    });

    const reconciled = reconcileTwapOrderExecution(twapOrder);

    expect(reconciled.executedSize).toBe('0.0002');
    expect(reconciled.remainingSize).toBe('0.0008');
    expect(reconciled.executedNotional).toBe('16.2');
    expect(reconciled.averagePrice).toBe('81000');
    expect(reconciled.fillProgressBps).toBe(2000);
  });

  it('follows a new slice fill on an otherwise unchanged schedule', () => {
    const twapOrder = buildTwapOrder({
      fills: [buildFill({ fillId: 'fill-1', size: '0.0001', price: '80000' })],
    });

    const firstRead = reconcileTwapOrderExecution(twapOrder);
    const secondRead = reconcileTwapOrderExecution({
      ...twapOrder,
      fills: [
        ...twapOrder.fills,
        buildFill({ fillId: 'fill-2', size: '0.0003', price: '80000' }),
      ],
    });

    expect(firstRead.executedSize).toBe('0.0001');
    expect(firstRead.fillProgressBps).toBe(1000);
    expect(secondRead.executedSize).toBe('0.0004');
    expect(secondRead.fillProgressBps).toBe(4000);
  });

  it('keeps a venue total that is ahead of the fills in hand', () => {
    const twapOrder = buildTwapOrder({
      executedSize: '0.0009',
      remainingSize: '0.0001',
      executedNotional: '72.9',
      averagePrice: '81000',
      fillProgressBps: 9000,
      fills: [buildFill({ size: '0.0001', price: '80000' })],
    });

    const reconciled = reconcileTwapOrderExecution(twapOrder);

    expect(reconciled).toBe(twapOrder);
  });

  it('leaves a schedule with no slice fills untouched', () => {
    const twapOrder = buildTwapOrder();

    expect(reconcileTwapOrderExecution(twapOrder)).toBe(twapOrder);
  });

  it('caps the reported execution at the scheduled size', () => {
    const twapOrder = buildTwapOrder({
      size: '0.0002',
      fills: [
        buildFill({ fillId: 'fill-1', size: '0.0002', price: '80000' }),
        buildFill({ fillId: 'fill-2', size: '0.0001', price: '80000' }),
      ],
    });

    const reconciled = reconcileTwapOrderExecution(twapOrder);

    expect(reconciled.executedSize).toBe('0.0002');
    expect(reconciled.remainingSize).toBe('0');
    expect(reconciled.executedNotional).toBe('16');
    expect(reconciled.averagePrice).toBe('80000');
    expect(reconciled.fillProgressBps).toBe(10000);
  });

  it('is unchanged by a second pass over an already reconciled schedule', () => {
    const twapOrder = buildTwapOrder({
      fills: [buildFill({ size: '0.0005', price: '80000' })],
    });

    const reconciled = reconcileTwapOrderExecution(twapOrder);

    expect(reconcileTwapOrderExecution(reconciled)).toStrictEqual(reconciled);
  });

  it('counts the fills when the venue reports a non-numeric executed size', () => {
    const twapOrder = buildTwapOrder({
      executedSize: '',
      fills: [buildFill({ size: '0.0005', price: '80000' })],
    });

    const reconciled = reconcileTwapOrderExecution(twapOrder);

    expect(reconciled.executedSize).toBe('0.0005');
    expect(reconciled.averagePrice).toBe('80000');
  });
});
