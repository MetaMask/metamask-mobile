import { renderHook, act } from '@testing-library/react-hooks';
import { useMoneySplashRedirect } from './useMoneySplashRedirect';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import { useMoneyHomeNavigation } from './useMoneyHomeNavigation';
import Routes from '../../../../constants/navigation/Routes';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';

const mockNavigate = jest.fn();
const mockInitiateDeposit = jest.fn();
const mockNavigateToMoneyHome = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('./useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock('./useMoneyHomeNavigation', () => ({
  useMoneyHomeNavigation: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);
const mockUseMoneyHomeNavigation = jest.mocked(useMoneyHomeNavigation);

describe('useMoneySplashRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    } as unknown as ReturnType<typeof useMoneyAccountDeposit>);
    mockUseMoneyHomeNavigation.mockReturnValue({
      navigateToMoneyHome: mockNavigateToMoneyHome,
    });
    mockInitiateDeposit.mockResolvedValue(undefined);
  });

  it.each([
    ['authentication', Routes.CARD.AUTHENTICATION],
    ['onboarding', Routes.CARD.ONBOARDING.ROOT],
  ] as const)(
    'returns to Card %s after a CARD redirect',
    (cardScreen, expectedScreen) => {
      const { result } = renderHook(() =>
        useMoneySplashRedirect({
          type: MoneyPostOnboardingRedirectType.CARD,
          cardScreen,
        }),
      );

      act(() => result.current.redirectAfterSplash());

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ROOT,
        {
          screen: Routes.CARD.HOME,
          params: { screen: expectedScreen },
        },
        { pop: true },
      );
      expect(mockInitiateDeposit).not.toHaveBeenCalled();
    },
  );

  it('starts the promised deposit and falls back to Money home on setup failure', () => {
    const preferredPaymentToken = {
      address: '0xabc' as const,
      chainId: '0x1' as const,
    };
    const { result } = renderHook(() =>
      useMoneySplashRedirect({
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
        preferredPaymentToken,
        intent: 'convert',
      }),
    );

    act(() => result.current.redirectAfterSplash());

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      preferredPaymentToken,
      intent: 'convert',
      replaceConfirmation: true,
      onDepositSetupFailure: expect.any(Function),
    });

    const { onDepositSetupFailure } = mockInitiateDeposit.mock.calls[0][0] as {
      onDepositSetupFailure: () => void;
    };
    onDepositSetupFailure();

    expect(mockNavigateToMoneyHome).toHaveBeenCalledWith({
      skipFtueRedirect: true,
    });
  });

  it('goes to Money home when there is no redirect', () => {
    const analyticsContext = {
      id: 'splash-entry',
      attribution: 'homescreen_balance_breakdown' as const,
    };
    const { result } = renderHook(() =>
      useMoneySplashRedirect(undefined, analyticsContext),
    );

    act(() => result.current.redirectAfterSplash());

    expect(mockNavigateToMoneyHome).toHaveBeenCalledWith({
      skipFtueRedirect: true,
      analyticsContext,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });
});
