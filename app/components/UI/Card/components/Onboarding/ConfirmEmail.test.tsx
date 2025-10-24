import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ConfirmEmail from './ConfirmEmail';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
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
  const { View } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(
        View,
        { testID: testID || 'box', ...props },
        children,
      ),
  };
});

// Mock Button component
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  const MockButton = ({
    label,
    onPress,
    isDisabled,
    testID,
    size,
    variant,
    width,
    ...props
  }: {
    label: string;
    onPress?: () => void;
    isDisabled?: boolean;
    testID?: string;
    size?: string;
    variant?: string;
    width?: string;
    [key: string]: unknown;
  }) =>
    React.createElement(
      TouchableOpacity,
      { testID: testID || 'button', onPress, disabled: isDisabled, ...props },
      React.createElement(Text, { testID: 'button-label' }, label),
    );

  return {
    __esModule: true,
    default: MockButton,
    ButtonSize: {
      Lg: 'Lg',
      Md: 'Md',
      Sm: 'Sm',
    },
    ButtonVariants: {
      Primary: 'Primary',
      Secondary: 'Secondary',
    },
    ButtonWidthTypes: {
      Full: 'Full',
      Auto: 'Auto',
    },
  };
});

// Mock TextField component and TextFieldSize
jest.mock('../../../../../component-library/components/Form/TextField', () => {
  const React = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  const MockTextField = ({
    onChangeText,
    placeholder,
    value,
    accessibilityLabel,
    testID,
    returnKeyType,
    keyboardType,
    size,
    numberOfLines,
    maxLength,
    autoCapitalize,
    ...props
  }: {
    onChangeText?: (text: string) => void;
    placeholder?: string;
    value?: string;
    accessibilityLabel?: string;
    testID?: string;
    returnKeyType?: string;
    keyboardType?: string;
    size?: string;
    numberOfLines?: number;
    maxLength?: number;
    autoCapitalize?: string;
    [key: string]: unknown;
  }) =>
    React.createElement(TextInput, {
      testID: testID || 'text-field',
      onChangeText,
      placeholder,
      value,
      accessibilityLabel,
      returnKeyType,
      keyboardType,
      numberOfLines,
      maxLength,
      autoCapitalize,
      ...props,
    });

  return {
    __esModule: true,
    default: MockTextField,
    TextFieldSize: {
      Lg: 'Lg',
      Md: 'Md',
      Sm: 'Sm',
    },
  };
});

// Mock Label component
jest.mock('../../../../../component-library/components/Form/Label', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => React.createElement(Text, { testID: testID || 'label' }, children);
});

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: { [key: string]: string }) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_onboarding.confirm_email.title': 'Confirm your email',
      'card.card_onboarding.confirm_email.description':
        'We sent a confirmation code to {email}',
      'card.card_onboarding.confirm_email.confirm_code_label':
        'Confirmation code',
      'card.card_onboarding.confirm_email.confirm_code_placeholder':
        'Enter confirmation code',
      'card.card_onboarding.continue_button': 'Continue',
    };

    let result = mockStrings[key] || key;
    if (options) {
      Object.keys(options).forEach((optionKey) => {
        result = result.replace(`{${optionKey}}`, options[optionKey]);
      });
    }
    return result;
  }),
}));

describe('ConfirmEmail Component', () => {
  const mockNavigate = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as never);
    mockUseParams.mockReturnValue({ email: 'test@example.com' });
  });

  describe('Component Rendering', () => {
    it('should render the ConfirmEmail component correctly', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display correct title and description with email', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      expect(getByTestId('onboarding-step-title')).toHaveTextContent(
        'Confirm your email',
      );
      expect(getByTestId('onboarding-step-description')).toHaveTextContent(
        'We sent a confirmation code to test@example.com',
      );
    });
  });

  describe('Form Fields', () => {
    it('should render confirmation code field with correct properties', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      const textField = getByTestId('text-field');
      expect(textField).toBeTruthy();
      expect(textField.props.placeholder).toBe('Enter confirmation code');
      expect(textField.props.keyboardType).toBe('numeric');
      expect(textField.props.maxLength).toBe(255);
      expect(textField.props.numberOfLines).toBe(1);
      expect(textField.props.autoCapitalize).toBe('none');
    });

    it('should render confirmation code label', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      const label = getByTestId('label');
      expect(label).toBeTruthy();
      expect(label).toHaveTextContent('Confirmation code');
    });

    it('should update confirmation code value when text changes', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '123456');

      expect(textField.props.value).toBe('123456');
    });
  });

  describe('Continue Button', () => {
    it('should render continue button', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(getByTestId('button-label')).toHaveTextContent('Continue');
    });

    it('should be disabled when confirmation code is empty', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      const button = getByTestId('button');
      expect(button.props.disabled).toBe(true);
    });

    it('should be enabled when confirmation code is provided', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '123456');

      const button = getByTestId('button');
      expect(button.props.disabled).toBe(false);
    });

    it('should navigate to SET_PHONE_NUMBER when continue button is pressed', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '123456');

      const button = getByTestId('button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.SET_PHONE_NUMBER,
      );
    });
  });

  describe('Component Integration', () => {
    it('should integrate properly with OnboardingStep component', () => {
      const { getByTestId } = render(<ConfirmEmail />);

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();

      // Check that form fields and actions are properly passed
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should handle missing email parameter gracefully', () => {
      mockUseParams.mockReturnValue({ email: undefined });

      const { getByTestId } = render(<ConfirmEmail />);

      expect(getByTestId('onboarding-step-description')).toHaveTextContent(
        'We sent a confirmation code to undefined',
      );
    });
  });
});
