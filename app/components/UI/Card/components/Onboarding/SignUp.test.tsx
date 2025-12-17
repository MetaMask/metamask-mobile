import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useNavigation } from '@react-navigation/native';
import useEmailVerificationSend from '../../hooks/useEmailVerificationSend';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { validateEmail } from '../../../Ramp/Deposit/utils';
import { validatePassword } from '../../util/validatePassword';
import SignUp from './SignUp';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock hooks
jest.mock('../../hooks/useEmailVerificationSend');
jest.mock('../../hooks/useRegistrationSettings', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: {
      countries: [
        { iso3166alpha2: 'US', name: 'United States', canSignUp: true },
        { iso3166alpha2: 'CA', name: 'Canada', canSignUp: true },
        { iso3166alpha2: 'GB', name: 'United Kingdom', canSignUp: false },
        { iso3166alpha2: 'DE', name: 'Germany', canSignUp: true },
      ],
    },
  })),
}));
jest.mock('../../../../hooks/useDebouncedValue');

// Mock utility functions
jest.mock('../../../Ramp/Deposit/utils');
jest.mock('../../util/validatePassword');

// Mock OnboardingStep
jest.mock('./OnboardingStep', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return (props: {
    title?: unknown;
    description?: unknown;
    formFields?: unknown;
    actions?: unknown;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'onboarding-step' },
      ReactActual.createElement(
        View,
        { testID: 'onboarding-step-title' },
        props.title,
      ),
      ReactActual.createElement(
        View,
        { testID: 'onboarding-step-description' },
        props.description,
      ),
      ReactActual.createElement(
        View,
        { testID: 'onboarding-step-form-fields' },
        props.formFields,
      ),
      ReactActual.createElement(
        View,
        { testID: 'onboarding-step-actions' },
        props.actions,
      ),
    );
});

// Create test store
const createTestStore = (initialState = {}) =>
  configureStore({
    reducer: {
      card: (
        state = {
          onboarding: {
            selectedCountry: null,
            onboardingId: null,
            contactVerificationId: null,
            user: null,
          },
          userCardLocation: 'international',
          ...initialState,
        },
        action = { type: '', payload: null },
      ) => {
        switch (action.type) {
          case 'card/setSelectedCountry':
            return {
              ...state,
              onboarding: {
                ...state.onboarding,
                selectedCountry: action.payload,
              },
            };
          case 'card/setUserCardLocation':
            return {
              ...state,
              userCardLocation: action.payload,
            };
          default:
            return state;
        }
      },
    },
  });

describe('SignUp Component', () => {
  let store: ReturnType<typeof createTestStore>;
  let mockSendEmailVerification: jest.Mock;
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockSendEmailVerification = jest
      .fn()
      .mockResolvedValue({ contactVerificationId: '123' });
    (useEmailVerificationSend as jest.Mock).mockReturnValue({
      sendEmailVerification: mockSendEmailVerification,
      isLoading: false,
      isError: false,
      error: null,
      reset: jest.fn(),
    });
    (useDebouncedValue as jest.Mock).mockImplementation((value) => value);
    (validateEmail as jest.Mock).mockReturnValue(true);
    (validatePassword as jest.Mock).mockReturnValue(true);
    store = createTestStore();
  });

  describe('Initial Render', () => {
    it('renders all form fields with correct testIDs', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      expect(getByTestId('signup-email-input')).toBeTruthy();
      expect(getByTestId('signup-password-input')).toBeTruthy();
      expect(getByTestId('signup-confirm-password-input')).toBeTruthy();
      expect(getByTestId('signup-country-select')).toBeTruthy();
      expect(getByTestId('signup-continue-button')).toBeTruthy();
    });

    it('has continue button disabled initially', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const continueButton = getByTestId('signup-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('does not show error messages initially', () => {
      const { queryByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      expect(queryByTestId('signup-email-error-text')).toBeNull();
      expect(queryByTestId('signup-confirm-password-error-text')).toBeNull();
    });
  });

  describe('Email Input', () => {
    it('allows text input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      fireEvent.changeText(emailInput, 'test@example.com');

      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('shows error message when email is invalid', async () => {
      (validateEmail as jest.Mock).mockReturnValue(false);
      const { getByTestId, findByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      await act(async () => {
        fireEvent.changeText(emailInput, 'invalid-email');
      });

      const errorText = await findByTestId('signup-email-error-text');
      expect(errorText).toBeTruthy();
    });

    it('does not show error message when email is valid', async () => {
      (validateEmail as jest.Mock).mockReturnValue(true);
      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      await act(async () => {
        fireEvent.changeText(emailInput, 'valid@example.com');
      });

      await waitFor(() => {
        expect(queryByTestId('signup-email-error-text')).toBeNull();
      });
    });
  });

  describe('Password Input', () => {
    it('allows text input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const passwordInput = getByTestId('signup-password-input');
      fireEvent.changeText(passwordInput, 'password123');

      expect(passwordInput.props.value).toBe('password123');
    });
  });

  describe('Confirm Password Input', () => {
    it('allows text input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const confirmPasswordInput = getByTestId('signup-confirm-password-input');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      expect(confirmPasswordInput.props.value).toBe('password123');
    });

    it('shows error message when passwords do not match', async () => {
      const { getByTestId, findByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const passwordInput = getByTestId('signup-password-input');
      const confirmPasswordInput = getByTestId('signup-confirm-password-input');

      await act(async () => {
        fireEvent.changeText(passwordInput, 'Password123!');
        fireEvent.changeText(confirmPasswordInput, 'Password321!');
      });

      const errorText = await findByTestId(
        'signup-confirm-password-error-text',
      );
      expect(errorText).toBeTruthy();
    });

    it('does not show error message when passwords match', async () => {
      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const passwordInput = getByTestId('signup-password-input');
      const confirmPasswordInput = getByTestId('signup-confirm-password-input');

      await act(async () => {
        fireEvent.changeText(passwordInput, 'Password123!');
        fireEvent.changeText(confirmPasswordInput, 'Password123!');
      });

      await waitFor(() => {
        expect(queryByTestId('signup-confirm-password-error-text')).toBeNull();
      });
    });
  });

  describe('Country Selection', () => {
    it('renders country select touchable', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const countrySelect = getByTestId('signup-country-select');
      expect(countrySelect).toBeTruthy();
    });

    it('navigates to region selector modal on press', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const countrySelect = getByTestId('signup-country-select');
      fireEvent.press(countrySelect);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('enables continue button when all fields are valid', async () => {
      // Create store with pre-selected country
      const storeWithCountry = createTestStore({
        onboarding: {
          selectedCountry: { key: 'US', name: 'United States' },
          onboardingId: null,
          contactVerificationId: null,
          user: null,
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithCountry}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const confirmPasswordInput = getByTestId('signup-confirm-password-input');
      const continueButton = getByTestId('signup-continue-button');

      // Fill in all form fields
      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'Password123!');
        fireEvent.changeText(confirmPasswordInput, 'Password123!');
      });

      // Now check if the continue button is enabled
      await waitFor(
        () => {
          expect(continueButton.props.disabled).toBe(false);
        },
        { timeout: 3000 },
      );
    });

    it('keeps continue button disabled when email is invalid', async () => {
      (validateEmail as jest.Mock).mockReturnValue(false);
      const storeWithCountry = createTestStore({
        onboarding: {
          selectedCountry: { key: 'US', name: 'United States' },
          onboardingId: null,
          contactVerificationId: null,
          user: null,
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithCountry}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const confirmPasswordInput = getByTestId('signup-confirm-password-input');
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'invalid-email');
        fireEvent.changeText(passwordInput, 'Password123!');
        fireEvent.changeText(confirmPasswordInput, 'Password123!');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(true);
      });
    });

    it('keeps continue button disabled when passwords do not match', async () => {
      const storeWithCountry = createTestStore({
        onboarding: {
          selectedCountry: { key: 'US', name: 'United States' },
          onboardingId: null,
          contactVerificationId: null,
          user: null,
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithCountry}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const confirmPasswordInput = getByTestId('signup-confirm-password-input');
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'Password123!');
        fireEvent.changeText(confirmPasswordInput, 'Password321!');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(true);
      });
    });

    it('keeps continue button disabled when password is invalid', async () => {
      (validatePassword as jest.Mock).mockReturnValue(false);
      const storeWithCountry = createTestStore({
        onboarding: {
          selectedCountry: { key: 'US', name: 'United States' },
          onboardingId: null,
          contactVerificationId: null,
          user: null,
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithCountry}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const confirmPasswordInput = getByTestId('signup-confirm-password-input');
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'weak');
        fireEvent.changeText(confirmPasswordInput, 'weak');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(true);
      });
    });

    it('keeps continue button disabled when no country is selected', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const confirmPasswordInput = getByTestId('signup-confirm-password-input');
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'Password123!');
        fireEvent.changeText(confirmPasswordInput, 'Password123!');
        // Don't select country
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(true);
      });
    });
  });

  describe('Form Submission', () => {
    it('calls sendEmailVerification when continue button is pressed', async () => {
      const storeWithCountry = createTestStore({
        onboarding: {
          selectedCountry: { key: 'US', name: 'United States' },
          onboardingId: null,
          contactVerificationId: null,
          user: null,
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithCountry}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const confirmPasswordInput = getByTestId('signup-confirm-password-input');
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'Password123!');
        fireEvent.changeText(confirmPasswordInput, 'Password123!');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(false);
      });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockSendEmailVerification).toHaveBeenCalled();
    });

    it('does not call sendEmailVerification when continue button is disabled', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockSendEmailVerification).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('shows email verification error when present', async () => {
      (useEmailVerificationSend as jest.Mock).mockReturnValue({
        sendEmailVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: 'Email verification failed',
        reset: jest.fn(),
      });

      const { getByTestId, findByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
      });

      const errorText = await findByTestId('signup-email-error-text');
      expect(errorText).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('navigates to authentication screen when "I already have an account" is pressed', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const alreadyHaveAccountButton = getByTestId(
        'signup-i-already-have-an-account-text',
      );
      fireEvent.press(alreadyHaveAccountButton);

      expect(mockNavigate).toHaveBeenCalledWith('CardAuthentication');
    });
  });
});
