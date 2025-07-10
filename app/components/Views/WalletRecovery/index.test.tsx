import React from 'react';
import { screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WalletRecovery from './index';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(() => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  })),
}));

jest.mock('../SelectSRP', () => {
  const mockReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return mockReact.forwardRef(() => (
    <View testID="select-srp">
      <Text>SelectSRP Component</Text>
    </View>
  ));
});

jest.mock('../../UI/Navbar', () => ({
  getNavigationOptionsTitle: jest.fn((title: string) => ({ title })),
}));

jest.mock('../../../images/google.svg', () => 'GoogleIcon');
jest.mock('../../../images/apple.svg', () => 'AppleIcon');

const mockNavigation = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
};

describe('WalletRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  const renderComponent = (seedlessOnboardingState = {}) =>
    renderWithProvider(<WalletRecovery />, {
      state: {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              authConnection: undefined,
              socialLoginEmail: '',
              userId: '',
              ...seedlessOnboardingState,
            },
          },
        },
      },
    });

  it('render matches snapshot', () => {
    const { toJSON } = renderComponent({
      authConnection: 'google',
      userId: '123',
      socialLoginEmail: 'test@example.com',
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders SRP section and sets navigation options', () => {
    renderComponent();

    expect(
      screen.getByText(strings('protect_your_wallet.srps_title')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('select-srp')).toBeOnTheScreen();
    expect(mockNavigation.setOptions).toHaveBeenCalledWith({
      title: strings('app_settings.manage_recovery_method'),
    });
  });

  it('does not display social recovery when no auth connection', () => {
    renderComponent({ authConnection: '' });

    expect(screen.queryByText(/SOCIAL.*RECOVERY/)).not.toBeOnTheScreen();
    expect(
      screen.queryByText(strings('protect_your_wallet.login_with_social')),
    ).not.toBeOnTheScreen();
  });

  it('displays social not linked state when auth connection exists but no user', () => {
    renderComponent({ authConnection: 'google', userId: '' });

    expect(
      screen.getByText(
        strings('protect_your_wallet.social_recovery_title', {
          authConnection: 'GOOGLE',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('protect_your_wallet.login_with_social')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('protect_your_wallet.setup')),
    ).toBeOnTheScreen();
  });

  it('displays social linked state with masked email when user is logged in', () => {
    renderComponent({
      authConnection: 'google',
      userId: '123',
      socialLoginEmail: 'test@example.com',
    });

    expect(
      screen.getByText(strings('protect_your_wallet.social_recovery_enable')),
    ).toBeOnTheScreen();
    expect(screen.getByText('t********@example.com')).toBeOnTheScreen();
  });

  it('handles Apple private relay email by hiding it', () => {
    renderComponent({
      authConnection: 'apple',
      userId: '123',
      socialLoginEmail: 'user@privaterelay.appleid.com',
    });

    expect(
      screen.getByText(strings('protect_your_wallet.social_recovery_enable')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(/@privaterelay.appleid.com/),
    ).not.toBeOnTheScreen();
  });

  it('displays both social and SRP sections when auth connection exists', () => {
    renderComponent({ authConnection: 'google' });

    expect(
      screen.getByText(
        strings('protect_your_wallet.social_recovery_title', {
          authConnection: 'GOOGLE',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('protect_your_wallet.srps_title')),
    ).toBeOnTheScreen();
  });
});
