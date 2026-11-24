import { act, renderHook } from '@testing-library/react-native';
import type { MarginAdjustmentLimits } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { MARGIN_LIMITS_MAX_RETRIES } from '../constants/perpsConfig';
import { usePerpsMarginAdjustmentLimits } from './usePerpsMarginAdjustmentLimits';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: { PerpsController: {} } },
}));
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

const mockGetLimits = jest.fn<Promise<MarginAdjustmentLimits>, [unknown]>();
const limits: MarginAdjustmentLimits = {
  status: 'available',
  maxAdd: '315.35',
  maxRemove: '12.5',
};
const props = {
  symbol: 'BTC',
  providerId: 'hyperliquid' as const,
  contextKey: '0xa|testnet',
  positionKey: '1|50000|10|500.00',
  settledBalance: 1000 as number | undefined,
  priceTick: 1 as number | undefined,
  enabled: true,
};
const render = (overrides: Partial<typeof props> = {}) =>
  renderHook((hookProps) => usePerpsMarginAdjustmentLimits(hookProps), {
    initialProps: { ...props, ...overrides },
  });
const flush = async () => act(async () => undefined);

describe('usePerpsMarginAdjustmentLimits', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetLimits.mockReset().mockResolvedValue(limits);
    Object.assign(Engine.context.PerpsController, {
      getMarginAdjustmentLimits: mockGetLimits,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reads the limits for the position when the form opens', async () => {
    const { result } = render();
    expect(result.current).toBeUndefined();

    await flush();

    expect(mockGetLimits).toHaveBeenCalledTimes(1);
    expect(mockGetLimits).toHaveBeenCalledWith({
      symbol: 'BTC',
      providerId: 'hyperliquid',
    });
    expect(result.current).toEqual(limits);
  });

  it('does not read again for renders or balance noise, only for real changes', async () => {
    const { rerender } = render();
    await flush();

    rerender({ ...props, settledBalance: 1000.4 });
    rerender({ ...props, settledBalance: 999.7 });
    await flush();
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockGetLimits).toHaveBeenCalledTimes(1);

    // A deposit.
    rerender({ ...props, settledBalance: 1050 });
    await flush();
    expect(mockGetLimits).toHaveBeenCalledTimes(2);

    // A margin change.
    rerender({
      ...props,
      settledBalance: 1050,
      positionKey: '1|50000|10|550.00',
    });
    await flush();
    expect(mockGetLimits).toHaveBeenCalledTimes(3);
  });

  it('drops the limits of another account', async () => {
    const { result, rerender } = render();
    await flush();
    mockGetLimits.mockReturnValue(new Promise(() => undefined));

    rerender({ ...props, contextKey: '0xb|testnet' });

    expect(result.current).toBeUndefined();
  });

  it('retries an unknown account on price frames only, a bounded number of times', async () => {
    mockGetLimits.mockResolvedValue({
      status: 'unavailable',
      reason: 'account_unknown',
    });
    const { rerender } = render();
    await flush();
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockGetLimits).toHaveBeenCalledTimes(1);

    for (let tick = 2; tick < MARGIN_LIMITS_MAX_RETRIES + 6; tick += 1) {
      rerender({ ...props, priceTick: tick });
      await flush();
    }

    expect(mockGetLimits).toHaveBeenCalledTimes(MARGIN_LIMITS_MAX_RETRIES + 1);

    // A new position state starts over.
    rerender({ ...props, priceTick: 99, positionKey: 'changed' });
    await flush();
    expect(mockGetLimits).toHaveBeenCalledTimes(MARGIN_LIMITS_MAX_RETRIES + 2);
  });

  it('does not retry a provider without limits', async () => {
    mockGetLimits.mockResolvedValue({
      status: 'unavailable',
      reason: 'provider',
    });
    const { result, rerender } = render();
    await flush();
    rerender({ ...props, priceTick: 2 });
    rerender({ ...props, priceTick: 3 });
    await flush();

    expect(mockGetLimits).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      status: 'unavailable',
      reason: 'provider',
    });
  });

  it('reads nothing while disabled', async () => {
    const { result } = render({ enabled: false });
    await flush();

    expect(mockGetLimits).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });
});
