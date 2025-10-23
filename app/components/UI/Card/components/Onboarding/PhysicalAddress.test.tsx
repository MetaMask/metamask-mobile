import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PhysicalAddress from './PhysicalAddress';
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

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((styles) => styles),
  })),
}));

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
    ...props
  }: {
    onChangeText: (text: string) => void;
    value: string;
    placeholder: string;
    size: string;
    accessibilityLabel: string;
  }) =>
    React.createElement(TextInput, {
      testID: `text-field-${accessibilityLabel
        ?.toLowerCase()
        .replace(/\s+/g, '-')}`,
      onChangeText,
      value,
      placeholder,
      accessibilityLabel,
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

// Mock Checkbox component
jest.mock('../../../../../component-library/components/Checkbox', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return ({
    isChecked,
    onPress,
    label,
    ...props
  }: {
    isChecked: boolean;
    onPress: () => void;
    label: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: `checkbox-${label?.toLowerCase().replace(/\s+/g, '-')}`,
        onPress,
        ...props,
      },
      React.createElement(Text, { testID: 'checkbox-label' }, label),
      React.createElement(
        Text,
        { testID: 'checkbox-status' },
        isChecked ? 'checked' : 'unchecked',
      ),
    );
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

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.physical_address.title': 'Physical Address',
      'card.card_onboarding.physical_address.description':
        'Enter your physical address information',
      'card.card_onboarding.physical_address.address_line_1_label':
        'Address Line 1',
      'card.card_onboarding.physical_address.address_line_1_placeholder':
        'Enter address line 1',
      'card.card_onboarding.physical_address.address_line_2_label':
        'Address Line 2',
      'card.card_onboarding.physical_address.address_line_2_placeholder':
        'Enter address line 2 (optional)',
      'card.card_onboarding.physical_address.city_label': 'City',
      'card.card_onboarding.physical_address.city_placeholder': 'Enter city',
      'card.card_onboarding.physical_address.state_label': 'State',
      'card.card_onboarding.physical_address.state_placeholder': 'Enter state',
      'card.card_onboarding.physical_address.zip_code_label': 'ZIP Code',
      'card.card_onboarding.physical_address.zip_code_placeholder':
        'Enter ZIP code',
      'card.card_onboarding.physical_address.same_mailing_address_label':
        'Same as mailing address',
      'card.card_onboarding.physical_address.electronic_consent':
        'I consent to electronic communications',
      'card.card_onboarding.continue_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

describe('PhysicalAddress Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  describe('Component Rendering', () => {
    it('should render the component correctly', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display the correct title and description', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const titleElement = getByTestId('onboarding-step-title');
      const descriptionElement = getByTestId('onboarding-step-description');

      expect(titleElement.props.children).toBe('Physical Address');
      expect(descriptionElement.props.children).toBe(
        'Enter your physical address information',
      );
    });
  });

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      expect(getByTestId('text-field-address-line-1')).toBeTruthy();
      expect(getByTestId('text-field-address-line-2')).toBeTruthy();
      expect(getByTestId('text-field-city')).toBeTruthy();
      expect(getByTestId('text-field-state')).toBeTruthy();
      expect(getByTestId('text-field-zip-code')).toBeTruthy();
    });

    it('should render checkboxes', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      expect(getByTestId('checkbox-same-as-mailing-address')).toBeTruthy();
      expect(
        getByTestId('checkbox-i-consent-to-electronic-communications'),
      ).toBeTruthy();
    });

    it('should handle address line 1 input', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const addressLine1Field = getByTestId('text-field-address-line-1');
      fireEvent.changeText(addressLine1Field, '123 Main St');

      expect(addressLine1Field.props.value).toBe('123 Main St');
    });

    it('should handle city input', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const cityField = getByTestId('text-field-city');
      fireEvent.changeText(cityField, 'New York');

      expect(cityField.props.value).toBe('New York');
    });

    it('should handle state input', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const stateField = getByTestId('text-field-state');
      fireEvent.changeText(stateField, 'NY');

      expect(stateField.props.value).toBe('NY');
    });

    it('should handle ZIP code input and filter non-numeric characters', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const zipCodeField = getByTestId('text-field-zip-code');
      fireEvent.changeText(zipCodeField, '12345abc');

      expect(zipCodeField.props.value).toBe('12345');
    });
  });

  describe('Checkboxes', () => {
    it('should toggle same mailing address checkbox', () => {
      const { getByTestId, getAllByTestId } = render(<PhysicalAddress />);

      const checkbox = getByTestId('checkbox-same-as-mailing-address');
      const statusElements = getAllByTestId('checkbox-status');
      const initialStatus = statusElements[0]; // First checkbox (same mailing address)

      expect(initialStatus.props.children).toBe('checked');

      fireEvent.press(checkbox);

      expect(initialStatus.props.children).toBe('unchecked');
    });

    it('should toggle electronic consent checkbox', () => {
      const { getByTestId, getAllByTestId } = render(<PhysicalAddress />);

      const checkbox = getByTestId(
        'checkbox-i-consent-to-electronic-communications',
      );
      const statusElements = getAllByTestId('checkbox-status');
      const initialStatus = statusElements[1]; // Second checkbox (electronic consent)

      expect(initialStatus.props.children).toBe('unchecked');

      fireEvent.press(checkbox);

      expect(initialStatus.props.children).toBe('checked');
    });
  });

  describe('Continue Button', () => {
    it('should render the continue button', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const continueButton = getByTestId('continue-button');
      expect(continueButton).toBeTruthy();
    });

    it('should display correct button text', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const buttonText = getByTestId('button-text');
      expect(buttonText.props.children).toBe('Continue');
    });

    it('should be disabled when required fields are empty', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const buttonStatus = getByTestId('button-disabled-status');
      expect(buttonStatus.props.children).toBe('disabled');
    });

    it('should be enabled when all required fields are filled and consent is given', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      // Fill required fields
      fireEvent.changeText(
        getByTestId('text-field-address-line-1'),
        '123 Main St',
      );
      fireEvent.changeText(getByTestId('text-field-city'), 'New York');
      fireEvent.changeText(getByTestId('text-field-state'), 'NY');
      fireEvent.changeText(getByTestId('text-field-zip-code'), '12345');

      // Give electronic consent
      fireEvent.press(
        getByTestId('checkbox-i-consent-to-electronic-communications'),
      );

      const buttonStatus = getByTestId('button-disabled-status');
      expect(buttonStatus.props.children).toBe('enabled');
    });

    it('should navigate to mailing address when continue button is pressed with valid data', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      // Fill required fields
      fireEvent.changeText(
        getByTestId('text-field-address-line-1'),
        '123 Main St',
      );
      fireEvent.changeText(getByTestId('text-field-city'), 'New York');
      fireEvent.changeText(getByTestId('text-field-state'), 'NY');
      fireEvent.changeText(getByTestId('text-field-zip-code'), '12345');

      // Give electronic consent
      fireEvent.press(
        getByTestId('checkbox-i-consent-to-electronic-communications'),
      );

      const continueButton = getByTestId('continue-button');
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.MAILING_ADDRESS,
        {
          addressLine1: '123 Main St',
          addressLine2: '',
          city: 'New York',
          state: 'NY',
          zipCode: '12345',
        },
      );
    });

    it('should navigate without additional params when same mailing address is unchecked', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      // Fill required fields
      fireEvent.changeText(
        getByTestId('text-field-address-line-1'),
        '123 Main St',
      );
      fireEvent.changeText(getByTestId('text-field-city'), 'New York');
      fireEvent.changeText(getByTestId('text-field-state'), 'NY');
      fireEvent.changeText(getByTestId('text-field-zip-code'), '12345');

      // Uncheck same mailing address
      fireEvent.press(getByTestId('checkbox-same-as-mailing-address'));

      // Give electronic consent
      fireEvent.press(
        getByTestId('checkbox-i-consent-to-electronic-communications'),
      );

      const continueButton = getByTestId('continue-button');
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.MAILING_ADDRESS,
        {},
      );
    });
  });

  describe('Navigation Integration', () => {
    it('should use navigation hook', () => {
      render(<PhysicalAddress />);

      expect(useNavigation).toHaveBeenCalled();
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to OnboardingStep', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const onboardingStep = getByTestId('onboarding-step');
      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const formFields = getByTestId('onboarding-step-form-fields');
      const actions = getByTestId('onboarding-step-actions');

      expect(onboardingStep).toBeTruthy();
      expect(title.props.children).toBe('Physical Address');
      expect(description.props.children).toBe(
        'Enter your physical address information',
      );
      expect(formFields).toBeTruthy();
      expect(actions).toBeTruthy();
    });
  });

  describe('i18n Integration', () => {
    it('should use correct i18n keys for text content', () => {
      const { getByTestId } = render(<PhysicalAddress />);

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const buttonText = getByTestId('button-text');

      expect(title.props.children).toBe('Physical Address');
      expect(description.props.children).toBe(
        'Enter your physical address information',
      );
      expect(buttonText.props.children).toBe('Continue');
    });
  });
});
