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

  it('renders correctly', () => {
    const { toJSON } = render(<SocialLoginSuccessNewUser />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the success title', () => {
    const { getByText } = render(<SocialLoginSuccessNewUser />);
    expect(getByText('social_login_success.title')).toBeTruthy();
  });

  it('displays the set pin button', () => {
    const { getByText } = render(<SocialLoginSuccessNewUser />);
    expect(getByText('social_login_success.set_metamask_pin')).toBeTruthy();
  });

  it('renders fox animation', () => {
    const { toJSON } = render(<SocialLoginSuccessNewUser />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to ChoosePassword when Set MetaMask pin button is pressed', () => {
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

  it('handles missing route params gracefully', () => {
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

  it('handles partial route params', () => {
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

  it('sets navigation options on mount', () => {
    render(<SocialLoginSuccessNewUser />);
    expect(mockNavigation.setOptions).toHaveBeenCalledWith({});
  });

  it('uses theme colors for styling', () => {
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

  it('renders without crashing when all props are provided', () => {
    expect(() => render(<SocialLoginSuccessNewUser />)).not.toThrow();
  });

  it('renders without crashing when no props are provided', () => {
    (useRoute as jest.Mock).mockReturnValue({});
    expect(() => render(<SocialLoginSuccessNewUser />)).not.toThrow();
  });
});
