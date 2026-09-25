import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SocialLoginIosUser from '.';
import Device from '../../../util/device';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
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
    (useRoute as jest.Mock).mockReturnValue(mockRoute);
    (Device.isMediumDevice as jest.Mock).mockReturnValue(false);
  });

  it('renders correctly', () => {
    const { getByText } = renderWithProvider(<SocialLoginIosUser />);
    expect(
      getByText(strings('social_login_ios_user.existing_user_title')),
    ).toBeOnTheScreen();
  });

  it('renders correctly with medium device', () => {
    (Device.isMediumDevice as jest.Mock).mockReturnValue(true);
    const { getByText } = renderWithProvider(<SocialLoginIosUser />);
    expect(
      getByText(strings('social_login_ios_user.existing_user_title')),
    ).toBeOnTheScreen();
  });

  it('renders title and button with correct text', () => {
    const { getByText } = renderWithProvider(<SocialLoginIosUser />);
    expect(
      getByText(strings('social_login_ios_user.existing_user_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('social_login_ios_user.existing_user_button')),
    ).toBeOnTheScreen();
  });

  it('navigate to rehydrate screen on click of unlock wallet button', () => {
    const { getByTestId } = renderWithProvider(<SocialLoginIosUser />);
    const unlockWalletButton = getByTestId(
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON,
    );
    fireEvent.press(unlockWalletButton);
    expect(mockNavigation.replace).toHaveBeenCalledWith(
      Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE,
      {
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
        provider: 'google',
      },
    );
  });

  it('tracks viewed and CTA events with imported account_type', () => {
    const { getByTestId } = renderWithProvider(<SocialLoginIosUser />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LOGIN_IOS_SUCCESS_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      is_new_user: false,
      account_type: AccountType.ImportedGoogle,
    });

    const unlockWalletButton = getByTestId(
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON,
    );
    fireEvent.press(unlockWalletButton);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LOGIN_IOS_SUCCESS_CTA_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenLastCalledWith({
      is_new_user: false,
      account_type: AccountType.ImportedGoogle,
    });
  });
});
