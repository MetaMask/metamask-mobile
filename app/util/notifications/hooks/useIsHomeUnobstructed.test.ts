import { act, renderHook } from '@testing-library/react-native';
import type { NavigationState } from '@react-navigation/native';
import { NAVIGATION_CHILDREN_ROUTE } from '../../../components/Nav/NavigationProvider/constants';
import Routes from '../../../constants/navigation/Routes';
import {
  isHomeUnobstructedState,
  useIsHomeUnobstructed,
} from './useIsHomeUnobstructed';

const mockGetState = jest.fn();
const mockAddListener = jest.fn();
const mockUnsubscribe = jest.fn();
const mockNavigation = {
  getState: (...args: unknown[]) => mockGetState(...args),
  addListener: (...args: unknown[]) => mockAddListener(...args),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

// Each helper builds the state shape React Navigation produces. Stacks hold
// one route unless a test pushes more; tab navigators keep every tab.
const toState = (value: unknown) => value as NavigationState;

const stack = (
  routes: { name: string; state?: NavigationState }[],
): NavigationState =>
  toState({
    index: routes.length - 1,
    routes: routes.map((route, i) => ({ key: `${route.name}-${i}`, ...route })),
  });

const tabs = (focusedName: string, state?: NavigationState): NavigationState =>
  toState({
    index: 1,
    routes: [
      { key: 'other-tab', name: 'OtherTab' },
      { key: `${focusedName}-tab`, name: focusedName, state },
    ],
  });

const walletTab = (
  walletStack: NavigationState = stack([{ name: Routes.WALLET_VIEW }]),
) => tabs(Routes.WALLET.HOME, walletStack);

/** The root stack with home focused and `homeTabsState` as the tab bar. */
const homeRoot = (tabsState: NavigationState): NavigationState =>
  stack([
    {
      name: Routes.ONBOARDING.HOME_NAV,
      state: stack([{ name: Routes.HOME_TABS, state: tabsState }]),
    },
  ]);

const wrapped = (appState: NavigationState): NavigationState =>
  stack([{ name: NAVIGATION_CHILDREN_ROUTE, state: appState }]);

/** Home, then a modal flow as the focused root route. */
const homeWithModal = (modalStack: NavigationState): NavigationState =>
  stack([
    {
      name: Routes.ONBOARDING.HOME_NAV,
      state: stack([{ name: Routes.HOME_TABS, state: walletTab() }]),
    },
    {
      name: Routes.MODAL.ROOT_MODAL_FLOW,
      state: modalStack,
    },
  ]);

/** A screen pushed above the home tabs, inside the main stack. */
const homeWithPushed = (routeName: string): NavigationState =>
  stack([
    {
      name: Routes.ONBOARDING.HOME_NAV,
      state: stack([
        { name: Routes.HOME_TABS, state: walletTab() },
        { name: routeName },
      ]),
    },
  ]);

describe('isHomeUnobstructedState', () => {
  it('is true on the wallet home with nothing presented over it', () => {
    expect(isHomeUnobstructedState(homeRoot(walletTab()))).toBe(true);
  });

  it('is true on the wallet home under the NavigationChildren wrapper', () => {
    expect(isHomeUnobstructedState(wrapped(homeRoot(walletTab())))).toBe(true);
  });

  it('is true on another tab with nothing pushed onto it', () => {
    const moneyTab = tabs(Routes.MONEY.HOME, stack([{ name: 'MoneyView' }]));

    expect(isHomeUnobstructedState(homeRoot(moneyTab))).toBe(true);
  });

  it.each([
    ['plain', (state: NavigationState) => state],
    ['NavigationChildren', wrapped],
  ] as const)(
    'is false while the trade tray is open over home (%s)',
    (_placement, place) => {
      const root = homeWithModal(
        stack([{ name: Routes.MODAL.TRADE_WALLET_ACTIONS }]),
      );

      expect(isHomeUnobstructedState(place(root))).toBe(false);
    },
  );

  it('is false while the trade tab is the focused tab', () => {
    const tradeTab = tabs(
      Routes.MODAL.TRADE_WALLET_ACTIONS,
      stack([{ name: 'WalletView' }]),
    );

    expect(isHomeUnobstructedState(homeRoot(tradeTab))).toBe(false);
  });

  it('is false when a screen is pushed onto the wallet tab', () => {
    const pushed = stack([
      { name: Routes.WALLET_VIEW },
      { name: 'RevealPrivateCredential' },
    ]);

    expect(isHomeUnobstructedState(homeRoot(walletTab(pushed)))).toBe(false);
  });

  it.each([
    ['plain', (state: NavigationState) => state],
    ['NavigationChildren', wrapped],
  ] as const)(
    'is false when a screen is pushed above the home tabs (%s)',
    (_placement, place) => {
      expect(
        isHomeUnobstructedState(place(homeWithPushed(Routes.REWARDS_VIEW))),
      ).toBe(false);
    },
  );

  it('is false when a root-level screen is pushed above home', () => {
    const root = stack([
      {
        name: Routes.ONBOARDING.HOME_NAV,
        state: stack([{ name: Routes.HOME_TABS, state: walletTab() }]),
      },
      { name: 'SomeScreenAddedAfterOnboarding' },
    ]);

    expect(isHomeUnobstructedState(root)).toBe(false);
  });

  it('is false for an unlisted screen pushed onto the wallet tab', () => {
    const pushed = stack([
      { name: Routes.WALLET_VIEW },
      { name: 'SomeNewWalletAction' },
    ]);

    expect(isHomeUnobstructedState(homeRoot(walletTab(pushed)))).toBe(false);
  });

  it('is false when home is not the focused root screen', () => {
    expect(
      isHomeUnobstructedState(stack([{ name: 'OnboardingSuccess' }])),
    ).toBe(false);
  });

  it('is false when there is no navigation state', () => {
    expect(isHomeUnobstructedState(undefined)).toBe(false);
  });
});

describe('useIsHomeUnobstructed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue(mockUnsubscribe);
  });

  it('reads the focused state on mount', () => {
    mockGetState.mockReturnValue(homeRoot(walletTab()));

    const { result } = renderHook(() => useIsHomeUnobstructed());

    expect(result.current).toBe(true);
  });

  it('follows getState when navigation changes', () => {
    mockGetState.mockReturnValue(wrapped(homeRoot(walletTab())));
    const { result } = renderHook(() => useIsHomeUnobstructed());
    const listener = mockAddListener.mock.calls[0][1];

    const pushedWallet = stack([
      { name: Routes.WALLET_VIEW },
      { name: 'RevealPrivateCredential' },
    ]);
    mockGetState.mockReturnValue(
      wrapped(homeRoot(walletTab(pushedWallet))),
    );
    act(() => {
      // The event payload is one route short of the hydrated root.
      listener({
        data: { state: wrapped(homeRoot(walletTab())) },
      });
    });
    expect(result.current).toBe(false);

    mockGetState.mockReturnValue(wrapped(homeRoot(walletTab())));
    act(() => {
      listener({ data: { state: stack([{ name: 'OnboardingSuccess' }]) } });
    });
    expect(result.current).toBe(true);
  });

  it('subscribes to the navigator state event', () => {
    mockGetState.mockReturnValue(homeRoot(walletTab()));

    renderHook(() => useIsHomeUnobstructed());

    expect(mockAddListener).toHaveBeenCalledWith('state', expect.any(Function));
  });

  it('unsubscribes on unmount', () => {
    mockGetState.mockReturnValue(homeRoot(walletTab()));
    const { unmount } = renderHook(() => useIsHomeUnobstructed());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
