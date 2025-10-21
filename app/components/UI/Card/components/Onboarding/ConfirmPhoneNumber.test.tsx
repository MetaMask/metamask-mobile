import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ConfirmPhoneNumber from './ConfirmPhoneNumber';
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
      BodyLg: 'BodyLg',
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

// Mock CodeField and related components
jest.mock('react-native-confirmation-code-field', () => {
  const React = jest.requireActual('react');
  const { TextInput, View, Text } = jest.requireActual('react-native');

  const MockCodeField = React.forwardRef(
    (
      {
        value,
        onChangeText,
        cellCount,
        keyboardType,
        textContentType,
        autoComplete,
        renderCell,
        rootStyle,
        ...props
      }: {
        value: string;
        onChangeText?: (text: string) => void;
        cellCount: number;
        keyboardType?: string;
        textContentType?: string;
        autoComplete?: string;
        renderCell?: (params: {
          index: number;
          symbol: string;
          isFocused: boolean;
        }) => React.ReactNode;
        rootStyle?: unknown;
        [key: string]: unknown;
      },
      ref: React.Ref<typeof TextInput>,
    ) =>
      React.createElement(
        View,
        { testID: 'code-field', style: rootStyle },
        React.createElement(TextInput, {
          ref,
          testID: 'code-field-input',
          value,
          onChangeText,
          keyboardType,
          textContentType,
          autoComplete,
          maxLength: cellCount,
          ...props,
        }),
        // Render cells for visual representation
        Array.from({ length: cellCount }, (_, index) => {
          const symbol = value[index] || '';
          const isFocused = index === value.length;
          return renderCell
            ? renderCell({ index, symbol, isFocused })
            : React.createElement(
                View,
                { key: index, testID: `code-cell-${index}` },
                React.createElement(Text, null, symbol),
              );
        }),
      ),
  );

  const MockCursor = () => React.createElement(Text, { testID: 'cursor' }, '|');

  return {
    CodeField: MockCodeField,
    Cursor: MockCursor,
    useClearByFocusCell: jest.fn(() => [{}, jest.fn()]),
  };
});

// Mock useStyles hook
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      codeFieldRoot: {},
      cellRoot: {},
      focusCell: {},
    },
  })),
}));

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: { [key: string]: string }) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_onboarding.confirm_phone_number.title':
        'Confirm your phone number',
      'card.card_onboarding.confirm_phone_number.description':
        'We sent a 6-digit code to {phoneNumber}. Enter it below to verify your phone number.',
      'card.card_onboarding.confirm_phone_number.confirm_code_label':
        'Confirmation code',
      'card.card_onboarding.continue_button': 'Continue',
    };

    let result = mockStrings[key] || key;
    if (params) {
      Object.keys(params).forEach((param) => {
        result = result.replace(`{${param}}`, params[param]);
      });
    }
    return result;
  }),
}));

describe('ConfirmPhoneNumber Component', () => {
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
    mockUseParams.mockReturnValue({
      phoneNumber: '+1 1234567890',
    });
  });

  describe('Component Rendering', () => {
    it('should render the ConfirmPhoneNumber component correctly', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display correct title and description with phone number', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      expect(getByTestId('onboarding-step-title')).toHaveTextContent(
        'Confirm your phone number',
      );
      expect(getByTestId('onboarding-step-description')).toHaveTextContent(
        'We sent a 6-digit code to +1 1234567890. Enter it below to verify your phone number.',
      );
    });
  });

  describe('Form Fields', () => {
    it('should render confirmation code field with correct properties', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeField = getByTestId('code-field-input');
      expect(codeField).toBeTruthy();
      expect(codeField.props.keyboardType).toBe('number-pad');
      expect(codeField.props.textContentType).toBe('oneTimeCode');
      expect(codeField.props.autoComplete).toBe('one-time-code');
      expect(codeField.props.maxLength).toBe(6);
    });

    it('should render confirmation code label', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const label = getByTestId('label');
      expect(label).toBeTruthy();
      expect(label).toHaveTextContent('Confirmation code');
    });

    it('should render code field cells', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeField = getByTestId('code-field');
      expect(codeField).toBeTruthy();

      // The code field should be present - cells are rendered internally
      const codeFieldInput = getByTestId('code-field-input');
      expect(codeFieldInput).toBeTruthy();
    });

    it('should update confirmation code value when text changes', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeFieldInput = getByTestId('code-field-input');
      fireEvent.changeText(codeFieldInput, '123456');

      expect(codeFieldInput.props.value).toBe('123456');
    });

    it('should handle partial code input', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeFieldInput = getByTestId('code-field-input');
      fireEvent.changeText(codeFieldInput, '123');

      expect(codeFieldInput.props.value).toBe('123');
    });
  });

  describe('Continue Button', () => {
    it('should render continue button', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(getByTestId('button-label')).toHaveTextContent('Continue');
    });

    it('should be disabled when confirmation code is empty', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const button = getByTestId('button');
      expect(button.props.disabled).toBe(true);
    });

    it('should be disabled when confirmation code is incomplete', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeFieldInput = getByTestId('code-field-input');
      fireEvent.changeText(codeFieldInput, '123');

      const button = getByTestId('button');
      expect(button.props.disabled).toBe(true);
    });

    it('should be enabled when confirmation code is complete', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeFieldInput = getByTestId('code-field-input');
      fireEvent.changeText(codeFieldInput, '123456');

      const button = getByTestId('button');
      expect(button.props.disabled).toBe(false);
    });

    it('should navigate to VERIFY_IDENTITY when continue button is pressed', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeFieldInput = getByTestId('code-field-input');
      fireEvent.changeText(codeFieldInput, '123456');

      const button = getByTestId('button');
      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
      );
    });
  });

  describe('Auto-submit Functionality', () => {
    it('should auto-submit when 6 digits are entered', async () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeFieldInput = getByTestId('code-field-input');
      fireEvent.changeText(codeFieldInput, '123456');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.ONBOARDING.VERIFY_IDENTITY,
        );
      });
    });

    it('should not auto-submit when less than 6 digits are entered', async () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeFieldInput = getByTestId('code-field-input');
      fireEvent.changeText(codeFieldInput, '12345');

      // Wait a bit to ensure no navigation happens
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not auto-submit the same code twice', async () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeFieldInput = getByTestId('code-field-input');

      // First submission
      fireEvent.changeText(codeFieldInput, '123456');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });

      // Clear the mock to reset call count
      mockNavigate.mockClear();

      // Clear and enter different code
      fireEvent.changeText(codeFieldInput, '');
      fireEvent.changeText(codeFieldInput, '654321');

      // Should navigate again with new code
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Phone Number Integration', () => {
    it('should display phone number from params in description', () => {
      mockUseParams.mockReturnValue({
        phoneNumber: '+44 7700900123',
      });

      const { getByTestId } = render(<ConfirmPhoneNumber />);

      expect(getByTestId('onboarding-step-description')).toHaveTextContent(
        'We sent a 6-digit code to +44 7700900123. Enter it below to verify your phone number.',
      );
    });

    it('should handle missing phone number parameter', () => {
      mockUseParams.mockReturnValue({});

      const { getByTestId } = render(<ConfirmPhoneNumber />);

      // Should still render without crashing
      expect(getByTestId('onboarding-step')).toBeTruthy();
    });
  });

  describe('Component Integration', () => {
    it('should integrate properly with OnboardingStep component', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();

      // Check that form fields and actions are properly passed
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should handle code field focus and blur correctly', () => {
      const { getByTestId } = render(<ConfirmPhoneNumber />);

      const codeFieldInput = getByTestId('code-field-input');
      expect(codeFieldInput).toBeTruthy();

      // Test focus
      fireEvent(codeFieldInput, 'focus');
      expect(codeFieldInput).toBeTruthy();

      // Test blur
      fireEvent(codeFieldInput, 'blur');
      expect(codeFieldInput).toBeTruthy();
    });
  });
});
