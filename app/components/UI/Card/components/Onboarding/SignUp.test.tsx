import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import SignUp, { MOCK_COUNTRIES } from './SignUp';
import { validateEmail } from '../../../Ramp/Deposit/utils';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../Ramp/Deposit/utils', () => ({
  validateEmail: jest.fn(),
}));

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: jest.fn(),
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
    Text: ({
      children,
      testID,
      variant,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      variant?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(
        Text,
        { testID: testID || 'text', 'data-variant': variant, ...props },
        children,
      ),
    TextVariant: {
      BodySm: 'BodySm',
    },
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
    isError,
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
    isError?: boolean;
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
      style: isError ? { borderColor: 'red' } : {},
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

// Mock SelectComponent
jest.mock('../../../SelectComponent', () => {
  const React = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return ({
    options,
    selectedValue,
    onValueChange,
    label,
    defaultValue,
    testID,
  }: {
    options?: { value: string; label: string }[];
    selectedValue?: string;
    onValueChange?: (value: string) => void;
    label?: string;
    defaultValue?: string;
    testID?: string;
  }) =>
    React.createElement(
      View,
      { testID: testID || 'select-component' },
      React.createElement(Text, { testID: 'select-label' }, label),
      React.createElement(
        TouchableOpacity,
        {
          testID: 'select-trigger',
          onPress: () => onValueChange?.('us'),
        },
        React.createElement(
          Text,
          { testID: 'select-value' },
          options?.find((opt) => opt.value === selectedValue)?.label ||
            defaultValue,
        ),
      ),
    );
});

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_onboarding.sign_up.title': 'Sign Up',
      'card.card_onboarding.sign_up.description':
        'Create your account to get started',
      'card.card_onboarding.sign_up.email_label': 'Email',
      'card.card_onboarding.sign_up.email_placeholder': 'Enter your email',
      'card.card_onboarding.sign_up.password_label': 'Password',
      'card.card_onboarding.sign_up.password_placeholder':
        'Enter your password',
      'card.card_onboarding.sign_up.confirm_password_label': 'Confirm Password',
      'card.card_onboarding.sign_up.country_label': 'Country',
      'card.card_onboarding.sign_up.country_placeholder': 'Select your country',
      'card.card_onboarding.continue_button': 'Continue',
      'card.card_onboarding.sign_up.invalid_email':
        'Please enter a valid email address',
      'card.card_onboarding.sign_up.password_mismatch':
        'Passwords do not match',
    };
    return mockStrings[key] || key;
  }),
}));

describe('SignUp Component', () => {
  const mockNavigate = jest.fn();
  const mockValidateEmail = validateEmail as jest.MockedFunction<
    typeof validateEmail
  >;
  const mockUseDebouncedValue = useDebouncedValue as jest.MockedFunction<
    typeof useDebouncedValue
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
    mockUseDebouncedValue.mockImplementation((value) => value);
    mockValidateEmail.mockReturnValue(true);
  });

  describe('Component Rendering', () => {
    it('should render the SignUp component correctly', () => {
      const { getByTestId } = render(<SignUp />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display correct title and description', () => {
      const { getByTestId } = render(<SignUp />);

      expect(getByTestId('onboarding-step-title')).toHaveTextContent('Sign Up');
      expect(getByTestId('onboarding-step-description')).toHaveTextContent(
        'Create your account to get started',
      );
    });
  });

  describe('Form Fields', () => {
    it('should render all form fields', () => {
      const { getAllByTestId } = render(<SignUp />);

      const labels = getAllByTestId('label');
      const textFields = getAllByTestId('text-field');
      const selectComponent = getAllByTestId('select-component');

      expect(labels).toHaveLength(4); // Email, Password, Confirm Password, Country
      expect(textFields).toHaveLength(3); // Email, Password, Confirm Password
      expect(selectComponent).toHaveLength(1); // Country selector
    });

    it('should render email field with correct properties', () => {
      const { getAllByTestId } = render(<SignUp />);

      const textFields = getAllByTestId('text-field');
      const emailField = textFields[0];

      expect(emailField.props.placeholder).toBe('Enter your email');
      expect(emailField.props.accessibilityLabel).toBe('Email');
      expect(emailField.props.keyboardType).toBe('email-address');
    });

    it('should render password fields with correct properties', () => {
      const { getAllByTestId } = render(<SignUp />);

      const textFields = getAllByTestId('text-field');
      const passwordField = textFields[1];
      const confirmPasswordField = textFields[2];

      expect(passwordField.props.placeholder).toBe('Enter your password');
      expect(passwordField.props.accessibilityLabel).toBe('Password');
      expect(confirmPasswordField.props.placeholder).toBe(
        'Enter your password',
      );
      expect(confirmPasswordField.props.accessibilityLabel).toBe(
        'Confirm Password',
      );
    });

    it('should render country selector with correct properties', () => {
      const { getByTestId } = render(<SignUp />);

      const selectComponent = getByTestId('select-component');
      const selectLabel = getByTestId('select-label');

      expect(selectLabel).toHaveTextContent('Country');
      expect(selectComponent).toBeTruthy();
    });
  });

  describe('Continue Button', () => {
    it('should render continue button', () => {
      const { getByTestId } = render(<SignUp />);

      const button = getByTestId('button');
      const buttonLabel = getByTestId('button-label');

      expect(button).toBeTruthy();
      expect(buttonLabel).toHaveTextContent('Continue');
    });

    it('should be disabled when form is incomplete', () => {
      const { getByTestId } = render(<SignUp />);

      const button = getByTestId('button');

      expect(button.props.disabled).toBe(true);
    });
  });

  describe('MOCK_COUNTRIES Data', () => {
    it('should export MOCK_COUNTRIES with correct structure', () => {
      expect(MOCK_COUNTRIES).toBeDefined();
      expect(Array.isArray(MOCK_COUNTRIES.countries)).toBe(true);
      expect(MOCK_COUNTRIES.countries.length).toBeGreaterThan(0);

      const firstCountry = MOCK_COUNTRIES.countries[0];
      expect(firstCountry).toHaveProperty('id');
      expect(firstCountry).toHaveProperty('name');
      expect(firstCountry).toHaveProperty('callingCode');
    });

    it('should include expected countries', () => {
      const countryKeys = MOCK_COUNTRIES.countries.map(
        (country) => country.iso3166alpha2,
      );

      expect(countryKeys).toContain('US');
      expect(countryKeys).toContain('FR');
      expect(countryKeys).toContain('GB');
      expect(countryKeys).toContain('DE');
    });
  });

  describe('Component Integration', () => {
    it('should integrate properly with OnboardingStep component', () => {
      const { getByTestId } = render(<SignUp />);

      const onboardingStep = getByTestId('onboarding-step');
      const formFields = getByTestId('onboarding-step-form-fields');
      const actions = getByTestId('onboarding-step-actions');

      expect(onboardingStep).toBeTruthy();
      expect(formFields).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('should handle debounced values correctly', () => {
      mockUseDebouncedValue.mockImplementation((value) => value);

      const { getAllByTestId } = render(<SignUp />);

      const textFields = getAllByTestId('text-field');
      const emailField = textFields[0];

      fireEvent.changeText(emailField, 'test@example.com');

      expect(mockUseDebouncedValue).toHaveBeenCalledWith(
        'test@example.com',
        1000,
      );
    });
  });
});
