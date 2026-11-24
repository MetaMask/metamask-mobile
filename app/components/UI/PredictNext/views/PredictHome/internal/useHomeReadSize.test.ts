import { act, renderHook } from '@testing-library/react-native';
import {
  useNetworkTierState,
  type NetworkTierState,
} from '../../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { NETWORK_TIER_GRACE_MS, useHomeReadSize } from './useHomeReadSize';

jest.mock('../../../../../../hooks/useNetworkTier', () => ({
  useNetworkTierState: jest.fn(),
}));
jest.mock('../../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

const UNRESOLVED: NetworkTierState = { tier: null, isResolved: false };
const SLOW_CELLULAR: NetworkTierState = {
  tier: 'SLOW_CELLULAR',
  isResolved: true,
};
const WIFI: NetworkTierState = { tier: 'WIFI', isResolved: true };

const renderReadSize = (canRead = true) =>
  renderHook(({ canRead: ready }) => useHomeReadSize(ready), {
    initialProps: { canRead },
  });

describe('useHomeReadSize', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(getHardwareTier).mockReturnValue('HIGH');
    jest.mocked(useNetworkTierState).mockReturnValue(UNRESOLVED);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('decides at once from a network tier NetInfo already knows', () => {
    jest.mocked(useNetworkTierState).mockReturnValue(SLOW_CELLULAR);

    expect(renderReadSize().result.current).toBe(true);
  });

  it('waits for NetInfo to answer within the grace period', () => {
    const { result, rerender } = renderReadSize();
    expect(result.current).toBeUndefined();

    act(() => jest.advanceTimersByTime(NETWORK_TIER_GRACE_MS - 1));
    expect(result.current).toBeUndefined();

    jest.mocked(useNetworkTierState).mockReturnValue(SLOW_CELLULAR);
    rerender({ canRead: true });

    expect(result.current).toBe(true);
  });

  it('falls back to the product default when NetInfo has not answered by the end of the grace period', () => {
    const { result } = renderReadSize();

    act(() => jest.advanceTimersByTime(NETWORK_TIER_GRACE_MS));

    expect(result.current).toBe(false);
  });

  it('starts the grace period only once Home can read', () => {
    const { result, rerender } = renderReadSize(false);

    act(() => jest.advanceTimersByTime(NETWORK_TIER_GRACE_MS * 4));
    expect(result.current).toBeUndefined();

    rerender({ canRead: true });
    act(() => jest.advanceTimersByTime(NETWORK_TIER_GRACE_MS));

    expect(result.current).toBe(false);
  });

  it('keeps low-end hardware constrained when NetInfo never answers', () => {
    jest.mocked(getHardwareTier).mockReturnValue('LOW');
    const { result } = renderReadSize();

    act(() => jest.advanceTimersByTime(NETWORK_TIER_GRACE_MS));

    expect(result.current).toBe(true);
  });

  it('keeps the first decision when the network tier changes later', () => {
    jest.mocked(useNetworkTierState).mockReturnValue(WIFI);
    const { result, rerender } = renderReadSize();
    expect(result.current).toBe(false);

    jest.mocked(useNetworkTierState).mockReturnValue(SLOW_CELLULAR);
    rerender({ canRead: true });

    expect(result.current).toBe(false);
  });

  it('leaves no timer running once decided', () => {
    jest.mocked(useNetworkTierState).mockReturnValue(WIFI);
    renderReadSize();

    expect(jest.getTimerCount()).toBe(0);
  });
});
