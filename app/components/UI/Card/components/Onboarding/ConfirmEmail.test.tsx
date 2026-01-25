import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
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
        ..._props
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
          testID: 'confirm-email-code-field',
          value,
          onChangeText,
          keyboardType,
          textContentType,
          autoComplete,
          maxLength: cellCount,
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

  const mockUseClearByFocusCell = ({
    value: _value,
    setValue: _setValue,
  }: {
    value: string;
    setValue: (text: string) => void;
  }) => [
    {
      // Return empty object since the direct onChangeText prop will override
    },
    jest.fn(),
  ];

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
    useClearByFocusCell: mockUseClearByFocusCell,
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

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_ONBOARDING_BUTTON_CLICKED: 'card_onboarding_button_clicked',
    CARD_ONBOARDING_PAGE_VIEWED: 'card_onboarding_page_viewed',
  },
}));

jest.mock('../../../../../component-library/components/Toast', () => {
  const React = jest.requireActual('react');
  return {
    ToastContext: React.createContext({
      toastRef: {
        current: {
          showToast: jest.fn(),
        },
      },
    }),
    ToastVariants: {
      Icon: 'icon',
    },
  };
});

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn(
    (key: string, params?: { [key: string]: string | number }) => {
      const mockStrings: { [key: string]: string } = {
        'card.card_onboarding.confirm_email.title': 'Confirm your email',
        'card.card_onboarding.confirm_email.description':
          'We sent a 6-digit code to {email}. Enter it below to verify your email.',
        'card.card_onboarding.confirm_email.confirm_code_label':
          'Confirmation code',
        'card.card_onboarding.confirm_email.resend_verification':
          'Resend verification code',
        'card.card_onboarding.confirm_email.resend_cooldown':
          'Resend in {seconds}s',
        'card.card_onboarding.confirm_email.didnt_receive_code':
          "Didn't receive a code? ",
        'card.card_onboarding.continue_button': 'Continue',
        'card.card_onboarding.account_exists.title':
          'You already have an account',
        'card.card_onboarding.account_exists.description':
          'The email address {email} is already associated with a Card account.',
        'card.card_onboarding.account_exists.confirm_button': 'Log in',
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
const mockUseEmailVerificationVerify = jest.fn();
const mockUseEmailVerificationSend = jest.fn();
const mockSetUser = jest.fn();

jest.mock('../../hooks/useEmailVerificationVerify', () => ({
  __esModule: true,
  default: () => mockUseEmailVerificationVerify(),
}));

jest.mock('../../hooks/useEmailVerificationSend', () => ({
  __esModule: true,
  default: () => mockUseEmailVerificationSend(),
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
            selectedCountry: 'US',
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

describe('ConfirmEmail Component', () => {
  const mockNavigate = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

  let store: ReturnType<typeof createTestStore>;

  const mockSendEmailVerification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    store = createTestStore();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as never);
    mockUseParams.mockReturnValue({
      email: 'test@example.com',
      password: 'testPassword123',
    });

    // Set up useMetrics mock
    const { useMetrics } = jest.requireMock('../../../../hooks/useMetrics');
    useMetrics.mockReturnValue({
      trackEvent: jest.fn(),
      createEventBuilder: jest.fn(() => ({
        addProperties: jest.fn(() => ({
          build: jest.fn(() => ({})),
        })),
      })),
    });

    // Set up default mock returns for hooks
    const mockVerifyEmailVerification = jest.fn().mockResolvedValue({
      onboardingId: 'new-onboarding-123',
      user: { id: 'user-123', name: 'Test User' },
    });
    mockUseEmailVerificationVerify.mockReturnValue({
      verifyEmailVerification: mockVerifyEmailVerification,
      isLoading: false,
      isError: false,
      error: null,
      reset: jest.fn(),
    });

    mockSendEmailVerification.mockResolvedValue({
      contactVerificationId: 'new-contact-123',
    });
    mockUseEmailVerificationSend.mockReturnValue({
      sendEmailVerification: mockSendEmailVerification,
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
    it('should render the ConfirmEmail component correctly', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('should display correct title and description with email', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      expect(getByTestId('onboarding-step-title')).toHaveTextContent(
        'Confirm your email',
      );
      expect(getByTestId('onboarding-step-description')).toHaveTextContent(
        'We sent a 6-digit code to test@example.com. Enter it below to verify your email.',
      );
    });
  });

  describe('Form Fields', () => {
    it('renders confirmation code field with correct properties', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeField = getByTestId('confirm-email-code-field');
      expect(codeField).toBeTruthy();
    });

    it('renders code field input element', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');
      expect(codeFieldInput).toBeTruthy();
    });

    it('should update confirmation code value when text changes', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');
      await act(async () => {
        fireEvent.changeText(codeFieldInput, '123456');
      });

      expect(codeFieldInput.props.value).toBe('123456');
    });

    it('should handle partial code input', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');
      fireEvent.changeText(codeFieldInput, '123');

      expect(codeFieldInput.props.value).toBe('123');
    });
  });

  describe('Continue Button', () => {
    it('should render continue button', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const button = getByTestId('confirm-email-continue-button');
      expect(button).toBeTruthy();
      expect(getByTestId('button-label')).toHaveTextContent('Continue');
    });

    it('should be disabled when confirmation code is empty', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const button = getByTestId('confirm-email-continue-button');
      expect(button.props.disabled).toBe(true);
    });

    it('should remain enabled when confirmation code is incomplete', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');
      fireEvent.changeText(codeFieldInput, '123');

      const button = getByTestId('confirm-email-continue-button');
      expect(button.props.disabled).toBe(false);
    });

    it('should be enabled when confirmation code is complete', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');
      fireEvent.changeText(codeFieldInput, '123456');

      const button = getByTestId('confirm-email-continue-button');
      expect(button.props.disabled).toBe(false);
    });

    it('should navigate to CONFIRM_PHONE_NUMBER when continue button is pressed', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');
      await act(async () => {
        fireEvent.changeText(codeFieldInput, '123456');
        // Small delay to prevent auto-submit from interfering
        jest.advanceTimersByTime(50);
      });

      const button = getByTestId('confirm-email-continue-button');
      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.ONBOARDING.SET_PHONE_NUMBER,
        );
      });
    });
  });

  describe('Auto-submit Functionality', () => {
    it('should auto-submit when 6 digits are entered', async () => {
      const store = createTestStore();

      // Create a spy for the mock function to track calls
      const mockVerifyEmailVerification = jest.fn().mockResolvedValue({
        onboardingId: 'new-onboarding-123',
        user: { id: 'user-123', name: 'Test User' },
      });

      // Set up the mock before rendering
      mockUseEmailVerificationVerify.mockReturnValue({
        verifyEmailVerification: mockVerifyEmailVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');

      // Simulate entering 6 digits and flush effects
      await act(async () => {
        const onChangeTextHandler = codeFieldInput.props.onChangeText;
        if (onChangeTextHandler) {
          onChangeTextHandler('123456');
        }
      });

      // Verify the verification function was called
      expect(mockVerifyEmailVerification).toHaveBeenCalled();

      // Navigation should be called after verification
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.SET_PHONE_NUMBER,
      );
    }, 10000);

    it('should not auto-submit when less than 6 digits are entered', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');
      fireEvent.changeText(codeFieldInput, '12345');

      // Should not navigate with incomplete code
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not auto-submit the same code twice', async () => {
      const store = createTestStore();

      // Create a spy for the mock function to track calls
      const mockVerifyEmailVerification = jest.fn().mockResolvedValue({
        onboardingId: 'new-onboarding-123',
        user: { id: 'user-123', name: 'Test User' },
      });

      // Set up the mock before rendering
      mockUseEmailVerificationVerify.mockReturnValue({
        verifyEmailVerification: mockVerifyEmailVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');

      // First submission - enter 6 digits and flush effects
      await act(async () => {
        const onChangeTextHandler = codeFieldInput.props.onChangeText;
        if (onChangeTextHandler) {
          onChangeTextHandler('123456');
        }
      });
      expect(mockVerifyEmailVerification).toHaveBeenCalledTimes(1);

      // Second submission - enter the same code again
      await act(async () => {
        const onChangeTextHandler = codeFieldInput.props.onChangeText;
        if (onChangeTextHandler) {
          onChangeTextHandler('123456');
        }
      });

      // Component resets latestValueSubmitted on change; duplicate input triggers another submit
      expect(mockVerifyEmailVerification).toHaveBeenCalledTimes(2);

      // Navigation should be called again on duplicate input
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    }, 20000);
  });

  describe('Email Integration', () => {
    it('should display email from params in description', () => {
      mockUseParams.mockReturnValue({
        email: 'user@test.com',
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      expect(getByTestId('onboarding-step-description')).toHaveTextContent(
        'We sent a 6-digit code to user@test.com. Enter it below to verify your email.',
      );
    });

    it('should handle missing email parameter', () => {
      mockUseParams.mockReturnValue({});

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      // Should still render without crashing
      expect(getByTestId('onboarding-step')).toBeTruthy();
    });
  });

  describe('Resend Verification Functionality', () => {
    it('shows resend verification text when not in cooldown', () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const resendElement = getByTestId('confirm-email-resend-verification');
      expect(resendElement).toBeTruthy();
    });

    it('calls sendEmailVerification when resend is pressed', async () => {
      const mockSendEmailVerificationLocal = jest.fn().mockResolvedValue({
        contactVerificationId: 'new-contact-123',
      });
      mockUseEmailVerificationSend.mockReturnValue({
        sendEmailVerification: mockSendEmailVerificationLocal,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByText } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      // First, advance timer to end initial cooldown
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      // Press the resend link (inner Text element with onPress)
      const resendLink = getByText('Resend verification code');
      await act(async () => {
        fireEvent.press(resendLink);
      });

      expect(mockSendEmailVerificationLocal).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('Resend Cooldown Timer', () => {
    it('shows initial cooldown timer on component mount', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const resendElement = getByTestId('confirm-email-resend-verification');

      // Should start with cooldown
      expect(resendElement).toHaveTextContent('Resend in 60s');
    });

    it('shows "Resend verification code" when initial cooldown expires', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const resendElement = getByTestId('confirm-email-resend-verification');

      // During cooldown, shows countdown text
      expect(resendElement).toHaveTextContent('Resend in 60s');

      // Advance timer by 60 seconds, one second at a time to trigger all timer callbacks
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      // After cooldown, shows both "Didn't receive a code?" and "Resend verification code"
      expect(resendElement).toHaveTextContent(/receive a code/i);
      expect(resendElement).toHaveTextContent(/Resend verification code/i);
    });

    it('allows resend after initial cooldown expires', async () => {
      const store = createTestStore();
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const resendElement = getByTestId('confirm-email-resend-verification');

      // Advance timer to end initial cooldown, one second at a time
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      // After cooldown, shows both texts
      expect(resendElement).toHaveTextContent(/receive a code/i);
      expect(resendElement).toHaveTextContent(/Resend verification code/i);

      // Press the resend link (inner Text element with onPress)
      const resendLink = getByText('Resend verification code');
      await act(async () => {
        fireEvent.press(resendLink);
        // Allow the async sendEmailVerification to complete
        await Promise.resolve();
        // Allow one timer tick to process
        jest.advanceTimersByTime(0);
      });

      expect(mockSendEmailVerification).toHaveBeenCalledTimes(1);

      // Should be in cooldown again
      expect(resendElement).toHaveTextContent('Resend in 60s');

      // Advance timer to end of cooldown, one second at a time
      for (let i = 0; i < 60; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      // After cooldown, shows both texts again
      expect(resendElement).toHaveTextContent(/receive a code/i);
      expect(resendElement).toHaveTextContent(/Resend verification code/i);

      // Press resend again
      const resendLinkAgain = getByText('Resend verification code');
      await act(async () => {
        fireEvent.press(resendLinkAgain);
        // Allow the async sendEmailVerification to complete
        await Promise.resolve();
        // Allow one timer tick to process
        jest.advanceTimersByTime(0);
      });

      expect(mockSendEmailVerification).toHaveBeenCalledTimes(2);
    });

    it('prevents resend during initial cooldown', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const resendElement = getByTestId('confirm-email-resend-verification');

      // Should start with cooldown
      expect(resendElement).toHaveTextContent('Resend in 60s');

      // Try to press resend during cooldown
      await act(async () => {
        fireEvent.press(resendElement);
        // Allow any async operations to complete
        await Promise.resolve();
        // Allow one timer tick to process
        jest.advanceTimersByTime(0);
      });

      // Should not have called sendEmailVerification
      expect(mockSendEmailVerification).toHaveBeenCalledTimes(0);

      // Should still show cooldown
      expect(resendElement).toHaveTextContent('Resend in 60s');
    });
  });

  describe('Error Handling', () => {
    it('shows verification error when verifyIsError is true', () => {
      mockUseEmailVerificationVerify.mockReturnValue({
        verifyEmailVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: 'Invalid verification code',
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      expect(getByTestId('confirm-email-error-text')).toBeTruthy();
    });

    it('shows email verification error when emailVerificationIsError is true', () => {
      mockUseEmailVerificationSend.mockReturnValue({
        sendEmailVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: 'Failed to send verification code',
        reset: jest.fn(),
      });

      const store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      expect(getByTestId('confirm-email-error-text')).toBeTruthy();
    });
  });

  describe('Confirm Modal Navigation', () => {
    it('navigates to confirm modal when account already exists', async () => {
      const store = createTestStore();

      const mockVerifyEmailVerification = jest.fn().mockResolvedValue({
        onboardingId: null,
        hasAccount: true,
      });

      mockUseEmailVerificationVerify.mockReturnValue({
        verifyEmailVerification: mockVerifyEmailVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');

      await act(async () => {
        fireEvent.changeText(codeFieldInput, '123456');
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.CONFIRM_MODAL,
        params: expect.objectContaining({
          title: 'You already have an account',
          description:
            'The email address test@example.com is already associated with a Card account.',
          confirmAction: expect.objectContaining({
            label: 'Log in',
          }),
        }),
      });
    });

    it('passes correct icon to confirm modal when account exists', async () => {
      const store = createTestStore();

      const mockVerifyEmailVerification = jest.fn().mockResolvedValue({
        onboardingId: null,
        hasAccount: true,
      });

      mockUseEmailVerificationVerify.mockReturnValue({
        verifyEmailVerification: mockVerifyEmailVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');

      await act(async () => {
        fireEvent.changeText(codeFieldInput, '123456');
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.MODALS.ID,
        expect.objectContaining({
          params: expect.objectContaining({
            icon: 'UserCheck',
          }),
        }),
      );
    });

    it('navigates to authentication screen when confirm action is pressed', async () => {
      const store = createTestStore();

      let capturedOnPress: (() => void) | undefined;

      const mockVerifyEmailVerification = jest.fn().mockResolvedValue({
        onboardingId: null,
        hasAccount: true,
      });

      mockUseEmailVerificationVerify.mockReturnValue({
        verifyEmailVerification: mockVerifyEmailVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      mockNavigate.mockImplementation((_route, params) => {
        if (params?.params?.confirmAction?.onPress) {
          capturedOnPress = params.params.confirmAction.onPress;
        }
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');

      await act(async () => {
        fireEvent.changeText(codeFieldInput, '123456');
      });

      expect(capturedOnPress).toEqual(expect.any(Function));

      mockNavigate.mockClear();

      capturedOnPress?.();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.AUTHENTICATION);
    });

    it('does not navigate to confirm modal when onboardingId is returned', async () => {
      const store = createTestStore();

      const mockVerifyEmailVerification = jest.fn().mockResolvedValue({
        onboardingId: 'new-onboarding-123',
        hasAccount: false,
      });

      mockUseEmailVerificationVerify.mockReturnValue({
        verifyEmailVerification: mockVerifyEmailVerification,
        isLoading: false,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ConfirmEmail />
        </Provider>,
      );

      const codeFieldInput = getByTestId('confirm-email-code-field');

      await act(async () => {
        fireEvent.changeText(codeFieldInput, '123456');
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.CARD.MODALS.ID,
        expect.anything(),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.SET_PHONE_NUMBER,
      );
    });
  });
});
