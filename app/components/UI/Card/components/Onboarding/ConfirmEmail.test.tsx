/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ConfirmEmail from './ConfirmEmail';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../../../util/navigation/navUtils';

// Mock Toast Context values
const mockToastRef = {
  current: {
    showToast: jest.fn(),
  },
};

const mockToastContext = {
  toastRef: mockToastRef,
};

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(() => ({
    email: 'test@example.com',
    password: 'test-password',
  })),
}));

// Mock Routes
jest.mock('../../../../../constants/navigation/Routes', () => ({
  CARD: {
    ONBOARDING: {
      SET_PHONE_NUMBER: 'CardOnboardingSetPhoneNumber',
      SIGN_UP: 'CardOnboardingSignUp',
    },
    AUTHENTICATION: 'CardAuthentication',
  },
}));

// Mock CardError
jest.mock('../../types', () => ({
  CardError: class CardError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'CardError';
    }
  },
}));

// Mock theme
jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      info: {
        default: '#4459ff',
      },
    },
  })),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'card.card_onboarding.confirm_email.description') {
      return `Enter code sent to ${options?.email}`;
    }
    if (key === 'card.card_onboarding.confirm_email.resend_cooldown') {
      return `Resend in ${options?.seconds}s`;
    }
    const translations: Record<string, string> = {
      'card.card_onboarding.confirm_email.title': 'Confirm Email',
      'card.card_onboarding.confirm_email.confirm_code_label':
        'Confirmation Code',
      'card.card_onboarding.confirm_email.confirm_code_placeholder':
        'Enter code',
      'card.card_onboarding.confirm_email.resend_verification':
        'Resend verification code',
      'card.card_onboarding.confirm_email.account_exists':
        'Account already exists',
      'card.card_onboarding.continue_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

// Mock Toast Context
jest.mock('../../../../../component-library/components/Toast', () => {
  const React = jest.requireActual('react');
  return {
    ToastContext: React.createContext(null),
    ToastVariants: {
      Icon: 'icon',
    },
  };
});

// Mock Icon
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    Info: 'info',
  },
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  const Box = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(View, props, children);

  const Text = ({
    children,
    onPress,
    disabled,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(RNText, { onPress, disabled, ...props }, children);

  return {
    Box,
    Text,
    TextVariant: {
      BodySm: 'BodySm',
    },
  };
});

// Mock Button
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  const ButtonVariants = {
    Primary: 'primary',
  };

  const ButtonSize = {
    Lg: 'lg',
  };

  const ButtonWidthTypes = {
    Full: 'full',
  };

  const MockButton = ({
    label,
    onPress,
    isDisabled,
    testID,
  }: {
    label: string;
    onPress: () => void;
    isDisabled?: boolean;
    testID?: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID,
        onPress: isDisabled ? undefined : onPress,
        disabled: isDisabled,
      },
      React.createElement(Text, {}, label),
    );

  MockButton.displayName = 'Button';

  return {
    __esModule: true,
    default: MockButton,
    ButtonVariants,
    ButtonSize,
    ButtonWidthTypes,
  };
});

// Mock TextField
jest.mock('../../../../../component-library/components/Form/TextField', () => {
  const React = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  const TextFieldSize = {
    Lg: 'lg',
  };

  const MockTextField = ({
    testID,
    onChangeText,
    value,
    placeholder,
    accessibilityLabel,
    keyboardType,
    maxLength,
  }: {
    testID?: string;
    onChangeText?: (text: string) => void;
    value?: string;
    placeholder?: string;
    accessibilityLabel?: string;
    keyboardType?: string;
    maxLength?: number;
  }) =>
    React.createElement(TextInput, {
      testID,
      onChangeText,
      value,
      placeholder,
      accessibilityLabel,
      keyboardType,
      maxLength,
    });

  MockTextField.displayName = 'TextField';

  return {
    __esModule: true,
    default: MockTextField,
    TextFieldSize,
  };
});

// Mock Label
jest.mock('../../../../../component-library/components/Form/Label', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(Text, props, children);
});

// Mock hooks
const mockVerifyHook = {
  verifyEmailVerification: jest.fn(),
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null as string | null,
  clearError: jest.fn(),
  reset: jest.fn(),
};

const mockSendHook = {
  sendEmailVerification: jest.fn(),
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null as string | null,
  clearError: jest.fn(),
  reset: jest.fn(),
};

jest.mock('../../hooks/useEmailVerificationVerify', () => ({
  __esModule: true,
  default: jest.fn(() => mockVerifyHook),
}));

jest.mock('../../hooks/useEmailVerificationSend', () => ({
  __esModule: true,
  default: jest.fn(() => mockSendHook),
}));

// Mock OnboardingStep component
jest.mock('./OnboardingStep', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return ({
    title,
    description,
    formFields,
    actions,
  }: {
    title: React.ReactNode;
    description: React.ReactNode;
    formFields: React.ReactNode;
    actions: React.ReactNode;
  }) =>
    React.createElement(
      View,
      { testID: 'onboarding-step' },
      React.createElement(View, { testID: 'onboarding-step-title' }, title),
      React.createElement(
        View,
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

// Mock Redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const createTestStore = (initialState = {}) =>
  configureStore({
    reducer: {
      card: (
        state = {
          onboarding: {
            onboardingId: 'test-onboarding-id',
            contactVerificationId: 'test-contact-verification-id',
            selectedCountry: 'US',
            user: null,
            ...initialState,
          },
        },
        action = { type: '', payload: null },
      ) => {
        switch (action.type) {
          case 'card/setOnboardingId':
            return {
              ...state,
              onboarding: {
                ...state.onboarding,
                onboardingId: action.payload,
              },
            };
          case 'card/setContactVerificationId':
            return {
              ...state,
              onboarding: {
                ...state.onboarding,
                contactVerificationId: action.payload,
              },
            };
          default:
            return state;
        }
      },
    },
  });

describe('ConfirmEmail Component', () => {
  const mockNavigate = jest.fn();
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset hook mocks
    Object.assign(mockVerifyHook, {
      verifyEmailVerification: jest.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      clearError: jest.fn(),
      reset: jest.fn(),
    });

    Object.assign(mockSendHook, {
      sendEmailVerification: jest.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      clearError: jest.fn(),
      reset: jest.fn(),
    });

    // Setup navigation mock
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    // Setup Redux mock
    const { useSelector, useDispatch } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: any) =>
      selector({
        card: {
          onboarding: {
            selectedCountry: 'US',
            contactVerificationId: 'test-contact-id',
          },
        },
      }),
    );
    useDispatch.mockReturnValue(mockDispatch);

    // Setup params mock
    (useParams as jest.Mock).mockReturnValue({
      email: 'test@example.com',
      password: 'test-password',
    });

    // Reset toast mock
    mockToastRef.current.showToast.mockClear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const renderComponent = (storeState = {}) => {
    const { ToastContext } = jest.requireMock(
      '../../../../../component-library/components/Toast',
    );
    const testStore = createTestStore(storeState);
    return render(
      <Provider store={testStore}>
        <ToastContext.Provider value={mockToastContext}>
          <ConfirmEmail />
        </ToastContext.Provider>
      </Provider>,
    );
  };

  describe('Initial Render', () => {
    it('renders the component successfully', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('displays correct title and description', () => {
      const { getByTestId } = renderComponent();

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');

      expect(title.props.children).toBe('Confirm Email');
      expect(description.props.children).toBe(
        'Enter code sent to test@example.com',
      );
    });

    it('renders confirmation code input field', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('confirm-code-input')).toBeTruthy();
    });

    it('renders continue button', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('confirm-email-continue-button')).toBeTruthy();
    });

    it('renders resend verification text', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('resend-verification-text')).toBeTruthy();
    });
  });

  describe('Form Input Handling', () => {
    it('updates confirmation code when input changes', () => {
      const { getByTestId } = renderComponent();

      const input = getByTestId('confirm-code-input');
      fireEvent.changeText(input, '123456');

      expect(input.props.value).toBe('123456');
    });

    it('calls reset when confirmation code changes', () => {
      const { getByTestId } = renderComponent();

      const input = getByTestId('confirm-code-input');
      fireEvent.changeText(input, '123456');

      expect(mockVerifyHook.reset).toHaveBeenCalled();
    });

    it('allows numeric input for confirmation code', () => {
      const { getByTestId } = renderComponent();

      const input = getByTestId('confirm-code-input');

      expect(input.props.keyboardType).toBe('numeric');
    });

    it('limits confirmation code to 255 characters', () => {
      const { getByTestId } = renderComponent();

      const input = getByTestId('confirm-code-input');

      expect(input.props.maxLength).toBe(255);
    });
  });

  describe('Form Validation', () => {
    it('disables continue button when confirmation code is empty', () => {
      const { getByTestId } = renderComponent();

      const button = getByTestId('confirm-email-continue-button');

      expect(button.props.disabled).toBe(true);
    });

    it('disables continue button when email is missing', () => {
      (useParams as jest.Mock).mockReturnValue({
        email: '',
        password: 'test-password',
      });

      const { getByTestId } = renderComponent();

      const button = getByTestId('confirm-email-continue-button');

      expect(button.props.disabled).toBe(true);
    });

    it('disables continue button when password is missing', () => {
      (useParams as jest.Mock).mockReturnValue({
        email: 'test@example.com',
        password: '',
      });

      const { getByTestId } = renderComponent();

      const button = getByTestId('confirm-email-continue-button');

      expect(button.props.disabled).toBe(true);
    });

    it('disables continue button when selected country is missing', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: null,
              contactVerificationId: 'test-contact-id',
            },
          },
        }),
      );

      const { getByTestId } = renderComponent();

      const button = getByTestId('confirm-email-continue-button');

      expect(button.props.disabled).toBe(true);
    });

    it('disables continue button when contact verification ID is missing', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: 'US',
              contactVerificationId: null,
            },
          },
        }),
      );

      const { getByTestId } = renderComponent();

      const button = getByTestId('confirm-email-continue-button');

      expect(button.props.disabled).toBe(true);
    });

    it('disables continue button when verification is loading', () => {
      mockVerifyHook.isLoading = true;

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');

      const button = getByTestId('confirm-email-continue-button');

      expect(button.props.disabled).toBe(true);
    });

    it('disables continue button when verification has error', () => {
      mockVerifyHook.isError = true;
      mockVerifyHook.error = 'Invalid code';

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');

      const button = getByTestId('confirm-email-continue-button');

      expect(button.props.disabled).toBe(true);
    });

    it('enables continue button when all required fields are filled', () => {
      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');

      const button = getByTestId('confirm-email-continue-button');

      expect(button.props.disabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('displays verification error when present', () => {
      mockVerifyHook.isError = true;
      mockVerifyHook.error = 'Invalid verification code';

      const { getByTestId, getByText } = renderComponent();

      expect(getByTestId('confirm-code-error-text')).toBeTruthy();
      expect(getByText('Invalid verification code')).toBeTruthy();
    });

    it('displays email verification error when present', () => {
      mockSendHook.isError = true;
      mockSendHook.error = 'Failed to send verification email';

      const { getByTestId, getByText } = renderComponent();

      expect(getByTestId('confirm-email-error-text')).toBeTruthy();
      expect(getByText('Failed to send verification email')).toBeTruthy();
    });

    it('hides verification error when no error exists', () => {
      mockVerifyHook.isError = false;
      mockVerifyHook.error = null;

      const { queryByTestId } = renderComponent();

      expect(queryByTestId('confirm-code-error-text')).toBeFalsy();
    });

    it('hides email error when no error exists', () => {
      mockSendHook.isError = false;
      mockSendHook.error = null;

      const { queryByTestId } = renderComponent();

      expect(queryByTestId('confirm-email-error-text')).toBeFalsy();
    });
  });

  describe('handleContinue', () => {
    it('returns early when selected country is missing', async () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: null,
              contactVerificationId: 'test-contact-id',
            },
          },
        }),
      );

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      expect(mockVerifyHook.verifyEmailVerification).not.toHaveBeenCalled();
    });

    it('returns early when email is missing', async () => {
      (useParams as jest.Mock).mockReturnValue({
        email: '',
        password: 'test-password',
      });

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      expect(mockVerifyHook.verifyEmailVerification).not.toHaveBeenCalled();
    });

    it('returns early when password is missing', async () => {
      (useParams as jest.Mock).mockReturnValue({
        email: 'test@example.com',
        password: '',
      });

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      expect(mockVerifyHook.verifyEmailVerification).not.toHaveBeenCalled();
    });

    it('returns early when confirmation code is missing', async () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('confirm-email-continue-button'));

      expect(mockVerifyHook.verifyEmailVerification).not.toHaveBeenCalled();
    });

    it('returns early when contact verification ID is missing', async () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: 'US',
              contactVerificationId: null,
            },
          },
        }),
      );

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      expect(mockVerifyHook.verifyEmailVerification).not.toHaveBeenCalled();
    });

    it('calls verifyEmailVerification with correct parameters', async () => {
      mockVerifyHook.verifyEmailVerification.mockResolvedValue({
        onboardingId: 'new-onboarding-id',
        hasAccount: false,
      });

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      await waitFor(() => {
        expect(mockVerifyHook.verifyEmailVerification).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'test-password',
          verificationCode: '123456',
          contactVerificationId: 'test-contact-id',
          countryOfResidence: 'US',
          allowMarketing: true,
          allowSms: true,
        });
      });
    });

    it('dispatches setOnboardingId when onboarding ID is returned', async () => {
      mockVerifyHook.verifyEmailVerification.mockResolvedValue({
        onboardingId: 'new-onboarding-id',
        hasAccount: false,
      });

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it('navigates to set phone number when onboarding ID is returned', async () => {
      mockVerifyHook.verifyEmailVerification.mockResolvedValue({
        onboardingId: 'new-onboarding-id',
        hasAccount: false,
      });

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          'CardOnboardingSetPhoneNumber',
        );
      });
    });

    it('navigates to authentication when hasAccount is true', async () => {
      mockVerifyHook.verifyEmailVerification.mockResolvedValue({
        onboardingId: null,
        hasAccount: true,
      });

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('CardAuthentication');
      });
    });

    it('shows toast when hasAccount is true', async () => {
      mockVerifyHook.verifyEmailVerification.mockResolvedValue({
        onboardingId: null,
        hasAccount: true,
      });

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalledWith({
          variant: 'icon',
          hasNoTimeout: false,
          iconName: 'info',
          iconColor: '#4459ff',
          labelOptions: [
            {
              label: 'Account already exists',
              isBold: true,
            },
          ],
        });
      });
    });

    it('navigates to sign up when invalid contact verification ID error occurs', async () => {
      const { CardError } = jest.requireMock('../../types');
      mockVerifyHook.verifyEmailVerification.mockRejectedValue(
        new CardError('Invalid or expired contact verification ID'),
      );

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('CardOnboardingSignUp');
      });
    });

    it('allows error display for general errors', async () => {
      mockVerifyHook.verifyEmailVerification.mockRejectedValue(
        new Error('Network error'),
      );

      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('confirm-code-input'), '123456');
      fireEvent.press(getByTestId('confirm-email-continue-button'));

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('handleResendVerification', () => {
    it('returns early when resend cooldown is active', async () => {
      mockSendHook.sendEmailVerification.mockResolvedValue({
        contactVerificationId: 'new-verification-id',
      });

      const { getByTestId } = renderComponent();

      // Trigger a resend to start cooldown
      fireEvent.press(getByTestId('resend-verification-text'));

      await waitFor(() => {
        expect(mockSendHook.sendEmailVerification).toHaveBeenCalledTimes(1);
      });

      // Try to resend again immediately (while cooldown is active)
      fireEvent.press(getByTestId('resend-verification-text'));

      // Should still be 1 call, not 2
      expect(mockSendHook.sendEmailVerification).toHaveBeenCalledTimes(1);
    });

    it('returns early when email is missing', async () => {
      (useParams as jest.Mock).mockReturnValue({
        email: '',
        password: 'test-password',
      });

      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('resend-verification-text'));

      expect(mockSendHook.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('calls sendEmailVerification with correct email', async () => {
      mockSendHook.sendEmailVerification.mockResolvedValue({
        contactVerificationId: 'new-verification-id',
      });

      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('resend-verification-text'));

      await waitFor(() => {
        expect(mockSendHook.sendEmailVerification).toHaveBeenCalledWith(
          'test@example.com',
        );
      });
    });

    it('dispatches setContactVerificationId on successful resend', async () => {
      mockSendHook.sendEmailVerification.mockResolvedValue({
        contactVerificationId: 'new-verification-id',
      });

      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('resend-verification-text'));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it('sets 60 second cooldown after successful resend', async () => {
      mockSendHook.sendEmailVerification.mockResolvedValue({
        contactVerificationId: 'new-verification-id',
      });

      const { getByTestId, getByText } = renderComponent();

      fireEvent.press(getByTestId('resend-verification-text'));

      await waitFor(() => {
        expect(getByText('Resend in 60s')).toBeTruthy();
      });
    });

    it('allows error display when resend fails', async () => {
      mockSendHook.sendEmailVerification.mockRejectedValue(
        new Error('Failed to send'),
      );

      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('resend-verification-text'));

      await waitFor(() => {
        expect(mockSendHook.sendEmailVerification).toHaveBeenCalled();
      });
    });

    it('disables resend text during email verification loading', () => {
      mockSendHook.isLoading = true;

      const { getByTestId } = renderComponent();

      const resendText = getByTestId('resend-verification-text');

      expect(resendText.props.disabled).toBe(true);
    });

    it('disables resend text when email is missing', () => {
      (useParams as jest.Mock).mockReturnValue({
        email: '',
        password: 'test-password',
      });

      const { getByTestId } = renderComponent();

      const resendText = getByTestId('resend-verification-text');

      expect(resendText.props.disabled).toBe(true);
    });

    it('disables resend text when selected country is missing', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: null,
              contactVerificationId: 'test-contact-id',
            },
          },
        }),
      );

      const { getByTestId } = renderComponent();

      const resendText = getByTestId('resend-verification-text');

      expect(resendText.props.disabled).toBe(true);
    });
  });

  describe('Cooldown Timer', () => {
    it('decrements cooldown every second', async () => {
      mockSendHook.sendEmailVerification.mockResolvedValue({
        contactVerificationId: 'new-verification-id',
      });

      const { getByTestId, getByText } = renderComponent();

      fireEvent.press(getByTestId('resend-verification-text'));

      await waitFor(() => {
        expect(getByText('Resend in 60s')).toBeTruthy();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(getByText('Resend in 59s')).toBeTruthy();
      });
    });

    it('enables resend text when cooldown reaches zero', async () => {
      mockSendHook.sendEmailVerification.mockResolvedValue({
        contactVerificationId: 'new-verification-id',
      });

      const { getByTestId, getByText, queryByText } = renderComponent();

      fireEvent.press(getByTestId('resend-verification-text'));

      await waitFor(() => {
        expect(getByText('Resend in 60s')).toBeTruthy();
      });

      // Advance timers 60 times (1 second each)
      for (let i = 0; i < 60; i++) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }

      await waitFor(() => {
        expect(queryByText(/Resend in \d+s/)).toBeNull();
        expect(getByText('Resend verification code')).toBeTruthy();
      });
    });

    it('cleans up timer on unmount', async () => {
      mockSendHook.sendEmailVerification.mockResolvedValue({
        contactVerificationId: 'new-verification-id',
      });

      const { getByTestId, unmount } = renderComponent();

      fireEvent.press(getByTestId('resend-verification-text'));

      await waitFor(() => {
        expect(mockSendHook.sendEmailVerification).toHaveBeenCalled();
      });

      unmount();

      expect(() => jest.runOnlyPendingTimers()).not.toThrow();
    });
  });

  describe('Loading States', () => {
    it('disables button during verification loading', () => {
      mockVerifyHook.isLoading = true;

      const { getByTestId } = renderComponent();

      const button = getByTestId('confirm-email-continue-button');

      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty Redux state gracefully', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation(() => ({}));

      const { getByTestId } = renderComponent();

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('handles missing params gracefully', () => {
      (useParams as jest.Mock).mockReturnValue({});

      const { getByTestId } = renderComponent();

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('displays description with email from params', () => {
      (useParams as jest.Mock).mockReturnValue({
        email: 'custom@email.com',
        password: 'password',
      });

      const { getByTestId } = renderComponent();

      const description = getByTestId('onboarding-step-description');

      expect(description.props.children).toBe(
        'Enter code sent to custom@email.com',
      );
    });
  });
});
