import { handleCardOnboarding } from '../handleCardOnboarding';
import ReduxService from '../../../../redux';
import NavigationService from '../../../../NavigationService';
import Engine from '../../../../Engine';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import {
  selectIsCardAuthenticated,
  selectHasCard,
} from '../../../../../selectors/cardController';

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
const mockFindLinkedAccountAddress = jest.fn();
jest.mock('../../../../Engine', () => ({
  setSelectedAddress: jest.fn(),
  context: {
    CardController: {
      findLinkedAccountAddress: (...args: unknown[]) =>
        mockFindLinkedAccountAddress(...args),
    },
  },
}));
jest.mock('../../../../redux/slices/card');
jest.mock('../../../../../selectors/cardController');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

const flushMicrotasks = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

describe('handleCardOnboarding', () => {
  const mockGetState = jest.fn();
  const mockNavigate = jest.fn();
  const mockDevLogger = DevLogger.log as jest.Mock;
  const mockLoggerError = Logger.error as jest.Mock;

  const mockLinkedAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    (ReduxService.store.getState as jest.Mock) = mockGetState;
    mockGetState.mockReturnValue({});

    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(false);
    (selectHasCard as unknown as jest.Mock).mockReturnValue(false);
    mockFindLinkedAccountAddress.mockResolvedValue(mockLinkedAddress);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('when the user is authenticated', () => {
    beforeEach(() => {
      (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(true);
    });

    it.each([true, false])(
      'navigates to Card Home with a toast when hasCard is %s',
      (hasCard) => {
        (selectHasCard as unknown as jest.Mock).mockReturnValue(hasCard);

        handleCardOnboarding();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
            params: { showDeeplinkToast: true },
          },
        });
        expect(mockFindLinkedAccountAddress).not.toHaveBeenCalled();
        expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      },
    );
  });

  describe('when the user is logged out and has a card link', () => {
    beforeEach(() => {
      (selectHasCard as unknown as jest.Mock).mockReturnValue(true);
    });

    it('switches to the linked account, then navigates to Card login', async () => {
      handleCardOnboarding();
      await flushMicrotasks();
      jest.runAllTimers();

      expect(Engine.setSelectedAddress).toHaveBeenCalledWith(mockLinkedAddress);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { screen: Routes.CARD.AUTHENTICATION },
      });
    });

    it('stays on the current account when no account matches the link', async () => {
      mockFindLinkedAccountAddress.mockResolvedValue(null);

      handleCardOnboarding();
      await flushMicrotasks();
      jest.runAllTimers();

      expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { screen: Routes.CARD.AUTHENTICATION },
      });
    });
  });

  describe('when the user is logged out and has no card link', () => {
    it('navigates to Card Welcome without switching accounts', () => {
      handleCardOnboarding();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });
      expect(mockFindLinkedAccountAddress).not.toHaveBeenCalled();
      expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
    });

    it('logs navigation to Card Welcome', () => {
      handleCardOnboarding();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardOnboarding] Navigating to Card Welcome (onboarding)',
      );
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

    describe('when the linked-account switch fails', () => {
      const switchError = new Error('Account switch failed');

      beforeEach(() => {
        (selectHasCard as unknown as jest.Mock).mockReturnValue(true);
        (Engine.setSelectedAddress as jest.Mock).mockImplementation(() => {
          throw switchError;
        });
      });

      it('logs the error and still navigates to Card login', async () => {
        handleCardOnboarding();
        await flushMicrotasks();
        jest.runAllTimers();

        expect(mockLoggerError).toHaveBeenCalledWith(
          switchError,
          '[switchToLinkedCardAccount] Failed to switch to linked card account',
        );
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: { screen: Routes.CARD.AUTHENTICATION },
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
