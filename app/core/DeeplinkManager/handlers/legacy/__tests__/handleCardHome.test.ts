import { handleCardHome } from '../handleCardHome';
import ReduxService from '../../../../redux';
import NavigationService from '../../../../NavigationService';
import Engine from '../../../../Engine';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import {
  selectIsCardAuthenticated,
  selectCardholderAccounts,
  selectCardEntryRouting,
} from '../../../../../selectors/cardController';
import { trackCardLinkRoutingDisagreement } from '../../../../../components/UI/Card/util/trackCardLinkRoutingDisagreement';
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
jest.mock(
  '../../../../../components/UI/Card/util/trackCardLinkRoutingDisagreement',
);

const flushMicrotasks = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

describe('handleCardHome', () => {
  const mockGetState = jest.fn();
  const mockDispatch = jest.fn();
  const mockNavigate = jest.fn();
  const mockDevLogger = DevLogger.log as jest.Mock;
  const mockLoggerError = Logger.error as jest.Mock;

  const mockCardholderAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const mockCardholderCaipId = `eip155:1:${mockCardholderAddress}`;
  const mockInternalAccountAddress =
    '0xabcdef1234567890abcdef1234567890abcdef12';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    (ReduxService.store.getState as jest.Mock) = mockGetState;
    (ReduxService.store.dispatch as jest.Mock) = mockDispatch;
    mockGetState.mockReturnValue({});

    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([]);
    (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(false);
    (selectCardEntryRouting as unknown as jest.Mock).mockImplementation(
      (state) => ({
        hasCard:
          (selectCardholderAccounts as unknown as jest.Mock)(state).length > 0,
        provider: null,
        source: 'legacy',
        disagreesWithLegacy: false,
      }),
    );
    (selectInternalAccounts as unknown as jest.Mock).mockReturnValue([
      { address: mockInternalAccountAddress },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('navigation behavior', () => {
    describe('when user is authenticated without card-linked account', () => {
      beforeEach(() => {
        (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(
          true,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([]);
      });

      it('navigates to Card Home', () => {
        handleCardHome();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
          },
        });
      });

      it('does not switch account when no card-linked accounts exist', () => {
        handleCardHome();

        expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      });

      it('logs navigation to Card Home', () => {
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] Navigating to Card Home',
        );
      });
    });

    describe('when user is authenticated and has card-linked account', () => {
      beforeEach(() => {
        (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(
          true,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderCaipId,
        ]);
      });

      it('does not switch account when authenticated', () => {
        handleCardHome();

        expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      });

      it('navigates to Card Home for currently selected account', () => {
        handleCardHome();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
          },
        });
      });
    });

    describe('when user is not authenticated but has card-linked account', () => {
      beforeEach(() => {
        (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderCaipId,
        ]);
      });

      it('switches to first cardholder account', () => {
        handleCardHome();

        expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
          mockCardholderAddress,
        );
      });

      it('navigates to Card Home', () => {
        handleCardHome();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
          },
        });
      });

      it('logs the account switch', () => {
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] Switching to first cardholder account:',
          mockCardholderAddress,
        );
      });

      it('logs successful account switch', () => {
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] Successfully switched to cardholder account',
        );
      });
    });

    describe('when user is not authenticated and has no card-linked account', () => {
      beforeEach(() => {
        (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([]);
      });

      it('navigates to Card Welcome', () => {
        handleCardHome();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });

      it('does not switch account', () => {
        handleCardHome();

        expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      });

      it('logs navigation to Card Welcome', () => {
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] User not authenticated and no card-linked account, navigating to Card Welcome',
        );
      });
    });

    describe('with multiple cardholder accounts', () => {
      const secondCardholderAddress =
        '0xabcdef1234567890abcdef1234567890abcdef12';
      const secondCardholderCaipId = `eip155:1:${secondCardholderAddress}`;

      beforeEach(() => {
        (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderCaipId,
          secondCardholderCaipId,
        ]);
      });

      it('switches to first cardholder account only', () => {
        handleCardHome();

        expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
          mockCardholderAddress,
        );
        expect(Engine.setSelectedAddress).not.toHaveBeenCalledWith(
          secondCardholderAddress,
        );
      });
    });
  });

  describe('when routed by card links', () => {
    const linksRouting = {
      hasCard: true,
      provider: 'immersve',
      source: 'card_links',
      disagreesWithLegacy: false,
    };

    beforeEach(() => {
      (selectCardEntryRouting as unknown as jest.Mock).mockReturnValue(
        linksRouting,
      );
    });

    it('switches to the account matching the link, then navigates to Card Home', async () => {
      mockFindLinkedAccountAddress.mockResolvedValue(mockCardholderAddress);

      handleCardHome();
      await flushMicrotasks();
      jest.runAllTimers();

      expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
        mockCardholderAddress,
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ROOT,
        expect.objectContaining({ screen: Routes.CARD.HOME }),
      );
    });

    it('stays on the current account when no account matches the link', async () => {
      mockFindLinkedAccountAddress.mockResolvedValue(null);

      handleCardHome();
      await flushMicrotasks();
      jest.runAllTimers();

      expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ROOT,
        expect.objectContaining({ screen: Routes.CARD.HOME }),
      );
    });

    it('ignores the legacy cardholder list', async () => {
      (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
        `eip155:0:0xlegacy`,
      ]);
      mockFindLinkedAccountAddress.mockResolvedValue(null);

      handleCardHome();
      await flushMicrotasks();
      jest.runAllTimers();

      expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
    });

    it('does not switch account when the user is authenticated', async () => {
      (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(true);

      handleCardHome();
      await flushMicrotasks();
      jest.runAllTimers();

      expect(mockFindLinkedAccountAddress).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ROOT,
        expect.objectContaining({ screen: Routes.CARD.HOME }),
      );
    });

    it('sends the user to Card Welcome when the links say there is no card', () => {
      (selectCardEntryRouting as unknown as jest.Mock).mockReturnValue({
        ...linksRouting,
        hasCard: false,
        provider: null,
      });

      handleCardHome();
      jest.runAllTimers();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });
      expect(mockFindLinkedAccountAddress).not.toHaveBeenCalled();
    });

    it('reports the routing decision for the disagreement metric', () => {
      handleCardHome();

      expect(trackCardLinkRoutingDisagreement).toHaveBeenCalledWith(
        linksRouting,
        'deeplink_card_home',
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
        (selectInternalAccounts as unknown as jest.Mock).mockReturnValue([
          { address: mockInternalAccountAddress },
        ]);
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

    describe('when account switch fails during normal flow', () => {
      const switchError = new Error('Account switch failed');

      beforeEach(() => {
        (selectIsCardAuthenticated as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderCaipId,
        ]);
        (Engine.setSelectedAddress as jest.Mock).mockImplementation(() => {
          throw switchError;
        });
      });

      it('logs the error but continues', () => {
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] Error switching account:',
          switchError,
        );
        expect(mockLoggerError).toHaveBeenCalledWith(
          switchError,
          '[handleCardHome] Failed to switch to cardholder account',
        );
      });

      it('still navigates to Card Home', () => {
        handleCardHome();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
          },
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
        (selectInternalAccounts as unknown as jest.Mock).mockReturnValue([
          { address: mockInternalAccountAddress },
        ]);
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
