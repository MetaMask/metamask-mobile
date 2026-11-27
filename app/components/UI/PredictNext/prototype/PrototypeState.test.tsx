import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  PrototypeStateProvider,
  usePrototypeState,
  type ProtoOrderIntent,
} from './PrototypeState';
import { formatUsd, quoteOrder } from './fixtures';
import { formatCryptoPrice } from './simulation';

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

const intent: ProtoOrderIntent = {
  eventId: 'phi-ind',
  eventTitle: '76ers vs. Pacers',
  marketTitle: '76ers to win',
  selected: { outcomeId: 'ml-away', label: '76ers', price: 50, color: 'blue' },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PrototypeStateProvider>{children}</PrototypeStateProvider>
);

describe('PrototypeState', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('routes a signed-out order through get started, then reopens it after connecting', () => {
    const { result } = renderHook(() => usePrototypeState(), { wrapper });

    act(() => result.current.openOrder(intent));
    expect(result.current.orderIntent).toBeNull();
    expect(result.current.isGetStartedVisible).toBe(true);

    act(() => result.current.finishConnect());
    act(() => jest.runOnlyPendingTimers());

    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.balance).toBe(100);
    expect(result.current.orderIntent).toEqual(intent);
  });

  it('turns a buy into a position and a cash out back into balance', () => {
    const { result } = renderHook(() => usePrototypeState(), { wrapper });
    act(() => result.current.finishConnect());

    act(() => result.current.placeOrder(intent, 20));
    expect(result.current.balance).toBe(80);
    expect(result.current.positions[0]).toMatchObject({
      contracts: 40,
      avgPrice: 50,
    });

    let proceeds = 0;
    act(() => {
      proceeds = result.current.cashOut(result.current.positions[0].id, 1);
    });
    expect(proceeds).toBe(20);
    expect(result.current.positions).toHaveLength(0);
    expect(result.current.balance).toBe(100);
  });
});

describe('formatUsd', () => {
  it('rounds float noise to cents', () => {
    expect(formatUsd(0.1 + 0.2 + 0.17)).toBe('$0.47');
    expect(formatUsd(-12.5)).toBe('-$12.50');
    expect(formatUsd(1234)).toBe('$1,234.00');
    expect(formatCryptoPrice(76336.66718444147)).toBe('$76,336.67');
  });
});

describe('quoteOrder', () => {
  it('prices whole contracts with a Kalshi-style fee', () => {
    expect(quoteOrder(100, 53)).toEqual({
      contracts: 188,
      fee: 3.28,
      cost: 96.72,
      payout: 188,
    });
  });
});
