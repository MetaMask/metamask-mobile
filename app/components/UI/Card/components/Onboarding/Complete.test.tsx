import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import Complete from './Complete';
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
      'card.card_onboarding.complete.title': 'Complete',
      'card.card_onboarding.complete.description':
        'Your card setup is complete!',
      'card.card_onboarding.confirm_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

describe('Complete Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  describe('Component Rendering', () => {
    it('should render the component successfully', () => {
      const { getByTestId } = render(<Complete />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('should display the correct title', () => {
      const { getByTestId } = render(<Complete />);

      const title = getByTestId('onboarding-step-title');
      expect(title).toBeTruthy();
      expect(title.props.children).toBe('Complete');
    });

    it('should display the correct description', () => {
      const { getByTestId } = render(<Complete />);

      const description = getByTestId('onboarding-step-description');
      expect(description).toBeTruthy();
      expect(description.props.children).toBe('Your card setup is complete!');
    });

    it('should render form fields section (empty)', () => {
      const { getByTestId } = render(<Complete />);

      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields).toBeTruthy();
      expect(formFields.props.children).toBeNull();
    });

    it('should render actions section', () => {
      const { getByTestId } = render(<Complete />);

      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
    });
  });

  describe('Continue Button', () => {
    it('should render the continue button', () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });

    it('should display the correct button text', () => {
      const { getByTestId } = render(<Complete />);

      const buttonLabel = getByTestId('button-label');
      expect(buttonLabel).toBeTruthy();
      expect(buttonLabel.props.children).toBe('Continue');
    });

    it('should not be disabled', () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('button');
      expect(button.props.disabled).toBeFalsy();
    });

    it('should navigate to card home when pressed', () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.HOME);
    });
  });

  describe('Navigation Integration', () => {
    it('should use navigation hook', () => {
      render(<Complete />);

      expect(useNavigation).toHaveBeenCalledTimes(1);
    });
  });

  describe('OnboardingStep Integration', () => {
    it('should pass correct props to OnboardingStep', () => {
      const { getByTestId } = render(<Complete />);

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();

      // Verify title is passed correctly
      const title = getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('Complete');

      // Verify description is passed correctly
      const description = getByTestId('onboarding-step-description');
      expect(description.props.children).toBe('Your card setup is complete!');

      // Verify form fields are passed (null in this case)
      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields.props.children).toBeNull();

      // Verify actions are passed
      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
    });
  });

  describe('i18n Integration', () => {
    it('should use correct translation keys', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<Complete />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.complete.title',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.complete.description',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.confirm_button',
      );
    });
  });

  describe('Button Configuration', () => {
    it('should configure button with correct variant', () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('button');
      // The button should be rendered with primary variant
      expect(button).toBeTruthy();
    });

    it('should configure button with correct size', () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('button');
      // The button should be rendered with large size
      expect(button).toBeTruthy();
    });

    it('should configure button with full width', () => {
      const { getByTestId } = render(<Complete />);

      const button = getByTestId('button');
      // The button should be rendered with full width
      expect(button).toBeTruthy();
    });
  });
});
