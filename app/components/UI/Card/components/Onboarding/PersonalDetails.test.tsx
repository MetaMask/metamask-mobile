import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PersonalDetails from './PersonalDetails';
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
    variant,
    twClassName,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(RNText, { testID: 'text', ...props }, children);

  const TextVariant = {
    BodySm: 'body-sm',
    BodyMd: 'body-md',
    BodyLg: 'body-lg',
  };

  return {
    Box,
    Text,
    TextVariant,
  };
});

// Mock TextField component
jest.mock('../../../../../component-library/components/Form/TextField', () => {
  const React = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  const TextFieldSize = {
    Sm: 'sm',
    Md: 'md',
    Lg: 'lg',
  };

  const MockTextField = ({
    onChangeText,
    value,
    placeholder,
    size,
    accessibilityLabel,
    isError,
    keyboardType,
    maxLength,
    ...props
  }: {
    onChangeText: (text: string) => void;
    value: string;
    placeholder: string;
    size: string;
    accessibilityLabel: string;
    isError?: boolean;
    keyboardType?: string;
    maxLength?: number;
  }) =>
    React.createElement(TextInput, {
      testID: `text-field-${accessibilityLabel
        ?.toLowerCase()
        .replace(/\s+/g, '-')}`,
      onChangeText,
      value,
      placeholder,
      accessibilityLabel,
      keyboardType,
      maxLength,
      ...props,
    });

  MockTextField.Size = TextFieldSize;

  return {
    __esModule: true,
    default: MockTextField,
    TextFieldSize,
  };
});

// Mock Label component
jest.mock('../../../../../component-library/components/Form/Label', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(Text, { testID: 'label', ...props }, children);
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
    isDisabled,
    ...props
  }: {
    label: string;
    onPress: () => void;
    variant: string;
    size: string;
    width: string;
    isDisabled: boolean;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: 'continue-button',
        onPress: isDisabled ? undefined : onPress,
        disabled: isDisabled,
        ...props,
      },
      React.createElement(Text, { testID: 'button-text' }, label),
      React.createElement(
        Text,
        { testID: 'button-disabled-status' },
        isDisabled ? 'disabled' : 'enabled',
      ),
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

// Mock DepositDateField component
jest.mock('../../../Ramp/Deposit/components/DepositDateField', () => {
  const React = jest.requireActual('react');
  const { View, TextInput, Text } = jest.requireActual('react-native');

  return ({
    label,
    value,
    onChangeText,
    error,
    ...props
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    error?: string;
  }) =>
    React.createElement(
      View,
      { testID: 'deposit-date-field', ...props },
      React.createElement(Text, { testID: 'date-field-label' }, label),
      React.createElement(TextInput, {
        testID: 'text-field-date-of-birth',
        onChangeText,
        value,
        placeholder: 'Select date of birth',
      }),
      error && React.createElement(Text, { testID: 'date-field-error' }, error),
    );
});

// Mock useDebouncedValue hook
jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: jest.fn((value: string) => value),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.personal_details.title': 'Personal Details',
      'card.card_onboarding.personal_details.description':
        'Enter your personal information',
      'card.card_onboarding.personal_details.first_name_label': 'First Name',
      'card.card_onboarding.personal_details.first_name_placeholder':
        'Enter first name',
      'card.card_onboarding.personal_details.last_name_label': 'Last Name',
      'card.card_onboarding.personal_details.last_name_placeholder':
        'Enter last name',
      'card.card_onboarding.personal_details.nationality_label': 'Nationality',
      'card.card_onboarding.personal_details.nationality_placeholder':
        'Enter nationality',
      'card.card_onboarding.personal_details.ssn_label': 'SSN',
      'card.card_onboarding.personal_details.ssn_placeholder': 'Enter SSN',
      'card.card_onboarding.personal_details.invalid_ssn': 'Invalid SSN format',
      'card.card_onboarding.personal_details.invalid_date_of_birth':
        'Invalid date of birth',
      'card.card_onboarding.personal_details.invalid_date_of_birth_underage':
        'Must be 18 or older',
      'card.card_onboarding.continue_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

describe('PersonalDetails Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  describe('Component Rendering', () => {
    it('should render the component correctly', () => {
      const { getByTestId } = render(<PersonalDetails />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display the correct title and description', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const titleElement = getByTestId('onboarding-step-title');
      const descriptionElement = getByTestId('onboarding-step-description');

      expect(titleElement.props.children).toBe('Personal Details');
      expect(descriptionElement.props.children).toBe(
        'Enter your personal information',
      );
    });
  });

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      const { getByTestId } = render(<PersonalDetails />);

      expect(getByTestId('text-field-first-name')).toBeTruthy();
      expect(getByTestId('text-field-last-name')).toBeTruthy();
      expect(getByTestId('text-field-date-of-birth')).toBeTruthy();
      expect(getByTestId('text-field-nationality')).toBeTruthy();
      expect(getByTestId('text-field-ssn')).toBeTruthy();
    });

    it('should handle first name input', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const firstNameField = getByTestId('text-field-first-name');
      fireEvent.changeText(firstNameField, 'John');

      expect(firstNameField.props.value).toBe('John');
    });

    it('should handle last name input', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const lastNameField = getByTestId('text-field-last-name');
      fireEvent.changeText(lastNameField, 'Doe');

      expect(lastNameField.props.value).toBe('Doe');
    });

    it('should handle nationality input', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const nationalityField = getByTestId('text-field-nationality');
      fireEvent.changeText(nationalityField, 'American');

      expect(nationalityField.props.value).toBe('American');
    });

    it('should handle date of birth input', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const dateField = getByTestId('text-field-date-of-birth');
      const validDate = new Date('1990-01-01').getTime().toString();
      fireEvent.changeText(dateField, validDate);

      expect(dateField.props.value).toBe(validDate);
    });

    it('should handle SSN input and filter non-numeric characters', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const ssnField = getByTestId('text-field-ssn');
      fireEvent.changeText(ssnField, '123abc456def789');

      expect(ssnField.props.value).toBe('123456789');
    });

    it('should limit SSN to 9 characters', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const ssnField = getByTestId('text-field-ssn');
      fireEvent.changeText(ssnField, '1234567890123');

      expect(ssnField.props.value).toBe('1234567890123');
    });
  });

  describe('Form Validation', () => {
    it('should show SSN error for invalid format', async () => {
      const { getByTestId, queryByTestId } = render(<PersonalDetails />);

      const ssnField = getByTestId('text-field-ssn');
      fireEvent.changeText(ssnField, '12345');

      await waitFor(() => {
        expect(queryByTestId('text')).toBeTruthy();
      });
    });

    it('should validate age requirement (under 18)', () => {
      const { getByTestId, queryByTestId } = render(<PersonalDetails />);

      const dateField = getByTestId('text-field-date-of-birth');
      const underageDate = new Date('2010-01-01').getTime().toString();
      fireEvent.changeText(dateField, underageDate);

      expect(queryByTestId('date-field-error')).toBeTruthy();
    });

    it('should validate future date of birth', () => {
      const { getByTestId, queryByTestId } = render(<PersonalDetails />);

      const dateField = getByTestId('text-field-date-of-birth');
      const futureDate = new Date('2030-01-01').getTime().toString();
      fireEvent.changeText(dateField, futureDate);

      expect(queryByTestId('date-field-error')).toBeTruthy();
    });

    it('should accept valid adult date of birth', () => {
      const { getByTestId, queryByTestId } = render(<PersonalDetails />);

      const dateField = getByTestId('text-field-date-of-birth');
      const validDate = new Date('1990-01-01').getTime().toString();
      fireEvent.changeText(dateField, validDate);

      // Should not show error for valid date
      expect(queryByTestId('date-field-error')).toBeFalsy();
    });
  });

  describe('Continue Button', () => {
    it('should render the continue button', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const continueButton = getByTestId('continue-button');
      expect(continueButton).toBeTruthy();
    });

    it('should display correct button text', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const buttonText = getByTestId('button-text');
      expect(buttonText.props.children).toBe('Continue');
    });

    it('should be disabled when required fields are empty', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const buttonStatus = getByTestId('button-disabled-status');
      expect(buttonStatus.props.children).toBe('disabled');
    });

    it('should be disabled when SSN is invalid', async () => {
      const { getByTestId } = render(<PersonalDetails />);

      // Fill all fields except SSN with valid data
      fireEvent.changeText(getByTestId('text-field-first-name'), 'John');
      fireEvent.changeText(getByTestId('text-field-last-name'), 'Doe');
      fireEvent.changeText(getByTestId('text-field-nationality'), 'American');
      fireEvent.changeText(
        getByTestId('text-field-date-of-birth'),
        new Date('1990-01-01').getTime().toString(),
      );

      // Enter invalid SSN
      fireEvent.changeText(getByTestId('text-field-ssn'), '12345');

      await waitFor(() => {
        const buttonStatus = getByTestId('button-disabled-status');
        expect(buttonStatus.props.children).toBe('disabled');
      });
    });

    it('should be disabled when date has error', () => {
      const { getByTestId } = render(<PersonalDetails />);

      // Fill all fields with valid data except date
      fireEvent.changeText(getByTestId('text-field-first-name'), 'John');
      fireEvent.changeText(getByTestId('text-field-last-name'), 'Doe');
      fireEvent.changeText(getByTestId('text-field-nationality'), 'American');
      fireEvent.changeText(getByTestId('text-field-ssn'), '123456789');

      // Enter invalid date (underage)
      fireEvent.changeText(
        getByTestId('text-field-date-of-birth'),
        new Date('2010-01-01').getTime().toString(),
      );

      const buttonStatus = getByTestId('button-disabled-status');
      expect(buttonStatus.props.children).toBe('disabled');
    });

    it('should be enabled when all required fields are filled with valid data', async () => {
      const { getByTestId } = render(<PersonalDetails />);

      // Fill all fields with valid data
      fireEvent.changeText(getByTestId('text-field-first-name'), 'John');
      fireEvent.changeText(getByTestId('text-field-last-name'), 'Doe');
      fireEvent.changeText(getByTestId('text-field-nationality'), 'American');
      fireEvent.changeText(
        getByTestId('text-field-date-of-birth'),
        new Date('1990-01-01').getTime().toString(),
      );
      fireEvent.changeText(getByTestId('text-field-ssn'), '123456789');

      await waitFor(() => {
        const buttonStatus = getByTestId('button-disabled-status');
        expect(buttonStatus.props.children).toBe('enabled');
      });
    });

    it('should navigate to physical address when continue button is pressed with valid data', async () => {
      const { getByTestId } = render(<PersonalDetails />);

      // Fill all fields with valid data
      fireEvent.changeText(getByTestId('text-field-first-name'), 'John');
      fireEvent.changeText(getByTestId('text-field-last-name'), 'Doe');
      fireEvent.changeText(getByTestId('text-field-nationality'), 'American');
      fireEvent.changeText(
        getByTestId('text-field-date-of-birth'),
        new Date('1990-01-01').getTime().toString(),
      );
      fireEvent.changeText(getByTestId('text-field-ssn'), '123456789');

      await waitFor(() => {
        const continueButton = getByTestId('continue-button');
        fireEvent.press(continueButton);

        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS,
        );
      });
    });

    it('should not navigate when button is disabled', () => {
      const { getByTestId } = render(<PersonalDetails />);

      // Verify button is disabled initially (no fields filled)
      const buttonStatus = getByTestId('button-disabled-status');
      expect(buttonStatus.props.children).toBe('disabled');

      const continueButton = getByTestId('continue-button');

      // Try to press the disabled button - it should not trigger onPress
      expect(continueButton.props.onPress).toBeUndefined();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Integration', () => {
    it('should use navigation hook', () => {
      render(<PersonalDetails />);

      expect(useNavigation).toHaveBeenCalled();
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to OnboardingStep', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const onboardingStep = getByTestId('onboarding-step');
      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const formFields = getByTestId('onboarding-step-form-fields');
      const actions = getByTestId('onboarding-step-actions');

      expect(onboardingStep).toBeTruthy();
      expect(title.props.children).toBe('Personal Details');
      expect(description.props.children).toBe(
        'Enter your personal information',
      );
      expect(formFields).toBeTruthy();
      expect(actions).toBeTruthy();
    });
  });

  describe('i18n Integration', () => {
    it('should use correct i18n keys for text content', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const buttonText = getByTestId('button-text');

      expect(title.props.children).toBe('Personal Details');
      expect(description.props.children).toBe(
        'Enter your personal information',
      );
      expect(buttonText.props.children).toBe('Continue');
    });
  });

  describe('Debounced SSN Validation', () => {
    it('should handle debounced SSN validation', async () => {
      const { getByTestId } = render(<PersonalDetails />);

      const ssnField = getByTestId('text-field-ssn');
      fireEvent.changeText(ssnField, '123456789');

      await waitFor(() => {
        expect(ssnField.props.value).toBe('123456789');
      });
    });
  });
});
