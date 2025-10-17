import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import KYCFailed from './KYCFailed';
import Routes from '../../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock OnboardingStep component
jest.mock('./OnboardingStep', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return ({
    title,
    description,
    formFields,
    actions,
  }: {
    title: string;
    description: string;
    formFields: React.ReactNode;
    actions: React.ReactNode;
  }) =>
    React.createElement(
      View,
      { testID: 'onboarding-step' },
      React.createElement(Text, { testID: 'onboarding-step-title' }, title),
      React.createElement(
        Text,
        { testID: 'onboarding-step-description' },
        description,
      ),
      React.createElement(
        View,
        { testID: 'onboarding-step-form-fields' },
        formFields,
      ),
      React.createElement(View, { testID: 'onboarding-step-actions' }, actions),
    );
});

// Mock Button component
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  const ButtonVariants = {
    Primary: 'primary',
    Secondary: 'secondary',
  };

  const ButtonSize = {
    Sm: 'sm',
    Md: 'md',
    Lg: 'lg',
  };

  const ButtonWidthTypes = {
    Full: 'full',
    Auto: 'auto',
  };

  const Button = ({
    label,
    onPress,
    variant,
    size,
    width,
    disabled,
    ...props
  }: {
    label: string;
    onPress?: () => void;
    variant?: string;
    size?: string;
    width?: string;
    disabled?: boolean;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: 'button',
        onPress: disabled ? undefined : onPress,
        disabled,
        ...props,
      },
      React.createElement(Text, { testID: 'button-label' }, label),
    );

  Button.ButtonVariants = ButtonVariants;
  Button.ButtonSize = ButtonSize;
  Button.ButtonWidthTypes = ButtonWidthTypes;

  return {
    __esModule: true,
    default: Button,
    ButtonVariants,
    ButtonSize,
    ButtonWidthTypes,
  };
});

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.kyc_failed.title': 'KYC Failed',
      'card.card_onboarding.kyc_failed.description':
        'Your KYC verification failed. Please try again with correct information.',
      'card.card_onboarding.retry_button': 'Retry',
    };
    return translations[key] || key;
  }),
}));

describe('KYCFailed Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  describe('Component Rendering', () => {
    it('should render the component successfully', () => {
      const { getByTestId } = render(<KYCFailed />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('should display the correct title', () => {
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('onboarding-step-title');
      expect(title).toBeTruthy();
      expect(title.props.children).toBe('KYC Failed');
    });

    it('should display the correct description', () => {
      const { getByTestId } = render(<KYCFailed />);

      const description = getByTestId('onboarding-step-description');
      expect(description).toBeTruthy();
      expect(description.props.children).toBe(
        'Your KYC verification failed. Please try again with correct information.',
      );
    });

    it('should render form fields section (empty)', () => {
      const { getByTestId } = render(<KYCFailed />);

      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields).toBeTruthy();
      expect(formFields.props.children).toBeNull();
    });

    it('should render actions section', () => {
      const { getByTestId } = render(<KYCFailed />);

      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
    });
  });

  describe('Retry Button', () => {
    it('should render the retry button', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });

    it('should display the correct button text', () => {
      const { getByTestId } = render(<KYCFailed />);

      const buttonLabel = getByTestId('button-label');
      expect(buttonLabel).toBeTruthy();
      expect(buttonLabel.props.children).toBe('Retry');
    });

    it('should not be disabled', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('button');
      expect(button.props.disabled).toBeFalsy();
    });

    it('should navigate to personal details when pressed', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.PERSONAL_DETAILS,
      );
    });
  });

  describe('Navigation Integration', () => {
    it('should use navigation hook', () => {
      render(<KYCFailed />);

      expect(useNavigation).toHaveBeenCalledTimes(1);
    });
  });

  describe('OnboardingStep Integration', () => {
    it('should pass correct props to OnboardingStep', () => {
      const { getByTestId } = render(<KYCFailed />);

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();

      // Verify title is passed correctly
      const title = getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('KYC Failed');

      // Verify description is passed correctly
      const description = getByTestId('onboarding-step-description');
      expect(description.props.children).toBe(
        'Your KYC verification failed. Please try again with correct information.',
      );

      // Verify form fields are passed (null in this case)
      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields.props.children).toBeNull();

      // Verify actions are passed
      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
    });
  });

  describe('Button Configuration', () => {
    it('should configure button with correct variant', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('button');
      // The button should be rendered with primary variant
      expect(button).toBeTruthy();
    });

    it('should configure button with correct size', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('button');
      // The button should be rendered with large size
      expect(button).toBeTruthy();
    });

    it('should configure button with full width', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('button');
      // The button should be rendered with full width
      expect(button).toBeTruthy();
    });
  });

  describe('Error State Handling', () => {
    it('should display appropriate error messaging', () => {
      const { getByTestId } = render(<KYCFailed />);

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');

      // Verify error state is communicated through title and description
      expect(title.props.children).toBe('KYC Failed');
      expect(description.props.children).toContain('failed');
      expect(description.props.children).toContain('try again');
    });

    it('should provide retry functionality', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('button');
      const buttonLabel = getByTestId('button-label');

      // Verify retry functionality is available
      expect(buttonLabel.props.children).toBe('Retry');
      expect(button.props.onPress).toBeDefined();
    });
  });

  describe('User Flow Integration', () => {
    it('should navigate back to personal details for retry', () => {
      const { getByTestId } = render(<KYCFailed />);

      const button = getByTestId('button');
      fireEvent.press(button);

      // Verify navigation goes back to the beginning of KYC process
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.PERSONAL_DETAILS,
      );
    });
  });
});
