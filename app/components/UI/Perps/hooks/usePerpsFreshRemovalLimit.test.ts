import { act, renderHook } from '@testing-library/react-hooks';
import { useState } from 'react';
import type { Position } from '@metamask/perps-controller';
import { usePerpsFreshRemovalLimit } from './usePerpsFreshRemovalLimit';
import { MARGIN_REMOVAL_FRESH_LIMIT_HOLD_MS } from '../constants/perpsConfig';

const position = {
  symbol: 'ETH',
  size: '2.5',
  entryPrice: '2000',
  marginUsed: '500',
  unrealizedPnl: '100',
  leverage: { value: 10, type: 'isolated' },
} as Position;
const pnlTick = { ...position, unrealizedPnl: '90', marginUsed: '490' };

const renderFreshLimit = (isAddMode = false) => {
  const hook = renderHook(
    ({ livePosition }: { livePosition: Position }) => {
      const [freshMaxAmount, setFreshMaxAmount] = useState<number | null>(null);
      return {
        setFreshMaxAmount,
        ...usePerpsFreshRemovalLimit({
          freshMaxAmount,
          setFreshMaxAmount,
          position: livePosition,
          snapshotMaxAmount: 200,
          exchangeMaxAmount: 250,
          isAddMode,
        }),
      };
    },
    { initialProps: { livePosition: position } },
  );
  act(() => hook.result.current.setFreshMaxAmount(150));
  return hook;
};

describe('usePerpsFreshRemovalLimit', () => {
  it('caps the offered and submit limits at the fresh max', () => {
    const { result } = renderFreshLimit();

    expect(result.current.flooredMaxAmount).toBe(150);
    expect(result.current.submitLimitAmount).toBe(150);
  });

  it('ignores the fresh max in add mode', () => {
    const { result } = renderFreshLimit(true);

    expect(result.current.flooredMaxAmount).toBe(200);
    expect(result.current.submitLimitAmount).toBe(250);
  });

  it('keeps the fresh max through PnL re-deliveries', () => {
    const { result, rerender } = renderFreshLimit();

    rerender({ livePosition: pnlTick });

    expect(result.current.flooredMaxAmount).toBe(150);
  });

  it.each([
    ['size', { size: '2' }],
    ['entry', { entryPrice: '2100' }],
    ['leverage', { leverage: { value: 5, type: 'isolated' } }],
    ['collateral', { marginUsed: '520' }],
  ])('drops the fresh max when the %s changes', (_, change) => {
    const { result, rerender } = renderFreshLimit();

    rerender({ livePosition: { ...pnlTick, ...change } as Position });

    expect(result.current.flooredMaxAmount).toBe(200);
  });

  it('drops the fresh max after the hold window', () => {
    jest.useFakeTimers();
    const { result } = renderFreshLimit();

    act(() => {
      jest.advanceTimersByTime(MARGIN_REMOVAL_FRESH_LIMIT_HOLD_MS);
    });

    expect(result.current.flooredMaxAmount).toBe(200);
    jest.useRealTimers();
  });
});
