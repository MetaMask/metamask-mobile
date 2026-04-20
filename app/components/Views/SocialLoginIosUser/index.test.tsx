import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SocialLoginIosUser from '.';
import Device from '../../../util/device';
import { OnboardingSelectorIDs } from '../Onboarding/Onboarding.testIds';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';
import { useRoute } from '@react-navigation/native';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { AccountType } from '../../../constants/onboarding';

jest.mock('../../../util/device', () => ({
  isMediumDevice: jest.fn(),
  isAndroid: jest.fn(),
  isIos: jest.fn(),
}));

// Mock navigation
const mockReplace = jest.fn();

const mockNavigation = {
  replace: mockReplace,
  dispatch: jest.fn((action) => {
    if (action.type === 'REPLACE') {
      mockReplace(action.payload.name, action.payload.params);
    }
  }),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

const mockRoute = {
  params: {
    accountName: 'test@example.com',
    oauthLoginSuccess: true,
    onboardingTraceCtx: { traceId: 'test-trace' },
    provider: 'google',
  },
};

describe('SocialLoginIosUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockBuild.mockReturnValue('mockEvent');
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);
  });

  describe('SocialLoginSuccessNewUser', () => {
    beforeEach(() => {
      (Device.isMediumDevice as jest.Mock).mockReturnValue(false);
      (useRoute as jest.Mock).mockReturnValue(mockRoute);
    });

    it('renders match snapshot', () => {
      const { toJSON } = renderWithProvider(<SocialLoginIosUser type="new" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders match snapshot with medium device', () => {
      (Device.isMediumDevice as jest.Mock).mockReturnValue(true);
      const { toJSON } = renderWithProvider(<SocialLoginIosUser type="new" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders title and button with correct text', () => {
      const { getByText } = renderWithProvider(
        <SocialLoginIosUser type="new" />,
      );
      expect(
        getByText(strings('social_login_ios_user.new_user_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('social_login_ios_user.new_user_button')),
      ).toBeOnTheScreen();
    });

    it('navigate to rehydrate screen on click of secure wallet button', () => {
      const { getByTestId } = renderWithProvider(
        <SocialLoginIosUser type="new" />,
      );
      const secureWalletButton = getByTestId(
        OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON,
      );
      fireEvent.press(secureWalletButton);
      expect(mockNavigation.replace).toHaveBeenCalledWith(
        Routes.ONBOARDING.CHOOSE_PASSWORD,
        {
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: true,
          onboardingTraceCtx: { traceId: 'test-trace' },
          accountName: 'test@example.com',
          provider: 'google',
        },
      );
    });

    it('tracks viewed and CTA events with account_type', () => {
      const { getByTestId } = renderWithProvider(
        <SocialLoginIosUser type="new" />,
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_LOGIN_IOS_SUCCESS_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        is_new_user: true,
        account_type: AccountType.MetamaskGoogle,
      });
      expect(mockTrackEvent).toHaveBeenCalledWith('mockEvent');

      const secureWalletButton = getByTestId(
        OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON,
      );
      fireEvent.press(secureWalletButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_LOGIN_IOS_SUCCESS_CTA_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenLastCalledWith({
        is_new_user: true,
        account_type: AccountType.MetamaskGoogle,
      });
    });
  });

  describe('SocialLoginSuccessExistingUser', () => {
    beforeEach(() => {
      (useRoute as jest.Mock).mockReturnValue(mockRoute);
      (Device.isMediumDevice as jest.Mock).mockReturnValue(false);
    });

    it('renders match snapshot', () => {
      const { toJSON } = renderWithProvider(
        <SocialLoginIosUser type="existing" />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders match snapshot with medium device', () => {
      (Device.isMediumDevice as jest.Mock).mockReturnValue(true);
      const { toJSON } = renderWithProvider(
        <SocialLoginIosUser type="existing" />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders title and button with correct text', () => {
      const { getByText } = renderWithProvider(
        <SocialLoginIosUser type="existing" />,
      );
      expect(
        getByText(strings('social_login_ios_user.existing_user_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('social_login_ios_user.existing_user_button')),
      ).toBeOnTheScreen();
    });

    it('navigate to rehydrate screen on click of secure wallet button', () => {
      const { getByTestId } = renderWithProvider(
        <SocialLoginIosUser type="existing" />,
      );
      const secureWalletButton = getByTestId(
        OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON,
      );
      fireEvent.press(secureWalletButton);
      expect(mockNavigation.replace).toHaveBeenCalledWith(
        Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE,
        {
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: true,
          onboardingTraceCtx: { traceId: 'test-trace' },
          provider: 'google',
        },
      );
    });

    it('tracks viewed and CTA events with imported account_type', () => {
      const { getByTestId } = renderWithProvider(
        <SocialLoginIosUser type="existing" />,
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_LOGIN_IOS_SUCCESS_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        is_new_user: false,
        account_type: AccountType.ImportedGoogle,
      });

      const secureWalletButton = getByTestId(
        OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON,
      );
      fireEvent.press(secureWalletButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_LOGIN_IOS_SUCCESS_CTA_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenLastCalledWith({
        is_new_user: false,
        account_type: AccountType.ImportedGoogle,
      });
    });
  });
});
