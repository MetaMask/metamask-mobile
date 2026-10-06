import { renderHook } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useNetworkTier } from './useNetworkTier';

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

const mockUseNetInfo = jest.mocked(useNetInfo);

const mockNetInfoState = (state: {
  type: string;
  isInternetReachable: boolean | null;
  details: Record<string, unknown>;
}) => {
  mockUseNetInfo.mockReturnValue(
    state as unknown as ReturnType<typeof useNetInfo>,
  );
};

describe('useNetworkTier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns WIFI for mocked wifi NetInfo', () => {
    mockNetInfoState({
      type: 'wifi',
      isInternetReachable: true,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('WIFI');
  });

  it('returns FAST_CELLULAR for mocked cellular 5g NetInfo', () => {
    mockNetInfoState({
      type: 'cellular',
      isInternetReachable: true,
      details: { cellularGeneration: '5g' },
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('FAST_CELLULAR');
  });

  it('returns SLOW_CELLULAR for mocked cellular 3g NetInfo', () => {
    mockNetInfoState({
      type: 'cellular',
      isInternetReachable: true,
      details: { cellularGeneration: '3g' },
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('SLOW_CELLULAR');
  });

  it('returns NONE for mocked none NetInfo', () => {
    mockNetInfoState({
      type: 'none',
      isInternetReachable: false,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('NONE');
  });

  it('returns null for mocked unknown NetInfo', () => {
    mockNetInfoState({
      type: 'unknown',
      isInternetReachable: null,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBeNull();
  });

  it('returns NONE for wifi when internet is not reachable', () => {
    mockNetInfoState({
      type: 'wifi',
      isInternetReachable: false,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('NONE');
  });
});
