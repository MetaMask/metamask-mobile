import { renderHook } from '@testing-library/react-native';

import Routes from '../../constants/navigation/Routes';
import { useIsQrTabSwitcherOpen } from './useIsQrTabSwitcherOpen';

const createNavigationMock = (
  routeNamesByNavigator: string[][],
): {
  getState: jest.Mock;
  getParent: jest.Mock;
  addListener: jest.Mock;
} => {
  const navigators = routeNamesByNavigator.map((routeNames) => ({
    getState: jest.fn(() => ({
      routes: routeNames.map((name) => ({ name })),
    })),
    getParent: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  }));

  navigators.forEach((navigator, index) => {
    navigator.getParent.mockReturnValue(
      index < navigators.length - 1 ? navigators[index + 1] : undefined,
    );
  });

  return navigators[0];
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

import { useNavigation } from '@react-navigation/native';

const mockUseNavigation = jest.mocked(useNavigation);

describe('useIsQrTabSwitcherOpen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when no navigator in the hierarchy has QR_TAB_SWITCHER', () => {
    mockUseNavigation.mockReturnValue(
      createNavigationMock([
        [Routes.ONBOARDING.ADD_DEVICE_TO_WALLET],
        ['OnboardingNav'],
      ]) as never,
    );

    const { result } = renderHook(() => useIsQrTabSwitcherOpen());

    expect(result.current).toBe(false);
  });

  it('returns true when a parent navigator has QR_TAB_SWITCHER', () => {
    mockUseNavigation.mockReturnValue(
      createNavigationMock([
        [Routes.ONBOARDING.ADD_DEVICE_TO_WALLET],
        ['OnboardingNav', Routes.QR_TAB_SWITCHER],
      ]) as never,
    );

    const { result } = renderHook(() => useIsQrTabSwitcherOpen());

    expect(result.current).toBe(true);
  });

  it('returns true when the current navigator has QR_TAB_SWITCHER', () => {
    mockUseNavigation.mockReturnValue(
      createNavigationMock([[Routes.QR_TAB_SWITCHER]]) as never,
    );

    const { result } = renderHook(() => useIsQrTabSwitcherOpen());

    expect(result.current).toBe(true);
  });
});
