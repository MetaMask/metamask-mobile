import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SocialLoginSuccessExistingUser from '.';
import Device from '../../../util/device';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';

jest.mock('../../../util/device', () => ({
  isMediumDevice: jest.fn(),
  isAndroid: jest.fn(),
  isIos: jest.fn(),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  dispatch: mockDispatch,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('SocialLoginSuccessExistingUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Device.isMediumDevice as jest.Mock).mockReturnValue(false);
  });

  it('renders match snapshot', () => {
    const { toJSON } = renderWithProvider(<SocialLoginSuccessExistingUser />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders match snapshot with medium device', () => {
    (Device.isMediumDevice as jest.Mock).mockReturnValue(true);
    const { toJSON } = renderWithProvider(<SocialLoginSuccessExistingUser />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders title with correct text', () => {
    const { getByText } = renderWithProvider(
      <SocialLoginSuccessExistingUser />,
    );
    expect(getByText(strings('onboarding.you_are_logged_in'))).toBeTruthy();
  });

  it('navigate to rehydrate screen on click of secure wallet button', () => {
    const { getByTestId } = renderWithProvider(
      <SocialLoginSuccessExistingUser />,
    );
    const secureWalletButton = getByTestId(
      OnboardingSelectorIDs.SOCIAL_LOGIN_SUCCESS_EXISTING_USER_BUTTON,
    );
    fireEvent.press(secureWalletButton);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Rehydrate', {
      previous_screen: 'onboarding',
      oauthLoginSuccess: true,
    });
  });
});
