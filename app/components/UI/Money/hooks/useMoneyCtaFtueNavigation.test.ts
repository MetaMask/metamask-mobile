import { act, renderHook } from '@testing-library/react-hooks';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import { selectMoneySplashSeen } from '../../../../reducers/user/selectors';
import { selectMoneySplashEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { MONEY_BUTTON_INTENTS, SCREEN_NAMES } from '../constants/moneyEvents';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import { useMoneyCtaFtueNavigation } from './useMoneyCtaFtueNavigation';
import { useMoneyOnboardingNavigation } from './useMoneyNavigation';

const mockNavigate = jest.fn();
const mockRedirectToOnboardingIfNeeded = jest.fn();
const mockInitiateDeposit = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../reducers/user/selectors', () => ({
  selectMoneySplashSeen: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneySplashEnabled: jest.fn(),
}));

jest.mock('../../../../core/NavigationService/NavigationService', () => ({
  navigation: { navigate: jest.fn() },
}));

jest.mock('./useMoneyNavigation');
jest.mock('./useMoneyAccount');

const { useSelector } = jest.requireMock('react-redux');
const mockUseMoneyOnboardingNavigation = jest.mocked(
  useMoneyOnboardingNavigation,
);
const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);

const setup = ({
  hasSeenSplash = false,
  isSplashEnabled = true,
  isOnboardingRedirectNeeded = false,
}: {
  hasSeenSplash?: boolean;
  isSplashEnabled?: boolean;
  isOnboardingRedirectNeeded?: boolean;
} = {}) => {
  useSelector.mockImplementation((selector: unknown) => {
    if (selector === selectMoneySplashSeen) return hasSeenSplash;
    if (selector === selectMoneySplashEnabled) return isSplashEnabled;
    return undefined;
  });

  mockUseMoneyOnboardingNavigation.mockReturnValue({
    isOnboardingRedirectNeeded,
    redirectToOnboardingIfNeeded: mockRedirectToOnboardingIfNeeded,
  });
  mockRedirectToOnboardingIfNeeded.mockReturnValue(false);
  mockUseMoneyAccountDeposit.mockReturnValue({
    initiateDeposit: mockInitiateDeposit,
  });
};

describe('useMoneyCtaFtueNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(NavigationService.navigation, { navigate: mockNavigate });
    mockInitiateDeposit.mockResolvedValue(undefined);
    setup();
  });

  it('targets the splash when the flag is on and the splash is unseen', () => {
    const { result } = renderHook(() => useMoneyCtaFtueNavigation());

    expect(result.current.isSplashRedirectNeeded).toBe(true);
    expect(result.current.isCtaFtueRedirectNeeded).toBe(true);
    expect(result.current.ctaFtueRedirectTarget).toBe(
      SCREEN_NAMES.MONEY_SPLASH,
    );
    expect(result.current.ctaFtueButtonIntent).toBe(
      MONEY_BUTTON_INTENTS.GO_TO_MONEY_SPLASH,
    );
  });

  it('falls back to the onboarding when the splash flag is off', () => {
    setup({ isSplashEnabled: false, isOnboardingRedirectNeeded: true });

    const { result } = renderHook(() => useMoneyCtaFtueNavigation());

    expect(result.current.isSplashRedirectNeeded).toBe(false);
    expect(result.current.isCtaFtueRedirectNeeded).toBe(true);
    expect(result.current.ctaFtueRedirectTarget).toBe(
      SCREEN_NAMES.MONEY_ONBOARDING,
    );
    expect(result.current.ctaFtueButtonIntent).toBe(
      MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
    );
  });

  it('prefers the splash over the onboarding when both are unseen', () => {
    setup({ isOnboardingRedirectNeeded: true });

    const { result } = renderHook(() => useMoneyCtaFtueNavigation());

    expect(result.current.ctaFtueRedirectTarget).toBe(
      SCREEN_NAMES.MONEY_SPLASH,
    );
  });

  it('has no FTUE target when both flags are seen', () => {
    setup({
      hasSeenSplash: true,
      isOnboardingRedirectNeeded: false,
    });

    const { result } = renderHook(() => useMoneyCtaFtueNavigation());

    expect(result.current.isSplashRedirectNeeded).toBe(false);
    expect(result.current.isCtaFtueRedirectNeeded).toBe(false);
    expect(result.current.ctaFtueRedirectTarget).toBeUndefined();
    expect(result.current.ctaFtueButtonIntent).toBe(
      MONEY_BUTTON_INTENTS.ADD_MONEY,
    );
  });

  it('navigates to the splash and forwards the params', () => {
    const { result } = renderHook(() => useMoneyCtaFtueNavigation());
    const params = {
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
      },
    };

    let redirected = false;
    act(() => {
      redirected = result.current.redirectToCtaFtueIfNeeded(params);
    });

    expect(redirected).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SPLASH, params);
  });

  it('delegates to the onboarding when the splash flag is off', () => {
    setup({ isSplashEnabled: false, isOnboardingRedirectNeeded: true });
    mockRedirectToOnboardingIfNeeded.mockReturnValue(true);

    const { result } = renderHook(() => useMoneyCtaFtueNavigation());
    const params = {
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
      },
    };

    let redirected = false;
    act(() => {
      redirected = result.current.redirectToCtaFtueIfNeeded(params);
    });

    expect(redirected).toBe(true);
    expect(mockRedirectToOnboardingIfNeeded).toHaveBeenCalledWith(params);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('starts a tokenless deposit through the splash when unseen', async () => {
    const { result } = renderHook(() => useMoneyCtaFtueNavigation());
    const analyticsContext = {
      id: 'explore-earn',
      attribution: 'homescreen_balance_breakdown' as const,
    };

    await act(async () => {
      await result.current.navigateToMoneyDepositWithCtaFtue({
        analyticsContext,
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SPLASH, {
      analyticsContext,
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
      },
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('starts a tokenless deposit directly when no FTUE is needed', async () => {
    setup({ hasSeenSplash: true, isSplashEnabled: false });

    const { result } = renderHook(() => useMoneyCtaFtueNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDepositWithCtaFtue();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
  });
});
