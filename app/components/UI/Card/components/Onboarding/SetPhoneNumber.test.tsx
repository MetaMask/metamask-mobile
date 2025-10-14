import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import SetPhoneNumber from './SetPhoneNumber';
import Routes from '../../../../../constants/navigation/Routes';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: jest.fn(),
}));

jest.mock('../../hooks/useRegistrationSettings', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: {
      countries: [
        {
          id: 'us-country-id-001',
          name: 'United States',
          iso3166alpha2: 'US',
          callingCode: '1',
          canSignUp: true,
        },
        {
          id: 'uk-country-id-002',
          name: 'United Kingdom',
          iso3166alpha2: 'GB',
          callingCode: '44',
          canSignUp: true,
        },
        {
          id: 'fr-country-id-004',
          name: 'France',
          iso3166alpha2: 'FR',
          callingCode: '33',
          canSignUp: true,
        },
      ],
      usStates: [],
      links: { us: {}, intl: {} },
      config: { us: {}, intl: {} },
    },
  })),
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
      twClassName,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(
        View,
        { testID: testID || 'box', 'data-tw-class': twClassName, ...props },
        children,
      ),
    Text: ({
      children,
      testID,
      variant,
      twClassName,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      variant?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(
        Text,
        {
          testID: testID || 'text',
          'data-variant': variant,
          'data-tw-class': twClassName,
          ...props,
        },
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

// Mock SelectComponent
jest.mock('../../../SelectComponent', () => {
  const React = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return ({
    options,
    selectedValue,
    onValueChange,
    label,
    testID,
  }: {
    options?: { value: string; label: string }[];
    selectedValue?: string;
    onValueChange?: (value: string) => void;
    label?: string;
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
          onPress: () => onValueChange?.('+44'),
        },
        React.createElement(
          Text,
          { testID: 'select-value' },
          options?.find((opt) => opt.value === selectedValue)?.label ||
            selectedValue,
        ),
      ),
    );
});

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_onboarding.set_phone_number.title': 'Set your phone number',
      'card.card_onboarding.set_phone_number.description':
        'We need your phone number to verify your identity',
      'card.card_onboarding.set_phone_number.phone_number_label':
        'Phone number',
      'card.card_onboarding.set_phone_number.country_area_code_label':
        'Country code',
      'card.card_onboarding.set_phone_number.phone_number_placeholder':
        'Enter your phone number',
      'card.card_onboarding.set_phone_number.invalid_phone_number':
        'Please enter a valid phone number (8-14 digits)',
      'card.card_onboarding.set_phone_number.legal_terms':
        'By continuing, you agree to our terms and conditions',
      'card.card_onboarding.continue_button': 'Continue',
    };

    return mockStrings[key] || key;
  }),
}));

describe('SetPhoneNumber Component', () => {
  const mockNavigate = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseDebouncedValue = useDebouncedValue as jest.MockedFunction<
    typeof useDebouncedValue
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as never);
    mockUseDebouncedValue.mockImplementation((value) => value);
  });

  describe('Component Rendering', () => {
    it('should render the SetPhoneNumber component correctly', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display correct title and description', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      expect(getByTestId('onboarding-step-title')).toHaveTextContent(
        'Set your phone number',
      );
      expect(getByTestId('onboarding-step-description')).toHaveTextContent(
        'We need your phone number to verify your identity',
      );
    });
  });

  describe('Form Fields', () => {
    it('should render phone number field with correct properties', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      const textField = getByTestId('text-field');
      expect(textField).toBeTruthy();
      expect(textField.props.placeholder).toBe('Enter your phone number');
      expect(textField.props.keyboardType).toBe('phone-pad');
      expect(textField.props.maxLength).toBe(255);
      expect(textField.props.numberOfLines).toBe(1);
      expect(textField.props.autoCapitalize).toBe('none');
    });

    it('should render phone number label', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      const label = getByTestId('label');
      expect(label).toBeTruthy();
      expect(label).toHaveTextContent('Phone number');
    });

    it('should render country area code selector', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      const selectComponent = getByTestId('select-component');
      expect(selectComponent).toBeTruthy();
      expect(getByTestId('select-label')).toHaveTextContent('Country code');
    });

    it('should update phone number value when text changes', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '1234567890');

      expect(textField.props.value).toBe('1234567890');
    });

    it('should clean non-numeric characters from phone number input', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '123-456-7890');

      expect(textField.props.value).toBe('1234567890');
    });

    it('should handle country area code selection', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      const selectTrigger = getByTestId('select-trigger');
      fireEvent.press(selectTrigger);

      const selectValue = getByTestId('select-value');
      expect(selectValue).toHaveTextContent('+44');
    });
  });

  describe('Phone Number Validation', () => {
    it('should show error message for invalid phone number', async () => {
      mockUseDebouncedValue.mockReturnValue('123'); // Too short

      const { getByTestId, queryByText } = render(<SetPhoneNumber />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '123');

      await waitFor(() => {
        expect(
          queryByText('Please enter a valid phone number (8-14 digits)'),
        ).toBeTruthy();
      });
    });

    it('should not show error message for valid phone number', async () => {
      mockUseDebouncedValue.mockReturnValue('1234567890'); // Valid length

      const { getByTestId, queryByText } = render(<SetPhoneNumber />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '1234567890');

      await waitFor(() => {
        expect(
          queryByText('Please enter a valid phone number (8-14 digits)'),
        ).toBeFalsy();
      });
    });
  });

  describe('Continue Button', () => {
    it('should render continue button and legal terms', () => {
      const { getByTestId, getByText } = render(<SetPhoneNumber />);

      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(getByTestId('button-label')).toHaveTextContent('Continue');
      expect(
        getByText('By continuing, you agree to our terms and conditions'),
      ).toBeTruthy();
    });

    it('should be disabled when phone number is empty', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      const button = getByTestId('button');
      expect(button.props.disabled).toBe(true);
    });

    it('should be disabled when phone number is invalid', () => {
      mockUseDebouncedValue.mockReturnValue('123'); // Too short

      const { getByTestId } = render(<SetPhoneNumber />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '123');

      const button = getByTestId('button');
      expect(button.props.disabled).toBe(true);
    });

    it('should be enabled when phone number is valid', () => {
      mockUseDebouncedValue.mockReturnValue('1234567890'); // Valid

      const { getByTestId } = render(<SetPhoneNumber />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '1234567890');

      const button = getByTestId('button');
      expect(button.props.disabled).toBe(false);
    });

    it('should navigate to CONFIRM_PHONE_NUMBER when continue button is pressed', () => {
      mockUseDebouncedValue.mockReturnValue('1234567890');

      const { getByTestId } = render(<SetPhoneNumber />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '1234567890');

      const button = getByTestId('button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER,
        {
          phoneNumber: '+1 1234567890',
        },
      );
    });
  });

  describe('Registration Settings Integration', () => {
    it('should use registration settings data for area code options', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      const selectComponent = getByTestId('select-component');
      expect(selectComponent).toBeTruthy();

      // Default area code should be +1
      const selectValue = getByTestId('select-value');
      expect(selectValue).toHaveTextContent('+1');
    });
  });

  describe('Component Integration', () => {
    it('should integrate properly with OnboardingStep component', () => {
      const { getByTestId } = render(<SetPhoneNumber />);

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();

      // Check that form fields and actions are properly passed
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should handle debounced phone number updates correctly', () => {
      mockUseDebouncedValue.mockReturnValue('1234567890');

      const { getByTestId } = render(<SetPhoneNumber />);

      const textField = getByTestId('text-field');
      fireEvent.changeText(textField, '1234567890');

      expect(mockUseDebouncedValue).toHaveBeenCalledWith('1234567890', 1000);
    });
  });
});
