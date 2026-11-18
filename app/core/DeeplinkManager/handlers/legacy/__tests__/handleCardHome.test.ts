import { handleCardHome } from '../handleCardHome';
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
import { selectInternalAccounts } from '../../../../../selectors/accountsController';

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
jest.mock('../../../../../selectors/accountsController');
jest.mock('../../../../../selectors/geolocationController');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

const flushMicrotasks = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

describe('handleCardHome', () => {
  const mockGetState = jest.fn();
  const mockNavigate = jest.fn();
  const mockDevLogger = DevLogger.log as jest.Mock;
  const mockLoggerError = Logger.error as jest.Mock;

  const mockLinkedAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const mockInternalAccountAddress =
    '0xabcdef1234567890abcdef1234567890abcdef12';

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
    (selectInternalAccounts as unknown as jest.Mock).mockReturnValue([
      { address: mockInternalAccountAddress },
    ]);
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
      'navigates to Card Home when hasCard is %s',
      (hasCard) => {
        (selectHasCard as unknown as jest.Mock).mockReturnValue(hasCard);

        handleCardHome();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: { screen: Routes.CARD.HOME },
        });
        expect(mockFindLinkedAccountAddress).not.toHaveBeenCalled();
        expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      },
    );

    it('logs navigation to Card Home', () => {
      handleCardHome();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardHome] Navigating to Card Home',
      );
    });
  });

  describe('when the user is logged out and has a card link', () => {
    beforeEach(() => {
      (selectHasCard as unknown as jest.Mock).mockReturnValue(true);
    });

    it('switches to the linked account, then navigates to Card login', async () => {
      handleCardHome();
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

      handleCardHome();
      await flushMicrotasks();
      jest.runAllTimers();

      expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { screen: Routes.CARD.AUTHENTICATION },
      });
    });

    it('logs navigation to Card login', () => {
      handleCardHome();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardHome] Navigating to Card login',
      );
    });
  });

  describe('when the user is logged out and has no card link', () => {
    it('navigates to Card Welcome without switching accounts', () => {
      handleCardHome();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });
      expect(mockFindLinkedAccountAddress).not.toHaveBeenCalled();
      expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
    });

    it('logs navigation to Card Welcome', () => {
      handleCardHome();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardHome] User not authenticated and no card-linked account, navigating to Card Welcome',
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
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] Failed to handle deeplink:',
          mockError,
        );
      });

      it('logs error with Logger', () => {
        handleCardHome();

        expect(mockLoggerError).toHaveBeenCalledWith(
          mockError,
          '[handleCardHome] Error handling card home deeplink',
        );
      });

      it('falls back to Card Welcome navigation', () => {
        handleCardHome();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });
    });

    describe('when error occurs and fallback switches to first account', () => {
      const mockError = new Error('Some error');

      beforeEach(() => {
        let callCount = 0;
        mockGetState.mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            throw mockError;
          }
          return {};
        });
      });

      it('switches to first internal account as fallback', () => {
        handleCardHome();

        expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
          mockInternalAccountAddress,
        );
      });

      it('logs fallback account switch', () => {
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] Fallback: Switching to first account:',
          mockInternalAccountAddress,
        );
      });
    });

    describe('when error occurs and no internal accounts exist', () => {
      const mockError = new Error('Some error');

      beforeEach(() => {
        let callCount = 0;
        mockGetState.mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            throw mockError;
          }
          return {};
        });
        (selectInternalAccounts as unknown as jest.Mock).mockReturnValue([]);
      });

      it('does not attempt to switch account', () => {
        handleCardHome();

        expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      });

      it('still navigates to Card Welcome', () => {
        handleCardHome();

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
        handleCardHome();
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

    describe('when fallback account switch fails', () => {
      const mainError = new Error('Main error');
      const fallbackSwitchError = new Error('Fallback switch error');

      beforeEach(() => {
        let callCount = 0;
        mockGetState.mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            throw mainError;
          }
          return {};
        });
        (Engine.setSelectedAddress as jest.Mock).mockImplementation(() => {
          throw fallbackSwitchError;
        });
      });

      it('logs fallback switch error', () => {
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] Failed to switch to first account during fallback:',
          fallbackSwitchError,
        );
      });

      it('still navigates to Card Welcome', () => {
        handleCardHome();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
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
        handleCardHome();

        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Navigation error' }),
          '[handleCardHome] Failed to navigate to fallback screen',
        );
      });
    });
  });

  describe('logging', () => {
    it('logs starting message', () => {
      handleCardHome();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardHome] Starting card home deeplink handling',
      );
    });
  });
});
