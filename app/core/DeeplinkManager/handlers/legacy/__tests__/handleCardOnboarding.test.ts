import { handleCardOnboarding } from '../handleCardOnboarding';
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
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');
jest.mock('../../../../Analytics', () => {
  const actualMockTrackEvent = jest.fn();
  return {
    MetaMetrics: {
      getInstance: jest.fn(() => ({
        trackEvent: actualMockTrackEvent,
        updateDataRecordingFlag: jest.fn(),
      })),
      __mockTrackEvent: actualMockTrackEvent,
    },
    MetaMetricsEvents: {
      CARD_DEEPLINK_HANDLED: 'Card Deeplink Handled',
    },
  };
});
jest.mock('../../../../Analytics/MetricsEventBuilder', () => {
  const mockBuilder = {
    addProperties: jest.fn(),
    build: jest.fn().mockReturnValue({ event: 'mocked_event' }),
  };
  mockBuilder.addProperties.mockReturnValue(mockBuilder);
  return {
    MetricsEventBuilder: {
      createEventBuilder: jest.fn(() => mockBuilder),
    },
  };
});

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

    // Default mocks - onboarding disabled
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

      it('enables onboarding and navigates to Card Welcome for unauthenticated user', () => {
        handleCardOnboarding();

        expect(mockDispatch).toHaveBeenCalledWith(
          setAlwaysShowCardButton(true),
        );
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });

      it('enables onboarding regardless of geo location', () => {
        (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue(
          'UNSUPPORTED_COUNTRY',
        );

        handleCardOnboarding();

        expect(mockDispatch).toHaveBeenCalledWith(
          setAlwaysShowCardButton(true),
        );
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.WELCOME,
        });
      });

      it('enables onboarding regardless of displayCardButtonFeatureFlag', () => {
        (
          selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
        ).mockReturnValue(false);

        handleCardOnboarding();

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

      it('enables onboarding and dispatches setAlwaysShowCardButton', () => {
        handleCardOnboarding();

        expect(mockDispatch).toHaveBeenCalledWith(
          setAlwaysShowCardButton(true),
        );
        expect(mockNavigate).toHaveBeenCalled();
      });

      it('navigates to Card Welcome for unauthenticated user without card account', () => {
        handleCardOnboarding();

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
        handleCardOnboarding();

        expect(mockDispatch).not.toHaveBeenCalled();
      });

      it('does not navigate', () => {
        handleCardOnboarding();

        expect(mockNavigate).not.toHaveBeenCalled();
      });

      it('logs that onboarding is not enabled', () => {
        handleCardOnboarding();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardOnboarding] Card onboarding is not enabled, skipping',
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

      it('does not enable onboarding', () => {
        handleCardOnboarding();

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

      it('does not enable onboarding', () => {
        handleCardOnboarding();

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

      it('does not enable onboarding', () => {
        handleCardOnboarding();

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      it('logs skipping message', () => {
        handleCardOnboarding();

        expect(mockDevLogger).toHaveBeenCalledWith(
          '[handleCardOnboarding] Card onboarding is not enabled, skipping',
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

      it('does not enable onboarding when cardSupportedCountries is undefined', () => {
        (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue(
          undefined,
        );

        handleCardOnboarding();

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      it('does not enable onboarding when cardSupportedCountries is null', () => {
        (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue(
          null,
        );

        handleCardOnboarding();

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('navigation behavior when onboarding is enabled', () => {
    beforeEach(() => {
      // Enable onboarding via experimental switch
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );
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
    beforeEach(() => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );
    });

    it('logs starting message', () => {
      handleCardOnboarding();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardOnboarding] Starting card onboarding deeplink handling',
      );
    });

    it('logs successful card button enablement', () => {
      handleCardOnboarding();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleCardOnboarding] Successfully enabled card button',
      );
    });
  });
});
