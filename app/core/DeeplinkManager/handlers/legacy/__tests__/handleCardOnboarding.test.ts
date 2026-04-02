import { handleCardOnboarding } from '../handleCardOnboarding';
import ReduxService from '../../../../redux';
import NavigationService from '../../../../NavigationService';
import Engine from '../../../../Engine';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { selectIsAuthenticatedCard } from '../../../../redux/slices/card';
import { selectCardholderAccounts } from '../../../../../selectors/cardController';

jest.mock('../../../../../selectors/geolocationController');
jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
      dispatch: jest.fn(),
    },
  },
}));
jest.mock('../../../../NavigationService');
jest.mock('../../../../Engine', () => ({
  setSelectedAddress: jest.fn(),
}));
jest.mock('../../../../redux/slices/card');
jest.mock('../../../../../selectors/cardController');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

describe('handleCardOnboarding', () => {
  const mockGetState = jest.fn();
  const mockDispatch = jest.fn();
  const mockNavigate = jest.fn();
  const mockDevLogger = DevLogger.log as jest.Mock;
  const mockLoggerError = Logger.error as jest.Mock;

  const mockCardholderAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    (ReduxService.store.getState as jest.Mock) = mockGetState;
    (ReduxService.store.dispatch as jest.Mock) = mockDispatch;
    mockGetState.mockReturnValue({});

    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    // Default mocks
    (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([]);
    (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('navigation behavior', () => {
    describe('when user is authenticated and has card-linked account', () => {
      beforeEach(() => {
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
          true,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderAddress,
        ]);
      });

      it('navigates to Card Home with showDeeplinkToast param', () => {
        handleCardOnboarding();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
            params: {
              showDeeplinkToast: true,
            },
          },
        });
      });

      it('switches to first cardholder account', () => {
        handleCardOnboarding();

        expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
          mockCardholderAddress,
        );
      });

      it('logs the account switch', () => {
        handleCardOnboarding();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardOnboarding] Switching to first cardholder account:',
          mockCardholderAddress,
        );
      });
    });

    describe('when user is authenticated but has no card-linked account', () => {
      beforeEach(() => {
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
          true,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([]);
      });

      it('navigates to Card Home with showDeeplinkToast param', () => {
        handleCardOnboarding();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
            params: {
              showDeeplinkToast: true,
            },
          },
        });
      });

      it('does not switch account', () => {
        handleCardOnboarding();

        expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      });
    });

    describe('when user is not authenticated but has card-linked account', () => {
      beforeEach(() => {
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderAddress,
        ]);
      });

      it('navigates to Card Home with showDeeplinkToast param', () => {
        handleCardOnboarding();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
            params: {
              showDeeplinkToast: true,
            },
          },
        });
      });

      it('switches to first cardholder account', () => {
        handleCardOnboarding();

        expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
          mockCardholderAddress,
        );
      });
    });

    describe('when user is not authenticated and has no card-linked account', () => {
      beforeEach(() => {
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([]);
      });

      it('navigates to Card Welcome', () => {
        handleCardOnboarding();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });

      it('does not switch account', () => {
        handleCardOnboarding();

        expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      });

      it('logs navigation to Card Welcome', () => {
        handleCardOnboarding();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardOnboarding] Navigating to Card Welcome (onboarding)',
        );
      });
    });

    describe('with multiple cardholder accounts', () => {
      const secondCardholderAddress =
        '0xabcdef1234567890abcdef1234567890abcdef12';

      beforeEach(() => {
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderAddress,
          secondCardholderAddress,
        ]);
      });

      it('switches to first cardholder account only', () => {
        handleCardOnboarding();

        expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
          mockCardholderAddress,
        );
        expect(Engine.setSelectedAddress).not.toHaveBeenCalledWith(
          secondCardholderAddress,
        );
      });
    });
  });

  describe('error handling', () => {
    describe('when getState throws an error', () => {
      const mockError = new Error('Redux state error');

      beforeEach(() => {
        mockGetState.mockImplementation(() => {
          throw mockError;
        });
      });

      it('logs error with DevLogger', () => {
        handleCardOnboarding();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardOnboarding] Failed to handle deeplink:',
          mockError,
        );
      });

      it('logs error with Logger', () => {
        handleCardOnboarding();

        expect(mockLoggerError).toHaveBeenCalledWith(
          mockError,
          '[handleCardOnboarding] Error handling card onboarding deeplink',
        );
      });

      it('falls back to Card Welcome navigation', () => {
        handleCardOnboarding();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });
    });

    describe('when account switch fails', () => {
      const switchError = new Error('Account switch failed');

      beforeEach(() => {
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderAddress,
        ]);
        (Engine.setSelectedAddress as jest.Mock).mockImplementation(() => {
          throw switchError;
        });
      });

      it('logs the error but continues', () => {
        handleCardOnboarding();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardOnboarding] Error switching account:',
          switchError,
        );
        expect(mockLoggerError).toHaveBeenCalledWith(
          switchError,
          '[handleCardOnboarding] Failed to switch to cardholder account',
        );
      });

      it('still navigates to Card Home with showDeeplinkToast param', () => {
        handleCardOnboarding();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
            params: {
              showDeeplinkToast: true,
            },
          },
        });
      });
    });

    describe('when fallback navigation fails', () => {
      const mainError = new Error('Main error');

      beforeEach(() => {
        mockGetState.mockImplementation(() => {
          throw mainError;
        });
        mockNavigate.mockImplementation(() => {
          throw new Error('Navigation error');
        });
      });

      it('logs the navigation error', () => {
        handleCardOnboarding();

        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Navigation error' }),
          '[handleCardOnboarding] Failed to navigate to fallback screen',
        );
      });
    });
  });

  describe('logging', () => {
    it('logs starting message', () => {
      handleCardOnboarding();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardOnboarding] Starting card onboarding deeplink handling',
      );
    });
  });
});
