import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import SocialLoginSuccessNewUser from './index';
import Routes from '../../../constants/navigation/Routes';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../UI/Navbar', () => ({
  getTransparentOnboardingNavbarOptions: jest.fn(() => ({})),
}));

jest.mock('lottie-react-native', () => 'LottieView');

jest.mock('../../../animations/Celebrating_Fox.json', () => ({}));

const mockNavigation = {
  replace: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {
    accountName: 'test@example.com',
    oauthLoginSuccess: true,
    onboardingTraceCtx: { traceId: 'test-trace' },
  },
};

const mockTheme = {
  colors: {
    background: { default: '#FFFFFF' },
    text: { default: '#000000' },
  },
};

describe('SocialLoginSuccessNewUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useRoute as jest.Mock).mockReturnValue(mockRoute);
    mockUseTheme.mockReturnValue(mockTheme);
  });

  it('should render correctly', () => {
    const { toJSON } = render(<SocialLoginSuccessNewUser />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should display the success title', () => {
    const { getByText } = render(<SocialLoginSuccessNewUser />);
    expect(getByText('social_login_success.title')).toBeTruthy();
  });

  it('should display the set pin button', () => {
    const { getByText } = render(<SocialLoginSuccessNewUser />);
    expect(getByText('social_login_success.set_metamask_pin')).toBeTruthy();
  });

  it('should render fox animation', () => {
    const { toJSON } = render(<SocialLoginSuccessNewUser />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call navigation.replace when Set MetaMask pin button is pressed', () => {
    const { getByText } = render(<SocialLoginSuccessNewUser />);
    const button = getByText('social_login_success.set_metamask_pin');

    fireEvent.press(button);

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

  it('should handle missing route params gracefully', () => {
    (useRoute as jest.Mock).mockReturnValue({ params: undefined });

    const { getByText } = render(<SocialLoginSuccessNewUser />);
    const button = getByText('social_login_success.set_metamask_pin');

    fireEvent.press(button);

    expect(mockNavigation.replace).toHaveBeenCalledWith(
      Routes.ONBOARDING.CHOOSE_PASSWORD,
      {
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: undefined,
        onboardingTraceCtx: undefined,
        accountName: undefined,
      },
    );
  });

  it('should handle partial route params', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        accountName: 'partial@test.com',
      },
    });

    const { getByText } = render(<SocialLoginSuccessNewUser />);
    const button = getByText('social_login_success.set_metamask_pin');

    fireEvent.press(button);

    expect(mockNavigation.replace).toHaveBeenCalledWith(
      Routes.ONBOARDING.CHOOSE_PASSWORD,
      {
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: undefined,
        onboardingTraceCtx: undefined,
        accountName: 'partial@test.com',
      },
    );
  });

  it('should set navigation options on mount', () => {
    render(<SocialLoginSuccessNewUser />);
    expect(mockNavigation.setOptions).toHaveBeenCalledWith({});
  });

  it('should use theme colors for styling', () => {
    const customTheme = {
      colors: {
        background: { default: '#123456' },
        text: { default: '#ABCDEF' },
      },
    };
    mockUseTheme.mockReturnValue(customTheme);

    const { toJSON } = render(<SocialLoginSuccessNewUser />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render without crashing when all props are provided', () => {
    expect(() => render(<SocialLoginSuccessNewUser />)).not.toThrow();
  });

  it('should render without crashing when no props are provided', () => {
    (useRoute as jest.Mock).mockReturnValue({});
    expect(() => render(<SocialLoginSuccessNewUser />)).not.toThrow();
  });
});
