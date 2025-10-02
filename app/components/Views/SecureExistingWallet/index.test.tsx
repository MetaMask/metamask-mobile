import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SecureExistingWallet from '.';
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

describe('SecureExistingWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Device.isMediumDevice as jest.Mock).mockReturnValue(false);
  });

  it('renders match snapshot', () => {
    const { toJSON } = renderWithProvider(<SecureExistingWallet />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders match snapshot with medium device', () => {
    (Device.isMediumDevice as jest.Mock).mockReturnValue(true);
    const { toJSON } = renderWithProvider(<SecureExistingWallet />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders title with correct text', () => {
    const { getByText } = renderWithProvider(<SecureExistingWallet />);
    expect(getByText(strings('onboarding.you_are_logged_in'))).toBeTruthy();
  });

  it('navigate to rehydrate screen on click of secure wallet button', () => {
    const { getByTestId } = renderWithProvider(<SecureExistingWallet />);
    const secureWalletButton = getByTestId(
      OnboardingSelectorIDs.SECURE_EXISTING_WALLET_BUTTON,
    );
    fireEvent.press(secureWalletButton);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Rehydrate', {
      previous_screen: 'onboarding',
      oauthLoginSuccess: true,
    });
  });
});
