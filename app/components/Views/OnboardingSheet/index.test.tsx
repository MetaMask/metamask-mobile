import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OnboardingSheet from '.';
import { strings } from '../../../../locales/i18n';

// Mock callback functions
const mockOnPressCreate = jest.fn();
const mockOnPressImport = jest.fn();
const mockOnPressContinueWithGoogle = jest.fn();
const mockOnPressContinueWithApple = jest.fn();

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

describe('OnboardingSheet', () => {
  const defaultProps = {
    route: {
      params: {
        onPressCreate: mockOnPressCreate,
        onPressImport: mockOnPressImport,
        onPressContinueWithGoogle: mockOnPressContinueWithGoogle,
        onPressContinueWithApple: mockOnPressContinueWithApple,
        createWallet: false,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('displays terms of use text when in import mode', () => {
      const { getByText } = render(<OnboardingSheet {...defaultProps} />);

      expect(getByText('Terms of Use')).toBeOnTheScreen();
    });

    it('displays terms of use text when in create mode', () => {
      const propsWithCreateWallet = {
        route: {
          params: {
            ...defaultProps.route.params,
            createWallet: true,
          },
        },
      };
      const { getByText } = render(
        <OnboardingSheet {...propsWithCreateWallet} />,
      );

      expect(getByText(strings('onboarding.terms_of_use'))).toBeOnTheScreen();
    });

    it('displays privacy notice text', () => {
      const { getByText } = render(<OnboardingSheet {...defaultProps} />);

      expect(getByText(strings('onboarding.privacy_notice'))).toBeOnTheScreen();
    });
  });

  describe('Behavior Tests', () => {
    describe('Google button interactions', () => {
      it('calls onPressContinueWithGoogle with createWallet=false when import mode', () => {
        const { getByText } = render(<OnboardingSheet {...defaultProps} />);
        const googleButton = getByText(
          strings('onboarding.sign_in_with_google'),
        );
        fireEvent.press(googleButton);
        expect(mockOnPressContinueWithGoogle).toHaveBeenCalledWith(false);
        expect(mockOnPressContinueWithGoogle).toHaveBeenCalledTimes(1);
      });

      it('calls onPressContinueWithApple with createWallet=false when import mode', () => {
        const { getByText } = render(<OnboardingSheet {...defaultProps} />);
        const appleButton = getByText(strings('onboarding.sign_in_with_apple'));
        fireEvent.press(appleButton);
        expect(mockOnPressContinueWithApple).toHaveBeenCalledWith(false);
        expect(mockOnPressContinueWithApple).toHaveBeenCalledTimes(1);
      });

      it('calls onPressContinueWithGoogle with createWallet=true when create mode', () => {
        const propsWithCreateWallet = {
          route: {
            params: {
              ...defaultProps.route.params,
              createWallet: true,
            },
          },
        };
        const { getByText } = render(
          <OnboardingSheet {...propsWithCreateWallet} />,
        );
        const googleButton = getByText(
          strings('onboarding.continue_with_google'),
        );
        fireEvent.press(googleButton);
        expect(mockOnPressContinueWithGoogle).toHaveBeenCalledWith(true);
        expect(mockOnPressContinueWithGoogle).toHaveBeenCalledTimes(1);
      });

      it('calls onPressContinueWithApple with createWallet=true when create mode', () => {
        const propsWithCreateWallet = {
          route: {
            params: {
              ...defaultProps.route.params,
              createWallet: true,
            },
          },
        };
        const { getByText } = render(
          <OnboardingSheet {...propsWithCreateWallet} />,
        );
        const appleButton = getByText(
          strings('onboarding.continue_with_apple'),
        );
        fireEvent.press(appleButton);
        expect(mockOnPressContinueWithApple).toHaveBeenCalledWith(true);
        expect(mockOnPressContinueWithApple).toHaveBeenCalledTimes(1);
      });
    });

    describe('SRP button interactions', () => {
      it('calls onPressImport when createWallet=false and SRP button is pressed', () => {
        const { getByText } = render(<OnboardingSheet {...defaultProps} />);
        const srpButton = getByText(strings('onboarding.import_srp'));

        fireEvent.press(srpButton);

        expect(mockOnPressImport).toHaveBeenCalledTimes(1);
        expect(mockOnPressCreate).not.toHaveBeenCalled();
      });

      it('calls onPressCreate when createWallet=true and SRP button is pressed', () => {
        const propsWithCreateWallet = {
          route: {
            params: {
              ...defaultProps.route.params,
              createWallet: true,
            },
          },
        };
        const { getByText } = render(
          <OnboardingSheet {...propsWithCreateWallet} />,
        );
        const srpButton = getByText(strings('onboarding.continue_with_srp'));

        fireEvent.press(srpButton);

        expect(mockOnPressCreate).toHaveBeenCalledTimes(1);
        expect(mockOnPressImport).not.toHaveBeenCalled();
      });
    });
  });
});
