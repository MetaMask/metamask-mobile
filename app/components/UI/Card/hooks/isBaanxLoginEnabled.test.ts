import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockFeatureFlagValue = (value: boolean | null | undefined) => {
  mockUseSelector.mockReturnValue(value);
};

describe('useIsBaanxLoginEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when feature flag is null', () => {
    mockFeatureFlagValue(null);

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when feature flag is undefined', () => {
    mockFeatureFlagValue(undefined);

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);
  });

  it('returns true when feature flag is enabled', () => {
    mockFeatureFlagValue(true);

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(true);
  });

  it('returns false when feature flag is disabled', () => {
    mockFeatureFlagValue(false);

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);
  });

  it('updates when feature flag value changes', () => {
    mockFeatureFlagValue(false);
    const { result, rerender } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);

    mockFeatureFlagValue(true);
    rerender();

    expect(result.current).toBe(true);
  });
});
