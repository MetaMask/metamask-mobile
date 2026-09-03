import { act, renderHook } from '@testing-library/react-native';

import Routes from '../../constants/navigation/Routes';
import { useIsQrTabSwitcherOpen } from './useIsQrTabSwitcherOpen';

interface NavigationMock {
  getState: jest.Mock;
  getParent: jest.Mock;
  addListener: jest.Mock;
  routeNames: string[];
}

const createNavigationHierarchy = (
  routeNamesByNavigator: string[][],
): { navigation: NavigationMock; navigators: NavigationMock[] } => {
  const navigators: NavigationMock[] = routeNamesByNavigator.map(
    (routeNames) => ({
      routeNames,
      getState: jest.fn(() => ({
        routes: routeNames.map((name) => ({ name })),
      })),
      getParent: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
  );

  navigators.forEach((navigator, index) => {
    navigator.getParent.mockReturnValue(
      index < navigators.length - 1 ? navigators[index + 1] : undefined,
    );
  });

  return { navigation: navigators[0], navigators };
};

const createNavigationMock = (
  routeNamesByNavigator: string[][],
): NavigationMock =>
  createNavigationHierarchy(routeNamesByNavigator).navigation;

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

  it('subscribes to state changes on ancestor navigators', () => {
    const { navigation, navigators } = createNavigationHierarchy([
      [Routes.ONBOARDING.ADD_DEVICE_TO_WALLET],
      ['OnboardingNav'],
      ['OnboardingRootNav'],
    ]);
    const parentNavigator = navigators[1];

    mockUseNavigation.mockReturnValue(navigation as never);

    const { result } = renderHook(() => useIsQrTabSwitcherOpen());

    expect(result.current).toBe(false);
    expect(navigation.addListener).toHaveBeenCalledWith(
      'state',
      expect.any(Function),
    );
    expect(parentNavigator.addListener).toHaveBeenCalledWith(
      'state',
      expect.any(Function),
    );

    parentNavigator.routeNames.push(Routes.QR_TAB_SWITCHER);
    parentNavigator.getState.mockImplementation(() => ({
      routes: parentNavigator.routeNames.map((name) => ({ name })),
    }));

    const parentStateListener = parentNavigator.addListener.mock.calls.find(
      ([event]) => event === 'state',
    )?.[1] as (() => void) | undefined;

    act(() => {
      parentStateListener?.();
    });

    expect(result.current).toBe(true);
  });
});
