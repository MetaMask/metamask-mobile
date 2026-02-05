import { handleCardKycNotification } from '../handleCardKycNotification';
import ReduxService from '../../../../redux';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import Logger from '../../../../../util/Logger';
import {
  selectIsAuthenticatedCard,
  selectOnboardingId,
  selectSelectedCountry,
  selectUserCardLocation,
  selectCardGeoLocation,
} from '../../../../redux/slices/card';
import {
  selectCardExperimentalSwitch,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
  selectCardFeatureFlag,
} from '../../../../../selectors/featureFlagController/card';
import { CardSDK } from '../../../../../components/UI/Card/sdk/CardSDK';
import { mapCountryToLocation } from '../../../../../components/UI/Card/util/mapCountryToLocation';

jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));
jest.mock('../../../../NavigationService');
jest.mock('../../../../redux/slices/card');
jest.mock('../../../../../selectors/featureFlagController/card');
jest.mock('../../../../../util/Logger');
jest.mock('../../../../../components/UI/Card/sdk/CardSDK');
jest.mock('../../../../../components/UI/Card/util/mapCountryToLocation');

describe('handleCardKycNotification', () => {
  const mockGetState = jest.fn();
  const mockNavigate = jest.fn();
  const mockLoggerError = Logger.error as jest.Mock;
  const mockLoggerLog = Logger.log as jest.Mock;
  const mockMapCountryToLocation = mapCountryToLocation as jest.Mock;

  const mockCardFeatureFlag = {
    chains: {
      'eip155:59144': {
        enabled: true,
        tokens: [],
      },
    },
    constants: {
      accountsApiUrl: 'https://accounts.api.cx.metamask.io',
    },
  };

  // Mock SDK instance
  const mockGetRegistrationStatus = jest.fn();
  const mockGetUserDetails = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    (ReduxService.store.getState as jest.Mock) = mockGetState;
    mockGetState.mockReturnValue({});

    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    // Default mocks - feature disabled
    (selectOnboardingId as unknown as jest.Mock).mockReturnValue(null);
    (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(false);
    (selectSelectedCountry as unknown as jest.Mock).mockReturnValue(null);
    (selectUserCardLocation as unknown as jest.Mock).mockReturnValue(
      'international',
    );
    (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue('US');
    (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
      false,
    );
    (
      selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
    ).mockReturnValue(false);
    (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue({});
    (selectCardFeatureFlag as unknown as jest.Mock).mockReturnValue(
      mockCardFeatureFlag,
    );

    // Mock CardSDK
    (CardSDK as jest.Mock).mockImplementation(() => ({
      getRegistrationStatus: mockGetRegistrationStatus,
      getUserDetails: mockGetUserDetails,
    }));

    // Mock mapCountryToLocation
    mockMapCountryToLocation.mockImplementation((countryCode: string | null) =>
      countryCode === 'US' ? 'us' : 'international',
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('feature flag checks', () => {
    it('does not navigate when feature is disabled', async () => {
      await handleCardKycNotification();

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[handleCardKycNotification] Card feature is not enabled, skipping',
      );
    });

    it('enables navigation when cardExperimentalSwitch is enabled', async () => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );

      await handleCardKycNotification();

      // Should navigate to fallback (Welcome) since no onboardingId or auth
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('enables navigation when displayCardButtonFeatureFlag and country is supported', async () => {
      (
        selectDisplayCardButtonFeatureFlag as unknown as jest.Mock
      ).mockReturnValue(true);
      (selectCardGeoLocation as unknown as jest.Mock).mockReturnValue('GB');
      (selectCardSupportedCountries as unknown as jest.Mock).mockReturnValue({
        GB: true,
      });

      await handleCardKycNotification();

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('onboarding flow', () => {
    beforeEach(() => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );
      (selectOnboardingId as unknown as jest.Mock).mockReturnValue(
        'test-onboarding-id',
      );
    });

    describe('when user is REJECTED', () => {
      beforeEach(() => {
        mockGetRegistrationStatus.mockResolvedValue({
          verificationState: 'REJECTED',
        });
      });

      it('navigates to KYCFailed', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
            params: {
              screen: Routes.CARD.ONBOARDING.KYC_FAILED,
            },
          },
        });
      });

      it('logs the rejection', async () => {
        await handleCardKycNotification();

        expect(mockLoggerLog).toHaveBeenCalledWith(
          '[handleCardKycNotification] Registration status:',
          'REJECTED',
        );
      });
    });

    describe('when user is VERIFIED', () => {
      beforeEach(() => {
        mockGetRegistrationStatus.mockResolvedValue({
          verificationState: 'VERIFIED',
        });
      });

      it('navigates to Complete with nextDestination=personal_details', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
            params: {
              screen: Routes.CARD.ONBOARDING.COMPLETE,
              params: {
                nextDestination: 'personal_details',
              },
            },
          },
        });
      });
    });

    describe('when user is UNVERIFIED', () => {
      beforeEach(() => {
        mockGetRegistrationStatus.mockResolvedValue({
          verificationState: 'UNVERIFIED',
        });
      });

      it('navigates to Onboarding ROOT', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
          },
        });
      });

      it('logs the unverified state', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockLoggerLog).toHaveBeenCalledWith(
          '[handleCardKycNotification] User unverified, navigating to Onboarding',
        );
      });
    });

    describe('when user is PENDING', () => {
      beforeEach(() => {
        mockGetRegistrationStatus.mockResolvedValue({
          verificationState: 'PENDING',
        });
      });

      it('navigates to KYCPending', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
            params: {
              screen: Routes.CARD.ONBOARDING.KYC_PENDING,
            },
          },
        });
      });
    });

    describe('when verification state is unknown/undefined', () => {
      beforeEach(() => {
        mockGetRegistrationStatus.mockResolvedValue({
          verificationState: undefined,
        });
      });

      it('navigates to Onboarding ROOT as default', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
          },
        });
      });
    });

    describe('location handling', () => {
      it('uses US location when selectedCountry is US', async () => {
        (selectSelectedCountry as unknown as jest.Mock).mockReturnValue({
          key: 'US',
          name: 'United States',
        });
        mockGetRegistrationStatus.mockResolvedValue({
          verificationState: 'VERIFIED',
        });

        await handleCardKycNotification();

        expect(mockMapCountryToLocation).toHaveBeenCalledWith('US');
        expect(CardSDK).toHaveBeenCalledWith({
          cardFeatureFlag: mockCardFeatureFlag,
          userCardLocation: 'us',
        });
      });

      it('uses international location when selectedCountry is not US', async () => {
        (selectSelectedCountry as unknown as jest.Mock).mockReturnValue({
          key: 'GB',
          name: 'United Kingdom',
        });
        mockGetRegistrationStatus.mockResolvedValue({
          verificationState: 'VERIFIED',
        });

        await handleCardKycNotification();

        expect(mockMapCountryToLocation).toHaveBeenCalledWith('GB');
        expect(CardSDK).toHaveBeenCalledWith({
          cardFeatureFlag: mockCardFeatureFlag,
          userCardLocation: 'international',
        });
      });

      it('uses international location when selectedCountry is null', async () => {
        (selectSelectedCountry as unknown as jest.Mock).mockReturnValue(null);
        mockGetRegistrationStatus.mockResolvedValue({
          verificationState: 'VERIFIED',
        });

        await handleCardKycNotification();

        expect(mockMapCountryToLocation).toHaveBeenCalledWith(null);
        expect(CardSDK).toHaveBeenCalledWith({
          cardFeatureFlag: mockCardFeatureFlag,
          userCardLocation: 'international',
        });
      });
    });
  });

  describe('authenticated flow', () => {
    beforeEach(() => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );
      (selectOnboardingId as unknown as jest.Mock).mockReturnValue(null);
      (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(true);
    });

    describe('when user is REJECTED', () => {
      beforeEach(() => {
        mockGetUserDetails.mockResolvedValue({
          verificationState: 'REJECTED',
        });
      });

      it('navigates to KYCFailed', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
            params: {
              screen: Routes.CARD.ONBOARDING.KYC_FAILED,
            },
          },
        });
      });
    });

    describe('when user is VERIFIED', () => {
      beforeEach(() => {
        mockGetUserDetails.mockResolvedValue({
          verificationState: 'VERIFIED',
        });
      });

      it('navigates to Complete with nextDestination=card_home', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
            params: {
              screen: Routes.CARD.ONBOARDING.COMPLETE,
              params: {
                nextDestination: 'card_home',
              },
            },
          },
        });
      });
    });

    describe('when user is UNVERIFIED', () => {
      beforeEach(() => {
        mockGetUserDetails.mockResolvedValue({
          verificationState: 'UNVERIFIED',
        });
      });

      it('navigates to Onboarding ROOT', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        // UNVERIFIED always navigates to Onboarding ROOT regardless of flow type
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
          },
        });
      });
    });

    describe('when user is PENDING', () => {
      beforeEach(() => {
        mockGetUserDetails.mockResolvedValue({
          verificationState: 'PENDING',
        });
      });

      it('navigates to CardHome', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
          },
        });
      });
    });

    describe('when verification state is unknown/undefined', () => {
      beforeEach(() => {
        mockGetUserDetails.mockResolvedValue({
          verificationState: undefined,
        });
      });

      it('navigates to CardHome as default for authenticated users', async () => {
        await handleCardKycNotification();
        jest.runAllTimers();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.HOME,
          },
        });
      });
    });

    describe('location handling', () => {
      it('uses userCardLocation from state for SDK', async () => {
        (selectUserCardLocation as unknown as jest.Mock).mockReturnValue('us');
        mockGetUserDetails.mockResolvedValue({
          verificationState: 'VERIFIED',
        });

        await handleCardKycNotification();

        expect(CardSDK).toHaveBeenCalledWith({
          cardFeatureFlag: mockCardFeatureFlag,
          userCardLocation: 'us',
        });
      });

      it('uses international when userCardLocation is international', async () => {
        (selectUserCardLocation as unknown as jest.Mock).mockReturnValue(
          'international',
        );
        mockGetUserDetails.mockResolvedValue({
          verificationState: 'VERIFIED',
        });

        await handleCardKycNotification();

        expect(CardSDK).toHaveBeenCalledWith({
          cardFeatureFlag: mockCardFeatureFlag,
          userCardLocation: 'international',
        });
      });
    });
  });

  describe('fallback behavior', () => {
    beforeEach(() => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );
      (selectOnboardingId as unknown as jest.Mock).mockReturnValue(null);
      (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
        false,
      );
    });

    it('navigates to Welcome when no onboardingId and not authenticated', async () => {
      await handleCardKycNotification();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.WELCOME,
        },
      });
    });

    it('logs the fallback navigation', async () => {
      await handleCardKycNotification();

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[handleCardKycNotification] No onboarding or auth state, navigating to Welcome',
      );
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

      it('logs error with Logger.log', async () => {
        await handleCardKycNotification();

        expect(mockLoggerLog).toHaveBeenCalledWith(
          '[handleCardKycNotification] Failed to handle deeplink:',
          mockError,
        );
      });

      it('logs error with Logger.error', async () => {
        await handleCardKycNotification();

        expect(mockLoggerError).toHaveBeenCalledWith(
          mockError,
          '[handleCardKycNotification] Error handling card KYC notification deeplink',
        );
      });

      it('falls back to Card Welcome navigation', async () => {
        await handleCardKycNotification();

        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.WELCOME,
          },
        });
      });
    });

    describe('when getRegistrationStatus throws an error', () => {
      const apiError = new Error('API error');

      beforeEach(() => {
        (selectOnboardingId as unknown as jest.Mock).mockReturnValue(
          'test-onboarding-id',
        );
        mockGetRegistrationStatus.mockRejectedValue(apiError);
      });

      it('logs the error and falls back to Welcome', async () => {
        await handleCardKycNotification();

        expect(mockLoggerError).toHaveBeenCalledWith(
          apiError,
          '[handleCardKycNotification] Error handling card KYC notification deeplink',
        );
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.WELCOME,
          },
        });
      });
    });

    describe('when getUserDetails throws an error', () => {
      const apiError = new Error('API error');

      beforeEach(() => {
        (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
          true,
        );
        mockGetUserDetails.mockRejectedValue(apiError);
      });

      it('logs the error and falls back to Welcome', async () => {
        await handleCardKycNotification();

        expect(mockLoggerError).toHaveBeenCalledWith(
          apiError,
          '[handleCardKycNotification] Error handling card KYC notification deeplink',
        );
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.WELCOME,
          },
        });
      });
    });

    describe('when fallback navigation fails', () => {
      const mainError = new Error('Main error');
      const navError = new Error('Navigation error');

      beforeEach(() => {
        mockGetState.mockImplementation(() => {
          throw mainError;
        });
        mockNavigate
          .mockImplementationOnce(() => {
            throw navError;
          })
          .mockImplementation(() => undefined);
      });

      it('logs the navigation error', async () => {
        await handleCardKycNotification();

        expect(mockLoggerError).toHaveBeenCalledWith(
          navError,
          '[handleCardKycNotification] Failed to navigate to fallback screen',
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

    it('logs starting message', async () => {
      await handleCardKycNotification();

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[handleCardKycNotification] Starting card KYC notification deeplink handling',
      );
    });

    it('logs user state', async () => {
      (selectOnboardingId as unknown as jest.Mock).mockReturnValue(
        'test-onboarding-id',
      );
      (selectIsAuthenticatedCard as unknown as jest.Mock).mockReturnValue(
        false,
      );
      mockGetRegistrationStatus.mockResolvedValue({
        verificationState: 'VERIFIED',
      });

      await handleCardKycNotification();

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[handleCardKycNotification] User state:',
        {
          hasOnboardingId: true,
          isAuthenticated: false,
        },
      );
    });

    it('logs success message after navigation', async () => {
      (selectOnboardingId as unknown as jest.Mock).mockReturnValue(
        'test-onboarding-id',
      );
      mockGetRegistrationStatus.mockResolvedValue({
        verificationState: 'VERIFIED',
      });

      await handleCardKycNotification();

      expect(mockLoggerLog).toHaveBeenCalledWith(
        '[handleCardKycNotification] Card KYC notification deeplink handled successfully',
      );
    });
  });
});
