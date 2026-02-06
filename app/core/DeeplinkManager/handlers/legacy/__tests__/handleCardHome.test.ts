import { handleCardHome } from '../handleCardHome';
import ReduxService from '../../../../redux';
import NavigationService from '../../../../NavigationService';
import Engine from '../../../../Engine';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import {
  selectCardholderAccounts,
  selectIsAuthenticatedCard,
  selectCardGeoLocation,
  setAlwaysShowCardButton,
} from '../../../../redux/slices/card';
import {
  selectCardExperimentalSwitch,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
} from '../../../../../selectors/featureFlagController/card';
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
jest.mock('../../../../Engine', () => ({
  setSelectedAddress: jest.fn(),
}));
jest.mock('../../../../redux/slices/card');
jest.mock('../../../../../selectors/featureFlagController/card');
jest.mock('../../../../../selectors/accountsController');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

describe('handleCardHome', () => {
  const mockGetState = jest.fn();
  const mockDispatch = jest.fn();
  const mockNavigate = jest.fn();
  const mockDevLogger = DevLogger.log as jest.Mock;
  const mockLoggerError = Logger.error as jest.Mock;

  const mockCardholderAddress = '0x1234567890abcdef1234567890abcdef12345678';
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
    (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(false);
    (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue('US');
    (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
      false,
    );
    (
      selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
    ).mockReturnValue(false);
    (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue({});
    (selectInternalAccounts as unknown as jest.Mock).mockReturnValue([
      { address: mockInternalAccountAddress },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('feature flag edge cases', () => {
    describe('when cardExperimentalSwitch is enabled', () => {
      beforeEach(() => {
        (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
          true,
        );
      });

      it('enables card and navigates to Card Welcome for unauthenticated user without card account', () => {
        handleCardHome();

        expect(mockDispatch).toHaveBeenCalledWith(
          setAlwaysShowCardButton(true),
        );
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });

      it('enables card regardless of geo location', () => {
        (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue(
          'UNSUPPORTED_COUNTRY',
        );

        handleCardHome();

        expect(mockDispatch).toHaveBeenCalledWith(
          setAlwaysShowCardButton(true),
        );
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });

      it('enables card regardless of displayCardButtonFeatureFlag', () => {
        (
          selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
        ).mockReturnValue(false);

        handleCardHome();

        expect(mockDispatch).toHaveBeenCalledWith(
          setAlwaysShowCardButton(true),
        );
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    describe('when displayCardButtonFeatureFlag is enabled with supported country', () => {
      beforeEach(() => {
        (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (
          selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
        ).mockReturnValue(true);
        (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue('GB');
        (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue({
          GB: true,
          DE: true,
          FR: true,
        });
      });

      it('enables card and dispatches setAlwaysShowCardButton', () => {
        handleCardHome();

        expect(mockDispatch).toHaveBeenCalledWith(
          setAlwaysShowCardButton(true),
        );
        expect(mockNavigate).toHaveBeenCalled();
      });

      it('navigates to Card Welcome for unauthenticated user without card account', () => {
        handleCardHome();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });
    });

    describe('when displayCardButtonFeatureFlag is enabled but country is not supported', () => {
      beforeEach(() => {
        (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (
          selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
        ).mockReturnValue(true);
        (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue(
          'UNSUPPORTED',
        );
        (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue({
          GB: true,
          DE: true,
        });
      });

      it('does not dispatch setAlwaysShowCardButton', () => {
        handleCardHome();

        expect(mockDispatch).not.toHaveBeenCalled();
      });

      it('does not navigate', () => {
        handleCardHome();

        expect(mockNavigate).not.toHaveBeenCalled();
      });

      it('logs that card is not enabled', () => {
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] Card is not enabled, skipping',
        );
      });
    });

    describe('when displayCardButtonFeatureFlag is disabled but country is in supported list', () => {
      beforeEach(() => {
        (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (
          selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
        ).mockReturnValue(false);
        (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue('GB');
        (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue({
          GB: true,
        });
      });

      it('does not enable card', () => {
        handleCardHome();

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    describe('when country is explicitly set to false in supported countries', () => {
      beforeEach(() => {
        (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (
          selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
        ).mockReturnValue(true);
        (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue('XX');
        (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue({
          XX: false,
          GB: true,
        });
      });

      it('does not enable card', () => {
        handleCardHome();

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    describe('when both feature flags are disabled', () => {
      beforeEach(() => {
        (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (
          selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
        ).mockReturnValue(false);
      });

      it('does not enable card', () => {
        handleCardHome();

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      it('logs skipping message', () => {
        handleCardHome();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardHome] Card is not enabled, skipping',
        );
      });
    });

    describe('when cardSupportedCountries is undefined or null', () => {
      beforeEach(() => {
        (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (
          selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
        ).mockReturnValue(true);
        (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue('GB');
      });

      it('does not enable card when cardSupportedCountries is undefined', () => {
        (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue(
          undefined,
        );

        handleCardHome();

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      it('does not enable card when cardSupportedCountries is null', () => {
        (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue(
          null,
        );

        handleCardHome();

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('navigation behavior when card is enabled', () => {
    beforeEach(() => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );
    });

    describe('when user is authenticated without card-linked account', () => {
      beforeEach(() => {
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
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
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
          true,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderAddress,
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
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderAddress,
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
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
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

      beforeEach(() => {
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderAddress,
          secondCardholderAddress,
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

  describe('error handling', () => {
    beforeEach(() => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );
    });

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
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
          false,
        );
        (selectCardholderAccounts as unknown as jest.Mock).mockReturnValue([
          mockCardholderAddress,
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
    beforeEach(() => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );
    });

    it('logs starting message', () => {
      handleCardHome();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardHome] Starting card home deeplink handling',
      );
    });

    it('logs successful card button enablement', () => {
      handleCardHome();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardHome] Successfully enabled card button',
      );
    });
  });
});
