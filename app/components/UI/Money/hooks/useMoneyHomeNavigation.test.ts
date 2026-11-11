import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useMoneyHomeNavigation } from './useMoneyHomeNavigation';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import {
  selectMoneyCtaEntryContext,
  selectMoneyEntryContext,
} from '../selectors/entry';
import { MONEY_BUTTON_INTENTS, SCREEN_NAMES } from '../constants/moneyEvents';

const mockNavigate = jest.fn();
const analyticsContext = {
  id: 'balance-breakdown-navigation',
  attribution: 'homescreen_balance_breakdown' as const,
};

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../selectors/entry', () => ({
  selectMoneyCtaEntryContext: jest.fn(),
  selectMoneyEntryContext: jest.fn(),
}));

jest.mock('../../../../core/NavigationService', () => ({
  navigation: { navigate: jest.fn() },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockSelectMoneyEntryContext = jest.mocked(selectMoneyEntryContext);

const setupSelectorMocks = ({
  hasSeenOnboarding = false,
  isOnboardingEnabled = true,
  accessBlockReason,
  isSplashRedirectNeeded = false,
}: {
  hasSeenOnboarding?: boolean;
  isOnboardingEnabled?: boolean;
  accessBlockReason?: 'feature_disabled' | 'geo_blocked';
  isSplashRedirectNeeded?: boolean;
} = {}) => {
  const entryContext = {
    accessBlockReason,
    isOnboardingRedirectNeeded: !hasSeenOnboarding && isOnboardingEnabled,
    isSplashRedirectNeeded,
  };
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (
      selector === selectMoneyEntryContext ||
      selector === selectMoneyCtaEntryContext
    ) {
      return mockSelectMoneyEntryContext({} as never);
    }
    return undefined;
  });
  mockSelectMoneyEntryContext.mockReturnValue(entryContext);
};

describe('useMoneyHomeNavigation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Object.assign(NavigationService.navigation, { navigate: mockNavigate });
    setupSelectorMocks();
  });

  describe('navigateToMoneyHome', () => {
    it('navigates to onboarding when user has not seen onboarding and flag is enabled', () => {
      setupSelectorMocks({
        hasSeenOnboarding: false,
        isOnboardingEnabled: true,
      });

      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING);
    });

    it('skips the onboarding redirect when the caller already showed an intro', () => {
      setupSelectorMocks({
        hasSeenOnboarding: false,
        isOnboardingEnabled: true,
      });

      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() =>
        result.current.navigateToMoneyHome({ skipOnboardingRedirect: true }),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );
    });

    it('forwards analytics context through Money onboarding', () => {
      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome({ analyticsContext }));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING, {
        analyticsContext,
      });
    });

    it('navigates to Money home when user has seen onboarding', () => {
      setupSelectorMocks({
        hasSeenOnboarding: true,
        isOnboardingEnabled: true,
      });

      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );
    });

    it('forwards analytics context to Money home', () => {
      setupSelectorMocks({
        hasSeenOnboarding: true,
        isOnboardingEnabled: true,
      });
      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome({ analyticsContext }));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: {
            screen: Routes.MONEY.HOME,
            params: { analyticsContext },
          },
        },
        { pop: true },
      );
    });

    it('navigates to Money home when onboarding flag is disabled even if onboarding not seen', () => {
      setupSelectorMocks({
        hasSeenOnboarding: false,
        isOnboardingEnabled: false,
      });

      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );
    });

    it('opens the geo-block sheet when access is geo blocked', () => {
      setupSelectorMocks({ accessBlockReason: 'geo_blocked' });

      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
      });
    });

    it('opens the disabled notice when the feature is disabled', () => {
      setupSelectorMocks({ accessBlockReason: 'feature_disabled' });

      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MONEY.MODALS.DEEPLINK_MODAL,
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
        }),
      );
    });

    it('tracks before navigating to Money home', () => {
      const callOrder: string[] = [];
      mockNavigate.mockImplementation(() => callOrder.push('navigate'));
      const track = jest.fn(() => callOrder.push('track'));
      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome({ track }));

      expect(callOrder).toStrictEqual(['track', 'navigate']);
      expect(track).toHaveBeenCalledWith({
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
      });
    });
  });

  describe('navigateToMoneyHomeFromCta', () => {
    it('navigates to the splash while it is unseen', () => {
      setupSelectorMocks({ isSplashRedirectNeeded: true });

      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHomeFromCta());

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SPLASH);
    });

    it('forwards analytics context to the splash', () => {
      setupSelectorMocks({ isSplashRedirectNeeded: true });

      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() =>
        result.current.navigateToMoneyHomeFromCta({ analyticsContext }),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SPLASH, {
        analyticsContext,
      });
    });

    it('tracks the splash before navigating to it', () => {
      setupSelectorMocks({ isSplashRedirectNeeded: true });
      const track = jest.fn();
      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHomeFromCta({ track }));

      expect(track).toHaveBeenCalledWith({
        redirect_target: SCREEN_NAMES.MONEY_SPLASH,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_SPLASH,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SPLASH);
    });

    it('navigates to Money home once the splash is seen', () => {
      setupSelectorMocks({
        hasSeenOnboarding: true,
        isSplashRedirectNeeded: false,
      });

      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHomeFromCta({ pop: false }));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: false },
      );
    });
  });
});
