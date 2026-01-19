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

jest.mock('../../../util/device', () => ({
  isMediumDevice: jest.fn(),
  isAndroid: jest.fn(),
  isIos: jest.fn(),
}));

// Mock navigation
const mockReplace = jest.fn();

const mockNavigation = {
  replace: mockReplace,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: jest.fn(),
}));

const mockRoute = {
  params: {
    accountName: 'test@example.com',
    oauthLoginSuccess: true,
    onboardingTraceCtx: { traceId: 'test-trace' },
  },
};

describe('SocialLoginIosUser', () => {
  describe('SocialLoginSuccessNewUser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
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
        },
      );
    });
  });

  describe('SocialLoginSuccessExistingUser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
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
      expect(mockNavigation.replace).toHaveBeenCalledWith('Rehydrate', {
        previous_screen: 'onboarding',
        oauthLoginSuccess: true,
        onboardingTraceCtx: { traceId: 'test-trace' },
      });
    });
  });
});
