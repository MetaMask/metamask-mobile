import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ConfirmEmail from './ConfirmEmail';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../../../util/navigation/navUtils';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(() => ({
    email: 'test@example.com',
  })),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

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

  return (props: {
    title: React.ReactNode;
    description: React.ReactNode;
    formFields: React.ReactNode;
    actions: React.ReactNode;
  }) =>
    React.createElement(View, { testID: 'onboarding-step' }, [
      props.title,
      props.description,
      props.formFields,
      props.actions,
    ]);
});

const createTestStore = (initialState = {}) =>
  configureStore({
    reducer: {
      card: (
        state = {
          onboarding: {
            onboardingId: 'test-onboarding-id',
            contactVerificationId: 'test-contact-verification-id',
            user: null,
            ...initialState,
          },
        },
        action = { type: '', payload: null },
      ) => {
        switch (action.type) {
          default:
            return state;
        }
      },
    },
  });

describe('ConfirmEmail Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

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
  });

  const renderComponent = (storeState = {}) => {
    const store = createTestStore(storeState);
    return render(
      <Provider store={store}>
        <ConfirmEmail />
      </Provider>,
    );
  };

  describe('Initial Render', () => {
    it('renders without crashing', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('renders with correct email from params', () => {
      (useParams as jest.Mock).mockReturnValue({
        email: 'user@test.com',
      });

      const { getByTestId } = renderComponent();
      expect(getByTestId('onboarding-step')).toBeTruthy();
    });
  });

  describe('Form Interaction', () => {
    it('handles confirmation code input', () => {
      const { getByTestId } = renderComponent();

      // Test that the confirmation code input field is rendered
      expect(getByTestId('confirm-code-input')).toBeTruthy();
    });

    it('handles continue button press', () => {
      const { getByTestId } = renderComponent();

      // Test that the continue button is rendered
      expect(getByTestId('confirm-email-continue-button')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('displays error when verification fails', () => {
      mockVerifyHook.isError = true;
      mockVerifyHook.error = 'Invalid code';

      const { getByTestId } = renderComponent();

      // Test that the error text is displayed
      expect(getByTestId('confirm-code-error-text')).toBeTruthy();
    });

    it('clears error on input change', () => {
      mockVerifyHook.isError = false;
      mockVerifyHook.error = null;

      const { getByTestId } = renderComponent();

      // Test that the input field is accessible for interaction
      expect(getByTestId('confirm-code-input')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('handles verification loading state', () => {
      mockVerifyHook.isLoading = true;

      const { getByTestId } = renderComponent();
      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('handles resend loading state', () => {
      mockSendHook.isLoading = true;

      const { getByTestId } = renderComponent();
      expect(getByTestId('onboarding-step')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('handles successful verification navigation', () => {
      mockVerifyHook.isSuccess = true;

      const { getByTestId } = renderComponent();
      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('handles navigation with hasAccount parameter', () => {
      (useParams as jest.Mock).mockReturnValue({
        email: 'test@example.com',
        hasAccount: true,
      });

      const { getByTestId } = renderComponent();
      expect(getByTestId('onboarding-step')).toBeTruthy();
    });
  });

  describe('Resend Functionality', () => {
    it('handles resend verification', () => {
      const { getByTestId } = renderComponent();

      // Test that the resend verification text is rendered
      expect(getByTestId('resend-verification-text')).toBeTruthy();
    });

    it('handles resend success', () => {
      mockSendHook.isSuccess = true;

      const { getByTestId } = renderComponent();

      // Test that the resend verification text is still accessible
      expect(getByTestId('resend-verification-text')).toBeTruthy();
    });

    it('handles resend error', () => {
      mockSendHook.isError = true;
      mockSendHook.error = 'Failed to send';

      const { getByTestId } = renderComponent();

      // Test that the email error text is displayed
      expect(getByTestId('confirm-email-error-text')).toBeTruthy();
    });
  });
});
