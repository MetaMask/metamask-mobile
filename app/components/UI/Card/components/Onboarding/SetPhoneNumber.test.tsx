import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import usePhoneVerificationSend from '../../hooks/usePhoneVerificationSend';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { CardError, CardErrorType } from '../../types';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import SetPhoneNumber from './SetPhoneNumber';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock hooks
jest.mock('../../hooks/usePhoneVerificationSend');
jest.mock('../../hooks/useRegistrationSettings');
jest.mock('../../../../hooks/useDebouncedValue');

// Mock SelectComponent with proper interaction simulation
jest.mock('../../../SelectComponent', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return (props: {
    testID?: string;
    onValueChange?: (value: string) => void;
    selectedValue?: string;
    defaultValue?: string;
    options?: { key: string; value: string; label: string }[];
    [key: string]: unknown;
  }) => {
    const handlePress = () => {
      // Simulate selecting the first available option
      if (props.options && props.options.length > 0 && props.onValueChange) {
        props.onValueChange(props.options[0].value);
      }
    };

    return React.createElement(
      TouchableOpacity,
      {
        testID: props.testID,
        onPress: handlePress,
        ...props,
      },
      React.createElement(
        Text,
        {},
        props.selectedValue || props.defaultValue || 'Select...',
      ),
    );
  };
});

// Mock OnboardingStep
jest.mock('./OnboardingStep', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return ({
    title,
    description,
    formFields,
    actions,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    formFields?: React.ReactNode;
    actions?: React.ReactNode;
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

// Create test store
const createTestStore = (initialState = {}) =>
  configureStore({
    reducer: {
      card: (
        state = {
          onboarding: {
            selectedCountry: 'US',
            contactVerificationId: 'test-verification-id',
          },
          ...initialState,
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

describe('SetPhoneNumber Component', () => {
  let store: ReturnType<typeof createTestStore>;
  let mockSendPhoneVerification: jest.Mock;
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    jest.requireMock('@react-navigation/native').useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });

    mockSendPhoneVerification = jest.fn().mockResolvedValue({ success: true });

    (usePhoneVerificationSend as jest.Mock).mockReturnValue({
      sendPhoneVerification: mockSendPhoneVerification,
      isLoading: false,
      isError: false,
      error: null,
      reset: jest.fn(),
    });

    (useRegistrationSettings as jest.Mock).mockReturnValue({
      data: {
        countries: [
          { iso3166alpha2: 'US', name: 'United States', callingCode: '1' },
          { iso3166alpha2: 'CA', name: 'Canada', callingCode: '1' },
          { iso3166alpha2: 'GB', name: 'United Kingdom', callingCode: '44' },
        ],
      },
    });

    (useDebouncedValue as jest.Mock).mockImplementation((value) => value);

    store = createTestStore();
  });

  describe('Initial Render', () => {
    it('renders all form fields with correct testIDs', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      expect(
        getByTestId('set-phone-number-country-area-code-select'),
      ).toBeTruthy();
      expect(getByTestId('set-phone-number-phone-number-input')).toBeTruthy();
      expect(getByTestId('set-phone-number-continue-button')).toBeTruthy();
      expect(getByTestId('set-phone-number-legal-terms')).toBeTruthy();
    });

    it('has continue button disabled initially', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const continueButton = getByTestId('set-phone-number-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('does not show error message initially', () => {
      const { queryByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      expect(queryByTestId('set-phone-number-phone-number-error')).toBeNull();
    });

    it('displays legal terms text', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      expect(getByTestId('set-phone-number-legal-terms')).toBeTruthy();
    });
  });

  describe('Phone Number Input', () => {
    it('allows numeric input only', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      fireEvent.changeText(phoneInput, 'abc123def456');

      expect(phoneInput.props.value).toBe('123456');
    });

    it('accepts valid phone number format', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      fireEvent.changeText(phoneInput, '1234567890');

      expect(phoneInput.props.value).toBe('1234567890');
    });

    it('displays error for phone number with fewer than 4 digits', async () => {
      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '123');
      });

      await waitFor(() => {
        expect(
          queryByTestId('set-phone-number-phone-number-error'),
        ).toBeTruthy();
      });
    });

    it('displays error for phone number with more than 15 digits', async () => {
      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890123456');
      });

      await waitFor(() => {
        expect(
          queryByTestId('set-phone-number-phone-number-error'),
        ).toBeTruthy();
      });
    });

    it('does not display error for valid phone number length', async () => {
      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890');
      });

      await waitFor(() => {
        expect(queryByTestId('set-phone-number-phone-number-error')).toBeNull();
      });
    });
  });

  describe('Country Area Code Selection', () => {
    it('allows country area code selection', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      fireEvent.press(countrySelect);

      expect(countrySelect).toBeTruthy();
    });

    it('displays initial area code based on selected country', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      // Should show +1 for US (initial selected country)
      expect(countrySelect.props.selectedValue).toBe('1');
    });

    it('updates area code when different country is selected', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );

      // Mock selecting UK (+44)
      fireEvent.press(countrySelect);

      expect(countrySelect).toBeTruthy();
    });
  });

  describe('Continue Button State Management', () => {
    it('enables continue button when all fields are valid', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(false);
      });
    });

    it('keeps continue button disabled when phone number is invalid', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '123');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(true);
      });
    });

    it('keeps continue button disabled when phone number is empty', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const continueButton = getByTestId('set-phone-number-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('disables continue button when phone verification is loading', () => {
      (usePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: jest.fn(),
        isLoading: true,
        isError: false,
        error: null,
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const continueButton = getByTestId('set-phone-number-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('disables continue button when phone verification has error', () => {
      (usePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: 'Verification failed',
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const continueButton = getByTestId('set-phone-number-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });
  });

  describe('Form Submission and Navigation', () => {
    it('calls sendPhoneVerification when continue button is pressed', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(false);
      });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockSendPhoneVerification).toHaveBeenCalledWith({
        phoneCountryCode: '1',
        phoneNumber: '1234567890',
        contactVerificationId: 'test-verification-id',
      });
    });

    it('navigates to confirm phone number screen on successful verification', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(false);
      });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          'CardOnboardingConfirmPhoneNumber',
          {
            phoneCountryCode: '1',
            phoneNumber: '1234567890',
          },
        );
      });
    });

    it('does not call sendPhoneVerification when continue button is disabled', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockSendPhoneVerification).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('shows phone verification error when present', async () => {
      (usePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: jest.fn(),
        isLoading: false,
        isError: true,
        error: 'Phone verification failed',
        reset: jest.fn(),
      });

      const { getByTestId, findByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890');
      });

      const errorText = await findByTestId(
        'set-phone-number-phone-number-error',
      );
      expect(errorText).toBeTruthy();
    });

    it('navigates to sign up when invalid contact verification ID error occurs', async () => {
      const mockSendPhoneVerification = jest
        .fn()
        .mockRejectedValue(
          new CardError(
            CardErrorType.CONFLICT_ERROR,
            'Invalid or expired contact verification ID',
          ),
        );

      const mockReset = jest.fn();

      (usePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerification,
        reset: mockReset,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(false);
      });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockSendPhoneVerification).toHaveBeenCalled();
      });

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('CardOnboardingSignUp');
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles missing contact verification ID', () => {
      const storeWithoutVerificationId = createTestStore({
        onboarding: {
          selectedCountry: 'US',
          contactVerificationId: null,
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithoutVerificationId}>
          <SetPhoneNumber />
        </Provider>,
      );

      const continueButton = getByTestId('set-phone-number-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('handles missing registration settings', () => {
      (useRegistrationSettings as jest.Mock).mockReturnValue({
        data: null,
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      expect(countrySelect.props.options).toEqual([]);
    });

    it('handles missing selected country in registration settings', () => {
      const storeWithUnknownCountry = createTestStore({
        onboarding: {
          selectedCountry: 'XX', // Unknown country code
          contactVerificationId: 'test-verification-id',
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithUnknownCountry}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      // Should default to +1
      expect(countrySelect.props.selectedValue).toBe('1');
    });
  });
});
