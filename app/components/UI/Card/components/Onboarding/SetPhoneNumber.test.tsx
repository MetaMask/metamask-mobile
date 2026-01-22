import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import usePhoneVerificationSend from '../../hooks/usePhoneVerificationSend';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { CardError, CardErrorType } from '../../types';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import SetPhoneNumber from './SetPhoneNumber';

// Mock whenEngineReady to prevent async polling after test teardown
jest.mock('../../../../../core/Analytics/whenEngineReady', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

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
jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(),
}));

import { useCardSDK } from '../../sdk';

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

// Default card state
const defaultCardState = {
  onboarding: {
    selectedCountry: {
      key: 'US',
      name: 'United States',
      emoji: '🇺🇸',
      areaCode: '1',
    },
    contactVerificationId: 'test-verification-id',
  },
  userCardLocation: null,
};

// Create test store with country object format
const createTestStore = (initialState = {}) =>
  configureStore({
    reducer: {
      card: (
        state = {
          ...defaultCardState,
          ...initialState,
          onboarding: {
            ...defaultCardState.onboarding,
            ...(initialState as typeof defaultCardState).onboarding,
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

// Helper to create store with US user location
const createUsUserStore = (overrides = {}) =>
  createTestStore({
    userCardLocation: 'us',
    ...overrides,
  });

// Helper to create store with international user location
const createInternationalUserStore = (overrides = {}) =>
  createTestStore({
    userCardLocation: 'international',
    onboarding: {
      selectedCountry: {
        key: 'GB',
        name: 'United Kingdom',
        emoji: '🇬🇧',
        areaCode: '44',
      },
      contactVerificationId: 'test-verification-id',
    },
    ...overrides,
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
          {
            iso3166alpha2: 'US',
            name: 'United States',
            callingCode: '1',
            canSignUp: true,
          },
          {
            iso3166alpha2: 'CA',
            name: 'Canada',
            callingCode: '1',
            canSignUp: true,
          },
          {
            iso3166alpha2: 'GB',
            name: 'United Kingdom',
            callingCode: '44',
            canSignUp: true,
          },
        ],
      },
    });

    (useDebouncedValue as jest.Mock).mockImplementation((value) => value);

    (useCardSDK as jest.Mock).mockReturnValue({
      sdk: null,
      isLoading: false,
      user: null,
      setUser: jest.fn(),
      logoutFromProvider: jest.fn(),
      fetchUserData: jest.fn(),
    });

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
    it('renders country area code selector', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      expect(countrySelect).toBeTruthy();
    });

    it('navigates to region selector modal on press', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      fireEvent.press(countrySelect);

      expect(mockNavigate).toHaveBeenCalled();
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
          selectedCountry: {
            key: 'US',
            name: 'United States',
            emoji: '🇺🇸',
            areaCode: '1',
          },
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

      // Should still render the area code selector
      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      expect(countrySelect).toBeTruthy();
    });

    it('handles missing selected country area code', () => {
      const storeWithNoAreaCode = createTestStore({
        onboarding: {
          selectedCountry: {
            key: 'XX',
            name: 'Unknown Country',
            emoji: '🏳️',
            // areaCode is undefined
          },
          contactVerificationId: 'test-verification-id',
        },
      });

      const { getByTestId } = render(
        <Provider store={storeWithNoAreaCode}>
          <SetPhoneNumber />
        </Provider>,
      );

      // Should still render the component without errors
      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      expect(countrySelect).toBeTruthy();
    });
  });

  describe('US Phone Number Validation', () => {
    it('displays error for US users with invalid US phone format (less than 10 digits)', async () => {
      const usStore = createUsUserStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '123456789');
      });

      await waitFor(() => {
        expect(queryByTestId('set-phone-number-us-phone-error')).toBeTruthy();
      });
    });

    it('displays error for US users with invalid area code starting with 0', async () => {
      const usStore = createUsUserStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '0123456789');
      });

      await waitFor(() => {
        expect(queryByTestId('set-phone-number-us-phone-error')).toBeTruthy();
      });
    });

    it('displays error for US users with invalid area code starting with 1', async () => {
      const usStore = createUsUserStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890');
      });

      await waitFor(() => {
        expect(queryByTestId('set-phone-number-us-phone-error')).toBeTruthy();
      });
    });

    it('displays error for US users with invalid exchange code starting with 0', async () => {
      const usStore = createUsUserStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '2120123456');
      });

      await waitFor(() => {
        expect(queryByTestId('set-phone-number-us-phone-error')).toBeTruthy();
      });
    });

    it('displays error for US users with invalid exchange code starting with 1', async () => {
      const usStore = createUsUserStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '2121123456');
      });

      await waitFor(() => {
        expect(queryByTestId('set-phone-number-us-phone-error')).toBeTruthy();
      });
    });

    it('does not display US phone error for valid US phone number', async () => {
      const usStore = createUsUserStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '2125551234');
      });

      await waitFor(() => {
        expect(queryByTestId('set-phone-number-us-phone-error')).toBeNull();
        expect(queryByTestId('set-phone-number-phone-number-error')).toBeNull();
      });
    });

    it('enables continue button for US users with valid US phone number', async () => {
      const usStore = createUsUserStore();

      const { getByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '2125551234');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(false);
      });
    });

    it('keeps continue button disabled for US users with invalid US phone number', async () => {
      const usStore = createUsUserStore();

      const { getByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(true);
      });
    });

    it('does not apply US phone validation for international users', async () => {
      const internationalStore = createInternationalUserStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={internationalStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      await act(async () => {
        fireEvent.changeText(phoneInput, '7911123456');
      });

      await waitFor(() => {
        expect(queryByTestId('set-phone-number-us-phone-error')).toBeNull();
        expect(queryByTestId('set-phone-number-phone-number-error')).toBeNull();
      });
    });

    it('enables continue button for international users with any valid phone format', async () => {
      const internationalStore = createInternationalUserStore();

      const { getByTestId } = render(
        <Provider store={internationalStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '7911123456');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(false);
      });
    });

    it('clears US phone error when phone number changes', async () => {
      const usStore = createUsUserStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={usStore}>
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

      await act(async () => {
        fireEvent.changeText(phoneInput, '2125551234');
      });

      await waitFor(() => {
        expect(queryByTestId('set-phone-number-us-phone-error')).toBeNull();
        expect(queryByTestId('set-phone-number-phone-number-error')).toBeNull();
      });
    });

    it('calls sendPhoneVerification for US user with valid US phone number', async () => {
      const usStore = createUsUserStore();

      const { getByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '2125551234');
      });

      await waitFor(() => {
        expect(continueButton.props.disabled).toBe(false);
      });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockSendPhoneVerification).toHaveBeenCalledWith({
        phoneCountryCode: '1',
        phoneNumber: '2125551234',
        contactVerificationId: 'test-verification-id',
      });
    });

    it('does not call sendPhoneVerification for US user with invalid US phone number', async () => {
      const usStore = createUsUserStore();

      const { getByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const phoneInput = getByTestId('set-phone-number-phone-number-input');
      const continueButton = getByTestId('set-phone-number-continue-button');

      await act(async () => {
        fireEvent.changeText(phoneInput, '1234567890');
      });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockSendPhoneVerification).not.toHaveBeenCalled();
    });
  });

  describe('Region Filtering for US Users', () => {
    it('navigates to region selector with only US region for US users', () => {
      const usStore = createUsUserStore();

      const { getByTestId } = render(
        <Provider store={usStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      fireEvent.press(countrySelect);

      // Verify navigate was called
      expect(mockNavigate).toHaveBeenCalled();

      // Verify non-US regions are excluded (regions are in params.regions)
      const navigateCall = mockNavigate.mock.calls[0];
      const regionsArg = navigateCall[1]?.params?.regions || [];
      expect(regionsArg.length).toBe(1);
      expect(regionsArg[0].key).toBe('US');
    });

    it('navigates to region selector with all regions for international users', () => {
      const internationalStore = createInternationalUserStore();

      const { getByTestId } = render(
        <Provider store={internationalStore}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      fireEvent.press(countrySelect);

      // Verify navigate was called with multiple regions (in params.regions)
      const navigateCall = mockNavigate.mock.calls[0];
      const regionsArg = navigateCall[1]?.params?.regions || [];
      expect(regionsArg.length).toBeGreaterThan(1);

      // Verify it includes countries other than US
      const regionKeys = regionsArg.map((r: { key: string }) => r.key);
      expect(regionKeys).toContain('US');
      expect(regionKeys).toContain('CA');
      expect(regionKeys).toContain('GB');
    });

    it('navigates to region selector with all regions when userCardLocation is null', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      fireEvent.press(countrySelect);

      // Verify navigate was called with all available regions (in params.regions)
      const navigateCall = mockNavigate.mock.calls[0];
      const regionsArg = navigateCall[1]?.params?.regions || [];
      expect(regionsArg.length).toBeGreaterThan(1);
    });
  });
});
