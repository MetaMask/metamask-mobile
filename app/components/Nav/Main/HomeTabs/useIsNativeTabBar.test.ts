import { renderHook } from '@testing-library/react-native';

import { useIsNativeTabBar } from './useIsNativeTabBar';

let mockIsCompactHeaderEnabled = true;
jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: () => ({
    variant: {
      isCompactHeaderEnabled: mockIsCompactHeaderEnabled,
      trailingNavBarAction: mockIsCompactHeaderEnabled ? 'search' : 'none',
      isHeaderSearchEnabled: false,
    },
    variantName: mockIsCompactHeaderEnabled ? 'searchFocused' : 'control',
    isActive: true,
  }),
}));

let mockIsFlagEnabled = true;
jest.mock('react-redux', () => ({
  useSelector: () => mockIsFlagEnabled,
}));

const mockIsNativeTabBarSupported = jest.fn();
jest.mock('./homeTabs.mappers', () => ({
  isNativeTabBarSupported: () => mockIsNativeTabBarSupported(),
}));

describe('useIsNativeTabBar', () => {
  beforeEach(() => {
    mockIsCompactHeaderEnabled = true;
    mockIsFlagEnabled = true;
    mockIsNativeTabBarSupported.mockReturnValue(true);
  });

  it('is on for the refreshed nav bar arms on a supported OS', () => {
    const { result } = renderHook(() => useIsNativeTabBar());

    expect(result.current).toBe(true);
  });

  it('keeps the control arm on the JS bar', () => {
    mockIsCompactHeaderEnabled = false;

    const { result } = renderHook(() => useIsNativeTabBar());

    expect(result.current).toBe(false);
  });

  it('respects the remote kill switch', () => {
    mockIsFlagEnabled = false;

    const { result } = renderHook(() => useIsNativeTabBar());

    expect(result.current).toBe(false);
  });

  it('is off where UIKit cannot draw the bar', () => {
    mockIsNativeTabBarSupported.mockReturnValue(false);

    const { result } = renderHook(() => useIsNativeTabBar());

    expect(result.current).toBe(false);
  });
});
