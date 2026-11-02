import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  useMoneyNavigation,
  useMoneyDepositNavigation,
} from './useMoneyNavigation';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import { MONEY_BUTTON_INTENTS, SCREEN_NAMES } from '../constants/moneyEvents';

const mockNavigate = jest.fn();
const mockInitiateDeposit = jest.fn();
const analyticsContext = {
  id: 'balance-breakdown-navigation',
  attribution: 'homescreen_balance_breakdown' as const,
};

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('./useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock('../../../../core/NavigationService/NavigationService', () => ({
  navigation: { navigate: jest.fn() },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);

const setupSelectorMocks = ({
  hasSeenOnboarding = false,
  isOnboardingEnabled = true,
  accessBlockReason,
}: {
  hasSeenOnboarding?: boolean;
  isOnboardingEnabled?: boolean;
  accessBlockReason?: 'feature_disabled' | 'geo_blocked';
} = {}) => {
  mockUseSelector.mockImplementation(() => ({
    accessBlockReason,
    isOnboardingRedirectNeeded: !hasSeenOnboarding && isOnboardingEnabled,
  }));
};

describe('useMoneyNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(NavigationService.navigation, { navigate: mockNavigate });
    setupSelectorMocks();
  });

  describe('navigateToMoneyHome', () => {
    it('navigates to onboarding when user has not seen onboarding and flag is enabled', () => {
      setupSelectorMocks({
        hasSeenOnboarding: false,
        isOnboardingEnabled: true,
      });

      const { result } = renderHook(() => useMoneyNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING);
    });

    it('forwards analytics context through Money onboarding', () => {
      const { result } = renderHook(() => useMoneyNavigation());

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

      const { result } = renderHook(() => useMoneyNavigation());

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
      const { result } = renderHook(() => useMoneyNavigation());

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

      const { result } = renderHook(() => useMoneyNavigation());

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

      const { result } = renderHook(() => useMoneyNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
      });
    });

    it('opens the disabled notice when the feature is disabled', () => {
      setupSelectorMocks({ accessBlockReason: 'feature_disabled' });

      const { result } = renderHook(() => useMoneyNavigation());

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
      const { result } = renderHook(() => useMoneyNavigation());

      act(() => result.current.navigateToMoneyHome({ track }));

      expect(callOrder).toStrictEqual(['track', 'navigate']);
      expect(track).toHaveBeenCalledWith({
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
      });
    });
  });
});

describe('useMoneyDepositNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectorMocks({ hasSeenOnboarding: true });
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
  });

  it('tracks before initiating an accessible deposit', async () => {
    const callOrder: string[] = [];
    mockInitiateDeposit.mockImplementation(async () => {
      callOrder.push('deposit');
    });
    const track = jest.fn(() => callOrder.push('track'));
    const { result } = renderHook(() => useMoneyDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit({
        preferredPaymentToken: {
          address: '0xabc',
          chainId: '0x1',
        },
        track,
      });
    });

    expect(callOrder).toStrictEqual(['track', 'deposit']);
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      preferredPaymentToken: {
        address: '0xabc',
        chainId: '0x1',
      },
    });
  });

  it('routes an unseen deposit to onboarding without initiating it', async () => {
    setupSelectorMocks({ isOnboardingEnabled: true });
    const { result } = renderHook(() => useMoneyDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING, {
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
      },
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('routes a blocked deposit to an access notice without initiating it', async () => {
    setupSelectorMocks({
      hasSeenOnboarding: true,
      accessBlockReason: 'geo_blocked',
    });
    const { result } = renderHook(() => useMoneyDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('routes a feature-disabled deposit to the disabled notice without initiating it', async () => {
    setupSelectorMocks({
      hasSeenOnboarding: true,
      accessBlockReason: 'feature_disabled',
    });
    const { result } = renderHook(() => useMoneyDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.MODALS.DEEPLINK_MODAL,
      expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
      }),
    );
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });
});
