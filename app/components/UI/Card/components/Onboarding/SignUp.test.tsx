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
const mockSignUpRegions = [
  { key: 'US', name: 'United States', emoji: '🇺🇸', canSignUp: true },
  { key: 'CA', name: 'Canada', emoji: '🇨🇦', canSignUp: true },
  { key: 'GB', name: 'United Kingdom', emoji: '🇬🇧', canSignUp: false },
  { key: 'DE', name: 'Germany', emoji: '🇩🇪', canSignUp: true },
];
const mockGetRegionByCode = (code: string) =>
  mockSignUpRegions.find((r) => r.key === code) ?? null;
jest.mock('../../hooks/useRegions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    signUpRegions: mockSignUpRegions,
    getRegionByCode: mockGetRegionByCode,
    isLoading: false,
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
// SignUp reads geoLocation from state.engine.backgroundState.GeolocationController.location
// via selectGeolocationLocation. Pass { geoLocation: 'US' } etc. to control it.
const createTestStore = (initialState: Record<string, unknown> = {}) => {
  const { geoLocation, ...cardState } = initialState;
  const engineState = {
    backgroundState: {
      GeolocationController:
        typeof geoLocation === 'string' ? { location: geoLocation } : undefined,
    },
  };

  return configureStore({
    reducer: {
      engine: (state = engineState, action = { type: '', payload: null }) => {
        switch (action.type) {
          default:
            return state;
        }
      },
      card: (
        state = {
          onboarding: {
            selectedCountry: null,
            onboardingId: null,
            contactVerificationId: null,
            user: null,
          },
          userCardLocation: 'international',
          ...cardState,
        },
        action = { type: '', payload: null },
      ) => {
        switch (action.type) {
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
};

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
      expect(getByTestId('signup-country-select')).toBeTruthy();
      expect(getByTestId('signup-continue-button')).toBeTruthy();
      expect(getByTestId('signup-password-visibility-toggle')).toBeTruthy();
    });

    it('has continue button disabled initially', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const continueButton = getByTestId('signup-continue-button');
      expect(continueButton).toBeDisabled();
    });

    it('does not show error messages initially', () => {
      const { queryByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      expect(queryByTestId('signup-email-error-text')).toBeNull();
      expect(queryByTestId('signup-password-error-text')).toBeNull();
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

    it('has password hidden by default (secureTextEntry)', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const passwordInput = getByTestId('signup-password-input');
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('toggles password visibility when eye icon is pressed', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const passwordInput = getByTestId('signup-password-input');
      const visibilityToggle = getByTestId('signup-password-visibility-toggle');

      // Initially hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);

      // Press to show password
      fireEvent.press(visibilityToggle);
      expect(passwordInput.props.secureTextEntry).toBe(false);

      // Press again to hide password
      fireEvent.press(visibilityToggle);
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('shows description by default when no error', () => {
      const { getByText, queryByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      // Description should be visible
      expect(
        getByText('card.card_onboarding.sign_up.password_description'),
      ).toBeTruthy();

      // Error should not be visible
      expect(queryByTestId('signup-password-error-text')).toBeNull();
    });

    it('shows error message and hides description when password is invalid', async () => {
      (validatePassword as jest.Mock).mockReturnValue(false);
      const { getByTestId, findByTestId, queryByText } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const passwordInput = getByTestId('signup-password-input');
      await act(async () => {
        fireEvent.changeText(passwordInput, 'weak');
      });

      // Error should be visible
      const errorText = await findByTestId('signup-password-error-text');
      expect(errorText).toBeTruthy();

      // Description should be hidden when error is shown
      expect(
        queryByText('card.card_onboarding.sign_up.password_description'),
      ).toBeNull();
    });

    it('shows description again when password becomes valid', async () => {
      (validatePassword as jest.Mock).mockReturnValue(false);
      const { getByTestId, findByTestId, queryByTestId, getByText } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const passwordInput = getByTestId('signup-password-input');

      // First, enter invalid password
      await act(async () => {
        fireEvent.changeText(passwordInput, 'weak');
      });

      // Error should be visible
      await findByTestId('signup-password-error-text');

      // Now enter valid password
      (validatePassword as jest.Mock).mockReturnValue(true);
      await act(async () => {
        fireEvent.changeText(passwordInput, 'ValidPassword123!');
      });

      // Error should be hidden
      await waitFor(() => {
        expect(queryByTestId('signup-password-error-text')).toBeNull();
      });

      // Description should be visible again
      expect(
        getByText('card.card_onboarding.sign_up.password_description'),
      ).toBeTruthy();
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

    it('prefills country when geoLocation matches a supported country', () => {
      const storeWithGeo = createTestStore({ geoLocation: 'CA' });

      const { getByText } = render(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      expect(getByText('Canada')).toBeOnTheScreen();
      expect(storeWithGeo.getState().card.userCardLocation).toBe(
        'international',
      );
    });

    it('prefills country and sets US location when geoLocation is US', () => {
      const storeWithGeo = createTestStore({ geoLocation: 'US' });

      render(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      expect(storeWithGeo.getState().card.userCardLocation).toBe('us');
    });

    it('does not set userCardLocation when geoLocation is UNKNOWN', () => {
      const storeWithUnknown = createTestStore({ geoLocation: 'UNKNOWN' });

      render(
        <Provider store={storeWithUnknown}>
          <SignUp />
        </Provider>,
      );

      expect(storeWithUnknown.getState().card.userCardLocation).toBe(
        'international',
      );
    });

    it('does not set userCardLocation when geoLocation does not match any available region', () => {
      const storeWithUnsupported = createTestStore({ geoLocation: 'JP' });

      render(
        <Provider store={storeWithUnsupported}>
          <SignUp />
        </Provider>,
      );

      expect(storeWithUnsupported.getState().card.userCardLocation).toBe(
        'international',
      );
    });

    it('does not pre-select country when geoLocation matches a canSignUp: false country', () => {
      // GB exists in allRegions but has canSignUp: false — must not be pre-selected
      const storeWithGB = createTestStore({ geoLocation: 'GB' });

      const { queryByText, getByTestId } = render(
        <Provider store={storeWithGB}>
          <SignUp />
        </Provider>,
      );

      expect(queryByText('United Kingdom')).toBeNull();
      // Continue button must remain disabled — no eligible country was selected
      expect(getByTestId('signup-continue-button')).toBeDisabled();
      expect(storeWithGB.getState().card.userCardLocation).toBe(
        'international',
      );
    });

    it('does not re-run auto-selection when getRegionByCode reference changes after initial selection', () => {
      // Simulates a background re-fetch of registrationSettings that produces a
      // new getRegionByCode reference without changing the actual data.
      const storeWithGeo = createTestStore({ geoLocation: 'US' });
      const mockUseRegions = jest.requireMock('../../hooks/useRegions').default;

      const firstGetRegionByCode = jest.fn(mockGetRegionByCode);
      mockUseRegions.mockReturnValue({
        signUpRegions: mockSignUpRegions,
        getRegionByCode: firstGetRegionByCode,
        isLoading: false,
      });

      const { getByText, rerender } = render(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      // US was auto-selected on first render
      expect(getByText('United States')).toBeOnTheScreen();
      expect(firstGetRegionByCode).toHaveBeenCalledTimes(1);

      // Simulate background refetch: new function identity, same data
      const secondGetRegionByCode = jest.fn(mockGetRegionByCode);
      mockUseRegions.mockReturnValue({
        signUpRegions: mockSignUpRegions,
        getRegionByCode: secondGetRegionByCode,
        isLoading: false,
      });

      rerender(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      // hasAutoSelectedCountry ref must have blocked the second run
      expect(secondGetRegionByCode).not.toHaveBeenCalled();
      expect(getByText('United States')).toBeOnTheScreen();
    });
  });

  describe('Form Validation', () => {
    it('enables continue button when all fields are valid', async () => {
      // useRegions is mocked to return signUpRegions; geoLocation US prefills country via effect
      const storeWithGeo = createTestStore({ geoLocation: 'US' });

      const { getByTestId } = render(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const continueButton = getByTestId('signup-continue-button');

      // Fill in all form fields
      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'Password123!');
      });

      // Now check if the continue button is enabled
      await waitFor(
        () => {
          expect(continueButton).toBeEnabled();
        },
        { timeout: 3000 },
      );
    });

    it('keeps continue button disabled when email is invalid', async () => {
      (validateEmail as jest.Mock).mockReturnValue(false);
      const storeWithGeo = createTestStore({ geoLocation: 'US' });

      const { getByTestId } = render(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'invalid-email');
        fireEvent.changeText(passwordInput, 'Password123!');
      });

      await waitFor(() => {
        expect(continueButton).toBeDisabled();
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
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'weak');
      });

      await waitFor(() => {
        expect(continueButton).toBeDisabled();
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
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'Password123!');
        // Don't select country
      });

      await waitFor(() => {
        expect(continueButton).toBeDisabled();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls sendEmailVerification when continue button is pressed', async () => {
      const storeWithGeo = createTestStore({ geoLocation: 'US' });

      const { getByTestId } = render(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'Password123!');
      });

      await waitFor(() => {
        expect(continueButton).toBeEnabled();
      });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockSendEmailVerification).toHaveBeenCalled();
    });

    it('passes countryKey to ConfirmEmail navigation params', async () => {
      const storeWithGeo = createTestStore({ geoLocation: 'US' });

      const { getByTestId } = render(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      const emailInput = getByTestId('signup-email-input');
      const passwordInput = getByTestId('signup-password-input');
      const continueButton = getByTestId('signup-continue-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'Password123!');
      });

      await waitFor(() => {
        expect(continueButton).toBeEnabled();
      });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'test@example.com',
          password: 'Password123!',
          countryKey: 'US',
        }),
      );
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
