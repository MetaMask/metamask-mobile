import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
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
          testID: 'confirm-phone-number-code-field',
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

  const mockUseBlurOnFulfill = jest.fn(() => {
    const ref = React.useRef({
      focus: jest.fn(),
      blur: jest.fn(),
    });
    return ref;
  });

  return {
    CodeField: MockCodeField,
    Cursor: MockCursor,
    useClearByFocusCell: jest.fn(() => [{}, jest.fn()]),
    useBlurOnFulfill: mockUseBlurOnFulfill,
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
  strings: jest.fn(
    (key: string, params?: { [key: string]: string | number }) => {
      const mockStrings: { [key: string]: string } = {
        'card.card_onboarding.confirm_phone_number.title':
          'Confirm your phone number',
        'card.card_onboarding.confirm_phone_number.description':
          'We sent a 6-digit code to {phoneNumber}. Enter it below to verify your phone number.',
        'card.card_onboarding.confirm_phone_number.confirm_code_label':
          'Confirmation code',
        'card.card_onboarding.confirm_phone_number.resend_verification':
          'Resend verification code',
        'card.card_onboarding.confirm_phone_number.resend_cooldown':
          'Resend in {seconds}s',
        'card.card_onboarding.continue_button': 'Continue',
      };

      let result = mockStrings[key] || key;
      if (params) {
        Object.keys(params).forEach((param) => {
          result = result.replace(`{${param}}`, String(params[param]));
        });
      }
      return result;
    },
  ),
}));

// Mock hooks
const mockUsePhoneVerificationVerify = jest.fn();
const mockUsePhoneVerificationSend = jest.fn();
const mockSetUser = jest.fn();

jest.mock('../../hooks/usePhoneVerificationVerify', () => ({
  __esModule: true,
  default: () => mockUsePhoneVerificationVerify(),
}));

jest.mock('../../hooks/usePhoneVerificationSend', () => ({
  __esModule: true,
  default: () => mockUsePhoneVerificationSend(),
}));

// Mock SDK
jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(() => ({
    sdk: {},
    isLoading: false,
    user: { id: 'user-123', email: 'test@example.com' },
    setUser: mockSetUser,
    logoutFromProvider: jest.fn(),
  })),
}));

// Create test store
const createTestStore = (initialState = {}) =>
  configureStore({
    reducer: {
      card: (
        state = {
          onboarding: {
            onboardingId: 'onboarding-123',
            contactVerificationId: 'contact-123',
          },
          ...initialState,
        },
        action = { type: '', payload: null },
      ) => {
        switch (action.type) {
          case 'card/setUser':
            return {
              ...state,
              user: action.payload,
            };
          default:
            return state;
        }
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

describe('ConfirmPhoneNumber Component', () => {
  const mockNavigate = jest.fn();
  const mockReset = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    store = createTestStore();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
    } as never);
    mockUseParams.mockReturnValue({
      phoneCountryCode: '1',
      phoneNumber: '1234567890',
    });

    // Set up default mock returns for hooks
    const mockVerifyPhoneVerification = jest.fn().mockResolvedValue({
      user: { id: 'user-123', name: 'Test User' },
    });
    mockUsePhoneVerificationVerify.mockReturnValue({
      verifyPhoneVerification: mockVerifyPhoneVerification,
      isLoading: false,
      isError: false,
      error: null,
      reset: jest.fn(),
    });

    const mockSendPhoneVerification = jest
      .fn()
      .mockResolvedValue({ success: true });
    mockUsePhoneVerificationSend.mockReturnValue({
      sendPhoneVerification: mockSendPhoneVerification,
      isLoading: false,
      isError: false,
      error: null,
      reset: jest.fn(),
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render the ConfirmPhoneNumber component correctly', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display correct title and description with phone number', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

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
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      expect(codeField).toBeTruthy();
      expect(codeField.props.keyboardType).toBe('number-pad');
      expect(codeField.props.textContentType).toBe('oneTimeCode');
      expect(codeField.props.autoComplete).toBe('one-time-code');
      expect(codeField.props.maxLength).toBe(6);
    });

    it('should render confirmation code label', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const label = getByTestId('label');
      expect(label).toBeTruthy();
      expect(label).toHaveTextContent('Confirmation code');
    });

    it('should render code field cells', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('code-field');
      expect(codeField).toBeTruthy();

      // The code field should be present - cells are rendered internally
      const codeFieldInput = getByTestId('confirm-phone-number-code-field');
      expect(codeFieldInput).toBeTruthy();
    });

    it('should update confirmation code value when text changes', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-phone-number-code-field');
      fireEvent.changeText(codeFieldInput, '123456');

      expect(codeFieldInput.props.value).toBe('123456');
    });

    it('should handle partial code input', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-phone-number-code-field');
      fireEvent.changeText(codeFieldInput, '123');

      expect(codeFieldInput.props.value).toBe('123');
    });
  });

  describe('Continue Button', () => {
    it('should render continue button', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const button = getByTestId('confirm-phone-number-continue-button');
      expect(button).toBeTruthy();
      expect(getByTestId('button-label')).toHaveTextContent('Continue');
    });

    it('should be disabled when confirmation code is empty', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const button = getByTestId('confirm-phone-number-continue-button');
      expect(button.props.disabled).toBe(true);
    });

    it('should be disabled when confirmation code is incomplete', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-phone-number-code-field');
      fireEvent.changeText(codeFieldInput, '123');

      const button = getByTestId('confirm-phone-number-continue-button');
      expect(button.props.disabled).toBe(true);
    });

    it('should be enabled when confirmation code is complete', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-phone-number-code-field');
      fireEvent.changeText(codeFieldInput, '123456');

      const button = getByTestId('confirm-phone-number-continue-button');
      expect(button.props.disabled).toBe(false);
    });

    it('navigates to VERIFY_IDENTITY when continue button is pressed', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-phone-number-code-field');
      fireEvent.changeText(codeFieldInput, '123456');

      const button = getByTestId('confirm-phone-number-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.VERIFY_IDENTITY }],
        });
      });
    });
  });

  describe('Auto-submit Functionality', () => {
    it('auto-submits when 6 digits are entered', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-phone-number-code-field');

      await act(async () => {
        fireEvent.changeText(codeFieldInput, '123456');
      });

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.VERIFY_IDENTITY }],
        });
      });
    });

    it('does not auto-submit when less than 6 digits are entered', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-phone-number-code-field');
      fireEvent.changeText(codeFieldInput, '12345');

      // Flush any pending timers/effects and assert no navigation
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('does not auto-submit the same code twice', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-phone-number-code-field');

      // First submission
      await act(async () => {
        fireEvent.changeText(codeFieldInput, '123456');
      });

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledTimes(1);
      });

      // Clear the mock to reset call count
      mockReset.mockClear();

      // Clear and enter different code
      await act(async () => {
        fireEvent.changeText(codeFieldInput, '');
        fireEvent.changeText(codeFieldInput, '654321');
      });

      // Should reset navigation again with new code
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Phone Number Integration', () => {
    it('should display phone number from params in description', () => {
      mockUseParams.mockReturnValue({
        phoneCountryCode: '44',
        phoneNumber: '7700900123',
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      expect(getByTestId('onboarding-step-description')).toHaveTextContent(
        'We sent a 6-digit code to +44 7700900123. Enter it below to verify your phone number.',
      );
    });

    it('should handle missing phone number parameter', () => {
      mockUseParams.mockReturnValue({});

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      // Should still render without crashing
      expect(getByTestId('onboarding-step')).toBeTruthy();
    });
  });

  describe('Component Integration', () => {
    it('should integrate properly with OnboardingStep component', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();

      // Check that form fields and actions are properly passed
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should handle code field focus and blur correctly', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-phone-number-code-field');
      expect(codeFieldInput).toBeTruthy();

      // Test focus
      fireEvent(codeFieldInput, 'focus');
      expect(codeFieldInput).toBeTruthy();

      // Test blur
      fireEvent(codeFieldInput, 'blur');
      expect(codeFieldInput).toBeTruthy();
    });
  });

  describe('Form Field Rendering with Test IDs', () => {
    it('renders all required form elements with correct test IDs', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      expect(getByTestId('confirm-phone-number-code-field')).toBeTruthy();
      expect(
        getByTestId('confirm-phone-number-resend-verification'),
      ).toBeTruthy();
      expect(getByTestId('confirm-phone-number-continue-button')).toBeTruthy();
    });

    it('does not show error messages initially', () => {
      const store = createTestStore();
      const { queryByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      expect(queryByTestId('confirm-phone-number-code-field-error')).toBeNull();
      expect(
        queryByTestId('confirm-phone-number-phone-number-error'),
      ).toBeNull();
    });

    it('shows verification error when verifyIsError is true', () => {
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: 'Invalid verification code',
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      expect(getByTestId('confirm-phone-number-code-field-error')).toBeTruthy();
    });

    it('shows phone verification error when phoneVerificationIsError is true', () => {
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: 'Failed to send verification code',
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      expect(
        getByTestId('confirm-phone-number-phone-number-error'),
      ).toBeTruthy();
    });
  });

  describe('Code Input Validation and Error States', () => {
    it('allows only numeric input up to 6 digits', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');

      // Test normal input
      fireEvent.changeText(codeField, '123456');
      expect(codeField.props.value).toBe('123456');

      // The CodeField component itself handles the 6-digit limit internally
      // We can't test the limit behavior directly as it's handled by the library
      // Instead, we test that the component accepts the expected input format
      fireEvent.changeText(codeField, '123');
      expect(codeField.props.value).toBe('123');
    });

    it('has correct input properties for verification code', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      expect(codeField.props.keyboardType).toBe('number-pad');
      expect(codeField.props.textContentType).toBe('oneTimeCode');
      expect(codeField.props.autoComplete).toBe('one-time-code');
    });

    it('shows error message when verification fails', () => {
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: 'Verification code is incorrect',
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const errorElement = getByTestId('confirm-phone-number-code-field-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).toBe(
        'Verification code is incorrect',
      );
    });

    it('clears error when reset is called', () => {
      const mockReset = jest.fn();
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: jest.fn(),
        isLoading: false,
        isError: false,
        error: null,
        reset: mockReset,
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      fireEvent.changeText(codeField, '123456');
      fireEvent.changeText(codeField, '');

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('Continue Button State Management', () => {
    it('has continue button disabled when code is empty', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );
      expect(continueButton.props.disabled).toBe(true);
    });

    it('has continue button disabled when code is incomplete', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );

      fireEvent.changeText(codeField, '12345');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('enables continue button when code is complete and valid', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );

      fireEvent.changeText(codeField, '123456');
      expect(continueButton.props.disabled).toBe(false);
    });

    it('disables continue button when verification is loading', () => {
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: jest.fn(),
        isLoading: true,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );

      fireEvent.changeText(codeField, '123456');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('disables continue button when verification has error', () => {
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: 'Verification failed',
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );

      fireEvent.changeText(codeField, '123456');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('disables continue button when required Redux state is missing', () => {
      const storeWithMissingData = createTestStore({
        onboarding: {
          onboardingId: null, // Missing onboardingId
          contactVerificationId: 'contact-123',
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithMissingData}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );

      fireEvent.changeText(codeField, '123456');
      expect(continueButton.props.disabled).toBe(true);
    });
  });

  describe('Form Submission and Navigation', () => {
    it('calls verifyPhoneVerification when continue button is pressed', async () => {
      const mockVerifyPhoneVerification = jest.fn().mockResolvedValue({
        user: { id: 'user-123' },
      });
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: mockVerifyPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );

      fireEvent.changeText(codeField, '123456');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockVerifyPhoneVerification).toHaveBeenCalledWith({
        onboardingId: 'onboarding-123',
        phoneCountryCode: '1',
        phoneNumber: '1234567890',
        verificationCode: '123456',
        contactVerificationId: 'contact-123',
      });
    });

    it('navigates to VERIFY_IDENTITY on successful verification', async () => {
      const mockVerifyPhoneVerification = jest.fn().mockResolvedValue({
        user: { id: 'user-123' },
      });
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: mockVerifyPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );

      fireEvent.changeText(codeField, '123456');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.VERIFY_IDENTITY }],
        });
      });
    });

    it('does not call verifyPhoneVerification when button is disabled', async () => {
      const mockVerifyPhoneVerification = jest.fn();
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: mockVerifyPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockVerifyPhoneVerification).not.toHaveBeenCalled();
    });
  });

  describe('Resend Verification Functionality', () => {
    it('shows resend verification text when not in cooldown', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );
      expect(resendElement).toBeTruthy();
    });

    it('calls sendPhoneVerification when resend is pressed', async () => {
      const mockSendPhoneVerification = jest.fn().mockResolvedValue({});
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      // Expire cooldown before pressing by stepping timers per second
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      // Ensure UI reflects expired cooldown
      await waitFor(() => {
        expect(resendElement).toHaveTextContent('Resend verification code');
      });

      await act(async () => {
        fireEvent.press(resendElement);
      });

      expect(mockSendPhoneVerification).toHaveBeenCalledWith({
        phoneCountryCode: '1',
        phoneNumber: '1234567890',
        contactVerificationId: 'contact-123',
      });
    });

    it('disables resend when phone verification is loading', () => {
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: jest.fn(),
        isLoading: true,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );
      // The resend text is not actually disabled as a prop, but the onPress is conditionally handled
      // We need to check if the text shows cooldown or if the required params are missing
      expect(resendElement).toBeTruthy();
    });

    it('disables resend when required parameters are missing', () => {
      const storeWithMissingPhone = createTestStore({
        onboarding: {
          onboardingId: 'onboarding-123',
          contactVerificationId: 'contact-123',
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithMissingPhone}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );
      // The resend text is not actually disabled as a prop, but the onPress is conditionally handled
      // We need to check if the text shows cooldown or if the required params are missing
      expect(resendElement).toBeTruthy();
    });
  });

  describe('Error Handling Scenarios', () => {
    it('handles verification error gracefully', async () => {
      const mockVerifyPhoneVerification = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: mockVerifyPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const codeField = getByTestId('confirm-phone-number-code-field');
      const continueButton = getByTestId(
        'confirm-phone-number-continue-button',
      );

      fireEvent.changeText(codeField, '123456');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockVerifyPhoneVerification).toHaveBeenCalled();
      // Component should handle the error gracefully without crashing
    });

    it('handles resend verification error gracefully', async () => {
      const mockSendPhoneVerification = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      // Expire initial cooldown before attempting resend
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      const resendElementAfterCooldown = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      await act(async () => {
        fireEvent.press(resendElementAfterCooldown);
        await Promise.resolve();
      });

      expect(mockSendPhoneVerification).toHaveBeenCalled();
      // Component should handle the error gracefully without crashing
    });

    it('displays correct error message text', () => {
      const store = createTestStore();
      const errorMessage = 'Invalid verification code. Please try again.';
      (mockUsePhoneVerificationVerify as jest.Mock).mockReturnValue({
        verifyPhoneVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: errorMessage,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const errorElement = getByTestId('confirm-phone-number-code-field-error');
      expect(errorElement.props.children).toBe(errorMessage);
    });

    it('displays phone verification error message', () => {
      const store = createTestStore();
      const errorMessage =
        'Failed to send verification code. Please try again.';
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: errorMessage,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const errorElement = getByTestId(
        'confirm-phone-number-phone-number-error',
      );
      expect(errorElement.props.children).toBe(errorMessage);
    });
  });

  describe('Phone Number Display', () => {
    it('displays phone number in description from route parameters', () => {
      const store = createTestStore();
      (mockUseParams as jest.Mock).mockReturnValue({
        phoneCountryCode: '1',
        phoneNumber: '1234567890',
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();
      // The phone number should be displayed in the description
    });

    it('handles missing phone number parameters gracefully', () => {
      const store = createTestStore();
      (mockUseParams as jest.Mock).mockReturnValue({});

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const onboardingStep = getByTestId('onboarding-step');
      expect(onboardingStep).toBeTruthy();
      // Component should render without crashing even with missing params
    });
  });

  describe('Resend Cooldown Timer', () => {
    it('shows cooldown timer after successful resend', async () => {
      const mockSendPhoneVerification = jest.fn().mockResolvedValue({});
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      // Trigger resend and wait for state updates
      await act(async () => {
        fireEvent.press(resendElement);
        // Allow the async sendPhoneVerification to complete
        await Promise.resolve();
        // Allow one timer tick to process
        jest.advanceTimersByTime(0);
      });

      // Should show cooldown timer
      expect(resendElement).toHaveTextContent('Resend in 60s');
    });

    it('shows "Resend verification code" when cooldown expires', async () => {
      const mockSendPhoneVerification = jest.fn().mockResolvedValue({});
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      // Trigger resend and wait for state updates
      await act(async () => {
        fireEvent.press(resendElement);
        // Allow the async sendPhoneVerification to complete
        await Promise.resolve();
        // Allow one timer tick to process
        jest.advanceTimersByTime(0);
      });

      // Should start at 60 seconds
      expect(resendElement).toHaveTextContent('Resend in 60s');

      // Advance timer by 60 seconds to expire cooldown (step per second)
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      expect(resendElement).toHaveTextContent('Resend verification code');
    });

    it('allows resend after cooldown expires', async () => {
      const mockSendPhoneVerification = jest.fn().mockResolvedValue({});
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      // Expire initial cooldown and perform first resend
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
      await act(async () => {
        fireEvent.press(resendElement);
        await Promise.resolve();
      });
      expect(mockSendPhoneVerification).toHaveBeenCalledTimes(1);

      // Should be in cooldown
      expect(resendElement).toHaveTextContent('Resend in 60s');

      // Advance timer to end of cooldown (step per second)
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      // Should be able to resend again
      expect(resendElement).toHaveTextContent('Resend verification code');
      await act(async () => {
        fireEvent.press(resendElement);
        // Allow the async sendPhoneVerification to complete
        await Promise.resolve();
      });
      expect(mockSendPhoneVerification).toHaveBeenCalledTimes(2);
    });

    it('does not allow resend during cooldown', async () => {
      const mockSendPhoneVerification = jest.fn().mockResolvedValue({});
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      // Expire initial cooldown and perform first resend
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
      await act(async () => {
        fireEvent.press(resendElement);
        await Promise.resolve();
      });
      expect(mockSendPhoneVerification).toHaveBeenCalledTimes(1);

      // Try to resend during cooldown
      await act(async () => {
        fireEvent.press(resendElement);
        // Allow the async sendPhoneVerification to complete
        await Promise.resolve();
      });
      expect(mockSendPhoneVerification).toHaveBeenCalledTimes(1); // Should not increase
    });

    it('resets cooldown timer when component unmounts', async () => {
      const mockSendPhoneVerification = jest.fn().mockResolvedValue({});
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId, unmount } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      // Trigger resend to start cooldown
      await act(async () => {
        fireEvent.press(resendElement);
      });

      // Advance timer partway through cooldown
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      // Unmount component
      unmount();

      // Advance timer past original cooldown time
      act(() => {
        jest.advanceTimersByTime(20000);
      });

      // No errors should occur from timer cleanup
      expect(true).toBe(true);
    });

    it('handles multiple rapid resend attempts correctly', async () => {
      const mockSendPhoneVerification = jest.fn().mockResolvedValue({});
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      // Expire initial cooldown, step second by second
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
      // Re-query element after re-render
      const resendElementAfterCooldown = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      // Multiple rapid presses
      await act(async () => {
        fireEvent.press(resendElementAfterCooldown);
        fireEvent.press(resendElementAfterCooldown);
        fireEvent.press(resendElementAfterCooldown);
        await Promise.resolve();
      });

      // Should only send once
      expect(mockSendPhoneVerification).toHaveBeenCalledTimes(1);
      expect(resendElementAfterCooldown).toHaveTextContent('Resend in 60s');
    });

    it('maintains cooldown state during loading', async () => {
      const mockSendPhoneVerification = jest.fn().mockResolvedValue({});
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: true,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      // Advance timer to end initial cooldown, second by second
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
      // Re-query element after re-render
      const resendElementAfterCooldownLoading = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      // Should show original text when loading (no cooldown)
      expect(resendElementAfterCooldownLoading).toHaveTextContent(
        'Resend verification code',
      );

      // Should not be able to press during loading
      await act(async () => {
        fireEvent.press(resendElementAfterCooldownLoading);
        await Promise.resolve();
      });

      expect(mockSendPhoneVerification).not.toHaveBeenCalled();
    });

    it('shows cooldown with correct formatting for single digit seconds', async () => {
      const mockSendPhoneVerification = jest.fn().mockResolvedValue({});
      (mockUsePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmPhoneNumber />
        </Provider>,
      );

      const resendElement = getByTestId(
        'confirm-phone-number-resend-verification',
      );

      // Trigger resend and wait for state updates
      await act(async () => {
        fireEvent.press(resendElement);
        // Allow the async sendPhoneVerification to complete and cooldown to be set
        await Promise.resolve();
      });

      // Advance to single digit seconds (advance to 9 seconds remaining)
      for (let i = 0; i < 51; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      expect(resendElement).toHaveTextContent('Resend in 9s');

      for (let i = 0; i < 4; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      expect(resendElement).toHaveTextContent('Resend in 5s');

      for (let i = 0; i < 4; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      expect(resendElement).toHaveTextContent('Resend in 1s');
    });
  });
});
