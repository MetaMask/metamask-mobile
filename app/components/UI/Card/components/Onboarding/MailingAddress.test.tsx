import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import MailingAddress from './MailingAddress';
import Routes from '../../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock useParams
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(() => ({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
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
  const { View } = jest.requireActual('react-native');

  const Box = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(View, { testID: 'box', ...props }, children);

  return {
    Box,
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
    returnKeyType,
    autoCapitalize,
    numberOfLines,
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
    returnKeyType?: string;
    autoCapitalize?: string;
    numberOfLines?: number;
  }) =>
    React.createElement(TextInput, {
      testID: 'text-field',
      onChangeText,
      value,
      placeholder,
      accessibilityLabel,
      keyboardType,
      maxLength,
      returnKeyType,
      autoCapitalize,
      numberOfLines,
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
    onPress,
    label,
    variant,
    size,
    width,
    isDisabled,
    testID,
    ...props
  }: {
    onPress: () => void;
    label: string;
    variant: string;
    size: string;
    width: string;
    isDisabled: boolean;
    testID?: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: testID || 'button',
        onPress: isDisabled ? undefined : onPress,
        disabled: isDisabled,
        variant,
        size,
        width,
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

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.mailing_address.title': 'Mailing Address',
      'card.card_onboarding.mailing_address.description':
        'Enter your mailing address information.',
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
      'card.card_onboarding.continue_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

describe('MailingAddress Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  describe('Component Rendering', () => {
    it('should render the component successfully', () => {
      render(<MailingAddress />);

      expect(screen.getByTestId('onboarding-step')).toBeTruthy();
    });

    it('should display the correct title', () => {
      render(<MailingAddress />);

      const title = screen.getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('Mailing Address');
    });

    it('should display the correct description', () => {
      render(<MailingAddress />);

      const description = screen.getByTestId('onboarding-step-description');
      expect(description.props.children).toBe(
        'Enter your mailing address information.',
      );
    });

    it('should render form fields section', () => {
      render(<MailingAddress />);

      expect(screen.getByTestId('onboarding-step-form-fields')).toBeTruthy();
    });

    it('should render actions section', () => {
      render(<MailingAddress />);

      expect(screen.getByTestId('onboarding-step-actions')).toBeTruthy();
    });
  });

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      render(<MailingAddress />);

      const textFields = screen.getAllByTestId('text-field');
      expect(textFields).toHaveLength(5); // Address Line 1, Address Line 2, City, State, ZIP Code
    });

    it('should render all field labels', () => {
      render(<MailingAddress />);

      const labels = screen.getAllByTestId('label');
      expect(labels).toHaveLength(5);
    });

    describe('Address Line 1 Field', () => {
      it('should handle address line 1 input', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const addressLine1Field = textFields[0];

        fireEvent.changeText(addressLine1Field, '123 Main St');
        expect(addressLine1Field.props.value).toBe('123 Main St');
      });

      it('should have correct placeholder for address line 1', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const addressLine1Field = textFields[0];

        expect(addressLine1Field.props.placeholder).toBe(
          'Enter address line 1',
        );
      });

      it('should have correct accessibility label for address line 1', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const addressLine1Field = textFields[0];

        expect(addressLine1Field.props.accessibilityLabel).toBe(
          'Address Line 1',
        );
      });
    });

    describe('Address Line 2 Field', () => {
      it('should handle address line 2 input', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const addressLine2Field = textFields[1];

        fireEvent.changeText(addressLine2Field, 'Apt 4B');
        expect(addressLine2Field.props.value).toBe('Apt 4B');
      });

      it('should have correct placeholder for address line 2', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const addressLine2Field = textFields[1];

        expect(addressLine2Field.props.placeholder).toBe(
          'Enter address line 2 (optional)',
        );
      });
    });

    describe('City Field', () => {
      it('should handle city input', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const cityField = textFields[2];

        fireEvent.changeText(cityField, 'New York');
        expect(cityField.props.value).toBe('New York');
      });

      it('should have correct placeholder for city', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const cityField = textFields[2];

        expect(cityField.props.placeholder).toBe('Enter city');
      });
    });

    describe('State Field', () => {
      it('should handle state input', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const stateField = textFields[3];

        fireEvent.changeText(stateField, 'NY');
        expect(stateField.props.value).toBe('NY');
      });

      it('should have correct placeholder for state', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const stateField = textFields[3];

        expect(stateField.props.placeholder).toBe('Enter state');
      });
    });

    describe('ZIP Code Field', () => {
      it('should handle ZIP code input', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const zipCodeField = textFields[4];

        fireEvent.changeText(zipCodeField, '12345');
        expect(zipCodeField.props.value).toBe('12345');
      });

      it('should filter out non-numeric characters from ZIP code', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const zipCodeField = textFields[4];

        fireEvent.changeText(zipCodeField, '123abc45');
        expect(zipCodeField.props.value).toBe('12345');
      });

      it('should have number-pad keyboard type for ZIP code', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const zipCodeField = textFields[4];

        expect(zipCodeField.props.keyboardType).toBe('number-pad');
      });

      it('should have correct placeholder for ZIP code', () => {
        render(<MailingAddress />);

        const textFields = screen.getAllByTestId('text-field');
        const zipCodeField = textFields[4];

        expect(zipCodeField.props.placeholder).toBe('Enter ZIP code');
      });
    });
  });

  describe('Form Validation', () => {
    it('should disable continue button when required fields are empty', () => {
      render(<MailingAddress />);

      const button = screen.getByTestId('button');
      expect(button.props.onPress).toBeUndefined();
    });

    it('should enable continue button when all required fields are filled', () => {
      render(<MailingAddress />);

      const textFields = screen.getAllByTestId('text-field');

      // Fill all required fields
      fireEvent.changeText(textFields[0], '123 Main St'); // Address Line 1
      fireEvent.changeText(textFields[2], 'New York'); // City
      fireEvent.changeText(textFields[3], 'NY'); // State
      fireEvent.changeText(textFields[4], '12345'); // ZIP Code

      const button = screen.getByTestId('button');
      expect(button.props.onPress).toBeDefined();
    });

    it('should not require address line 2 for form validation', () => {
      render(<MailingAddress />);

      const textFields = screen.getAllByTestId('text-field');

      // Fill required fields but leave address line 2 empty
      fireEvent.changeText(textFields[0], '123 Main St'); // Address Line 1
      fireEvent.changeText(textFields[2], 'New York'); // City
      fireEvent.changeText(textFields[3], 'NY'); // State
      fireEvent.changeText(textFields[4], '12345'); // ZIP Code

      const button = screen.getByTestId('button');
      expect(button.props.onPress).toBeDefined();
    });
  });

  describe('Continue Button', () => {
    it('should render the continue button', () => {
      render(<MailingAddress />);

      expect(screen.getByTestId('button')).toBeTruthy();
    });

    it('should display the correct button text', () => {
      render(<MailingAddress />);

      const buttonText = screen.getByTestId('button-text');
      expect(buttonText.props.children).toBe('Continue');
    });

    it('should navigate to complete screen when continue button is pressed', () => {
      render(<MailingAddress />);

      const textFields = screen.getAllByTestId('text-field');

      // Fill all required fields
      fireEvent.changeText(textFields[0], '123 Main St');
      fireEvent.changeText(textFields[2], 'New York');
      fireEvent.changeText(textFields[3], 'NY');
      fireEvent.changeText(textFields[4], '12345');

      const button = screen.getByTestId('button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.COMPLETE,
      );
    });
  });

  describe('Navigation Integration', () => {
    it('should use navigation hook', () => {
      render(<MailingAddress />);

      expect(useNavigation).toHaveBeenCalled();
    });
  });

  describe('OnboardingStep Integration', () => {
    it('should pass correct props to OnboardingStep', () => {
      render(<MailingAddress />);

      const onboardingStep = screen.getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();

      const title = screen.getByTestId('onboarding-step-title');
      const description = screen.getByTestId('onboarding-step-description');
      const formFields = screen.getByTestId('onboarding-step-form-fields');
      const actions = screen.getByTestId('onboarding-step-actions');

      expect(title.props.children).toBe('Mailing Address');
      expect(description.props.children).toBe(
        'Enter your mailing address information.',
      );
      expect(formFields).toBeTruthy();
      expect(actions).toBeTruthy();
    });
  });

  describe('Button Configuration', () => {
    it('should configure button with correct variant', () => {
      render(<MailingAddress />);

      const button = screen.getByTestId('button');
      expect(button.props.variant).toBe('primary');
    });

    it('should configure button with correct size', () => {
      render(<MailingAddress />);

      const button = screen.getByTestId('button');
      expect(button.props.size).toBe('lg');
    });

    it('should configure button with full width', () => {
      render(<MailingAddress />);

      const button = screen.getByTestId('button');
      expect(button.props.width).toBe('full');
    });
  });

  describe('Initial Values', () => {
    it('should handle initial values from useParams', () => {
      const { useParams } = jest.requireMock(
        '../../../../../util/navigation/navUtils',
      );
      useParams.mockReturnValue({
        addressLine1: '456 Oak St',
        addressLine2: 'Suite 100',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
      });

      render(<MailingAddress />);

      const textFields = screen.getAllByTestId('text-field');

      expect(textFields[0].props.value).toBe('456 Oak St');
      expect(textFields[1].props.value).toBe('Suite 100');
      expect(textFields[2].props.value).toBe('Los Angeles');
      expect(textFields[3].props.value).toBe('CA');
      expect(textFields[4].props.value).toBe('90210');
    });
  });
});
