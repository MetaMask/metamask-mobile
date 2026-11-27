import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useMoneyHomeNavigation } from './useMoneyHomeNavigation';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { selectMoneyEntryContext } from '../selectors/entry';
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
  selectMoneyEntryContext: jest.fn(),
}));

jest.mock('../../../../core/NavigationService', () => ({
  navigation: { navigate: jest.fn() },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockSelectMoneyEntryContext = jest.mocked(selectMoneyEntryContext);

const setupSelectorMocks = ({
  hasSeenSplash = false,
  accessBlockReason,
}: {
  hasSeenSplash?: boolean;
  accessBlockReason?: 'feature_disabled' | 'geo_blocked';
} = {}) => {
  const entryContext = {
    accessBlockReason,
    isSplashRedirectNeeded: !hasSeenSplash,
  };
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectMoneyEntryContext) {
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
    it('navigates to the splash when the user has not seen it', () => {
      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SPLASH);
    });

    it('skips the splash redirect when the caller already showed it', () => {
      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome({ skipFtueRedirect: true }));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );
    });

    it('forwards analytics context through the Money splash', () => {
      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome({ analyticsContext }));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SPLASH, {
        analyticsContext,
      });
    });

    it('navigates to Money home when the user has seen the splash', () => {
      setupSelectorMocks({ hasSeenSplash: true });

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
      setupSelectorMocks({ hasSeenSplash: true });
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

    it('tracks before navigating to the splash', () => {
      const callOrder: string[] = [];
      mockNavigate.mockImplementation(() => callOrder.push('navigate'));
      const track = jest.fn(() => callOrder.push('track'));
      const { result } = renderHook(() => useMoneyHomeNavigation());

      act(() => result.current.navigateToMoneyHome({ track }));

      expect(callOrder).toStrictEqual(['track', 'navigate']);
      expect(track).toHaveBeenCalledWith({
        redirect_target: SCREEN_NAMES.MONEY_SPLASH,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_SPLASH,
      });
    });
  });
});
