import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ValidatingKYC from './ValidatingKYC';
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

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  const Box = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(View, { testID: 'box', ...props }, children);

  const Text = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(RNText, { testID: 'text', ...props }, children);

  return {
    Box,
    Text,
  };
});

// Mock Button component
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  const ButtonSize = {
    Sm: 'sm',
    Md: 'md',
    Lg: 'lg',
  };

  const ButtonVariants = {
    Primary: 'primary',
    Secondary: 'secondary',
    Link: 'link',
  };

  const ButtonWidthTypes = {
    Auto: 'auto',
    Full: 'full',
  };

  const MockButton = ({
    label,
    onPress,
    variant,
    size,
    width,
    ...props
  }: {
    label: string;
    onPress: () => void;
    variant: string;
    size: string;
    width: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: 'continue-button',
        onPress,
        ...props,
      },
      React.createElement(Text, { testID: 'button-text' }, label),
    );

  MockButton.Size = ButtonSize;
  MockButton.Variants = ButtonVariants;
  MockButton.WidthTypes = ButtonWidthTypes;

  return {
    __esModule: true,
    default: MockButton,
    ButtonSize,
    ButtonVariants,
    ButtonWidthTypes,
  };
});

// Mock ActivityIndicator
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');

  return {
    ...RN,
    ActivityIndicator: ({ ...props }) =>
      React.createElement(RN.View, { testID: 'activity-indicator', ...props }),
  };
});

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.validating_kyc.title': 'Validating your identity',
      'card.card_onboarding.continue_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

describe('ValidatingKYC Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  describe('Component Rendering', () => {
    it('should render the component correctly', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display the correct title', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const titleElement = getByTestId('onboarding-step-title');
      expect(titleElement.props.children).toBe('Validating your identity');
    });

    it('should display empty description', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const descriptionElement = getByTestId('onboarding-step-description');
      expect(descriptionElement.props.children).toBe('');
    });
  });

  describe('Form Fields', () => {
    it('should render activity indicator in form fields', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const formFields = getByTestId('onboarding-step-form-fields');

      expect(formFields).toBeTruthy();
      expect(formFields.children).toBeTruthy();
    });
  });

  describe('Continue Button', () => {
    it('should render the continue button', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const continueButton = getByTestId('continue-button');
      expect(continueButton).toBeTruthy();
    });

    it('should display correct button text', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const buttonText = getByTestId('button-text');
      expect(buttonText.props.children).toBe('Continue');
    });

    it('should navigate to KYC_FAILED when continue button is pressed', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const continueButton = getByTestId('continue-button');
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.KYC_FAILED,
      );
    });

    it('should handle multiple button presses', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const continueButton = getByTestId('continue-button');
      fireEvent.press(continueButton);
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.KYC_FAILED,
      );
    });
  });

  describe('Navigation Integration', () => {
    it('should use navigation hook', () => {
      render(<ValidatingKYC />);

      expect(useNavigation).toHaveBeenCalled();
    });

    it('should call navigate with correct route', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const continueButton = getByTestId('continue-button');
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.KYC_FAILED,
      );
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to OnboardingStep', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const onboardingStep = getByTestId('onboarding-step');
      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const formFields = getByTestId('onboarding-step-form-fields');
      const actions = getByTestId('onboarding-step-actions');

      expect(onboardingStep).toBeTruthy();
      expect(title.props.children).toBe('Validating your identity');
      expect(description.props.children).toBe('');
      expect(formFields).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('should render actions section with continue button', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const actionsSection = getByTestId('onboarding-step-actions');
      const continueButton = getByTestId('continue-button');

      expect(actionsSection).toBeTruthy();
      expect(continueButton).toBeTruthy();
    });
  });

  describe('i18n Integration', () => {
    it('should use correct i18n keys for text content', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const title = getByTestId('onboarding-step-title');
      const buttonText = getByTestId('button-text');

      expect(title.props.children).toBe('Validating your identity');
      expect(buttonText.props.children).toBe('Continue');
    });
  });
});
