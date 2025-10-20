import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import VerifyIdentity from './VerifyIdentity';
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
  const { View, Text } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
    Text: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(Text, props, children),
  };
});

// Mock Button component
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

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
        testID: 'verify-identity-continue-button',
        onPress,
        ...props,
      },
      React.createElement(
        Text,
        { testID: 'verify-identity-continue-button-text' },
        label,
      ),
    );

  // Mock the enums
  MockButton.ButtonSize = {
    Sm: '32',
    Md: '40',
    Lg: '48',
    Auto: 'auto',
  };

  MockButton.ButtonVariants = {
    Link: 'Link',
    Primary: 'Primary',
    Secondary: 'Secondary',
  };

  MockButton.ButtonWidthTypes = {
    Auto: 'auto',
    Full: 'full',
  };

  return {
    __esModule: true,
    default: MockButton,
    ButtonSize: MockButton.ButtonSize,
    ButtonVariants: MockButton.ButtonVariants,
    ButtonWidthTypes: MockButton.ButtonWidthTypes,
  };
});

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_onboarding.verify_identity.title': 'Verify your identity',
      'card.card_onboarding.verify_identity.description':
        'We need to verify your identity to continue with your card application.',
      'card.card_onboarding.confirm_button': 'Continue',
    };
    return mockStrings[key] || key;
  }),
}));

describe('VerifyIdentity Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  describe('Component Rendering', () => {
    it('should render the component correctly', () => {
      const { getByTestId } = render(<VerifyIdentity />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display the correct title and description', () => {
      const { getByTestId } = render(<VerifyIdentity />);

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');

      expect(title.props.children).toBe('Verify your identity');
      expect(description.props.children).toBe(
        'We need to verify your identity to continue with your card application.',
      );
    });
  });

  describe('Form Fields', () => {
    it('should render empty form fields section', () => {
      const { getByTestId } = render(<VerifyIdentity />);

      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields).toBeTruthy();
      expect(formFields.props.children).toBeNull();
    });
  });

  describe('Continue Button', () => {
    it('should render the continue button', () => {
      const { getByTestId } = render(<VerifyIdentity />);

      const button = getByTestId('verify-identity-continue-button');
      const buttonText = getByTestId('verify-identity-continue-button-text');

      expect(button).toBeTruthy();
      expect(buttonText).toBeTruthy();
      expect(buttonText.props.children).toBe('Continue');
    });

    it('should navigate to validating KYC screen when continue button is pressed', () => {
      const { getByTestId } = render(<VerifyIdentity />);

      const button = getByTestId('verify-identity-continue-button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.VALIDATING_KYC,
      );
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should have correct button properties', () => {
      const { getByTestId } = render(<VerifyIdentity />);

      const button = getByTestId('verify-identity-continue-button');

      // Button should be rendered with proper test ID
      expect(button).toBeTruthy();
    });
  });

  describe('Navigation Integration', () => {
    it('should use navigation hook correctly', () => {
      render(<VerifyIdentity />);

      expect(useNavigation).toHaveBeenCalled();
    });

    it('should handle navigation when button is pressed multiple times', () => {
      const { getByTestId } = render(<VerifyIdentity />);

      const button = getByTestId('verify-identity-continue-button');

      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.VALIDATING_KYC,
      );
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to OnboardingStep', () => {
      const { getByTestId } = render(<VerifyIdentity />);

      const onboardingStep = getByTestId('onboarding-step');
      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const formFields = getByTestId('onboarding-step-form-fields');
      const actions = getByTestId('onboarding-step-actions');

      expect(onboardingStep).toBeTruthy();
      expect(title.props.children).toBe('Verify your identity');
      expect(description.props.children).toBe(
        'We need to verify your identity to continue with your card application.',
      );
      expect(formFields.props.children).toBeNull();
      expect(actions).toBeTruthy();
    });

    it('should render actions section with continue button', () => {
      const { getByTestId } = render(<VerifyIdentity />);

      const actions = getByTestId('onboarding-step-actions');
      const button = getByTestId('verify-identity-continue-button');

      expect(actions).toBeTruthy();
      expect(button).toBeTruthy();
    });
  });

  describe('i18n Integration', () => {
    it('should use correct i18n keys for title and description', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyIdentity />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verify_identity.title',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verify_identity.description',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.confirm_button',
      );
    });
  });
});
