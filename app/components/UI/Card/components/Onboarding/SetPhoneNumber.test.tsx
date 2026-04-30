import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import usePhoneVerificationSend from '../../hooks/usePhoneVerificationSend';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { CardError, CardErrorType } from '../../types';
import useRegions from '../../hooks/useRegions';
import SetPhoneNumber from './SetPhoneNumber';

// Mock whenEngineReady to prevent async polling after test teardown
jest.mock('../../../../../util/analytics/whenEngineReady', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock hooks
jest.mock('../../hooks/usePhoneVerificationSend');
jest.mock('../../hooks/useRegions');
jest.mock('../../../../hooks/useDebouncedValue');
jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(),
}));

// Capture setOnValueChange callbacks and navigation args so tests can simulate
// a user picking a country from the region selector modal.
let capturedOnValueChange: ((region: unknown) => void) | null = null;
const mockCreateRegionSelectorModalNavigationDetails = jest.fn(
  (params: unknown) => ['RegionSelectorModal', { params }] as const,
);
jest.mock('./RegionSelectorModal', () => ({
  setOnValueChange: jest.fn((cb) => {
    capturedOnValueChange = cb;
  }),
  clearOnValueChange: jest.fn(),
  createRegionSelectorModalNavigationDetails: (params: unknown) =>
    mockCreateRegionSelectorModalNavigationDetails(params),
}));

import { useCardSDK } from '../../sdk';

jest.mock('@metamask/design-system-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      testID,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(Text, { testID, ...props }, children),
    Button: ({
      children,
      testID,
      onPress,
      label,
      isDisabled,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(
        TouchableOpacity,
        { testID, onPress, disabled: isDisabled, ...props },
        React.createElement(Text, {}, children || label),
      ),
    ButtonVariant: {
      Primary: 'Primary',
      Secondary: 'Secondary',
      Link: 'Link',
    },
    ButtonSize: {
      Sm: 'Sm',
      Md: 'Md',
      Lg: 'Lg',
    },
    TextVariant: {
      BodySm: 'BodySm',
      BodyMd: 'BodyMd',
      HeadingMd: 'HeadingMd',
    },
    Icon: ({ ...props }: Record<string, unknown>) =>
      React.createElement(View, props),
    IconName: {
      ArrowDown: 'arrow-down',
    },
    IconSize: {
      Sm: 'sm',
      Md: 'md',
    },
    Label: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(Text, props, children),
  };
});

// Mock OnboardingStep
jest.mock('./OnboardingStep', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
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
    contactVerificationId: 'test-verification-id',
  },
};

// Create test store — pass { cardLocation: 'us' | 'international' } to control the
// controller-based location that SetPhoneNumber reads via selectCardUserLocation.
const createTestStore = (
  initialState: {
    cardLocation?: string;
    onboarding?: Record<string, unknown>;
    [key: string]: unknown;
  } = {},
) => {
  const { cardLocation = 'international', ...cardState } = initialState;
  return configureStore({
    reducer: {
      engine: (
        state = {
          backgroundState: {
            CardController: {
              activeProviderId: 'baanx',
              providerData: {
                baanx: { location: cardLocation },
              },
            },
          },
        },
      ) => state,
      card: (
        state = {
          ...defaultCardState,
          ...cardState,
          onboarding: {
            ...defaultCardState.onboarding,
            ...(cardState.onboarding ?? {}),
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
};

// Helper to create store with US user location
const createUsUserStore = (overrides = {}) =>
  createTestStore({
    cardLocation: 'us',
    ...overrides,
  });

// Helper to create store with international user location
const createInternationalUserStore = (overrides = {}) =>
  createTestStore({
    cardLocation: 'international',
    onboarding: {
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

    const defaultSignUpRegions = [
      {
        key: 'US',
        name: 'United States',
        emoji: '🇺🇸',
        areaCode: '1',
        canSignUp: true,
      },
      {
        key: 'CA',
        name: 'Canada',
        emoji: '🇨🇦',
        areaCode: '1',
        canSignUp: true,
      },
      {
        key: 'GB',
        name: 'United Kingdom',
        emoji: '🇬🇧',
        areaCode: '44',
        canSignUp: true,
      },
    ];
    const defaultUserCountry = defaultSignUpRegions[0];

    (useRegions as jest.Mock).mockReturnValue({
      signUpRegions: defaultSignUpRegions,
      userCountry: defaultUserCountry,
      getRegionByCode: (code: string) =>
        defaultSignUpRegions.find((r) => r.key === code) ?? null,
      isLoading: false,
    });

    jest
      .requireMock('../../../../../util/navigation/navUtils')
      .useParams.mockReturnValue({
        countryKey: undefined,
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

      expect(
        queryByTestId('set-phone-number-phone-number-error'),
      ).not.toBeOnTheScreen();
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
        expect(
          queryByTestId('set-phone-number-phone-number-error'),
        ).not.toBeOnTheScreen();
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

    it('highlights the most recently selected country when reopening the modal, not the original profile country', () => {
      // userCountry from the profile is US (+1)
      // The user opens the modal and picks GB (+44) instead
      // Reopening the modal must highlight GB, not US
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );

      // First open: selectedRegionKey should be userCountry.key ('US')
      fireEvent.press(countrySelect);
      const firstCallParams =
        mockCreateRegionSelectorModalNavigationDetails.mock.calls[0][0];
      expect(firstCallParams).toMatchObject({ selectedRegionKey: 'US' });

      // Simulate user picking GB from the modal
      act(() => {
        capturedOnValueChange?.({
          key: 'GB',
          name: 'United Kingdom',
          emoji: '🇬🇧',
          areaCode: '44',
          canSignUp: true,
        });
      });

      // Second open: selectedRegionKey must now be 'GB', not 'US'
      fireEvent.press(countrySelect);
      const secondCallParams =
        mockCreateRegionSelectorModalNavigationDetails.mock.calls[1][0];
      expect(secondCallParams).toMatchObject({ selectedRegionKey: 'GB' });
    });
  });

  describe('Country Pre-selection', () => {
    it('pre-selects country from countryKey nav param, ignoring userCountry', () => {
      // countryKey = 'GB' even though userCountry defaults to 'US'
      jest
        .requireMock('../../../../../util/navigation/navUtils')
        .useParams.mockReturnValue({ countryKey: 'GB' });

      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      // SelectField renders the value as text content inside a TouchableOpacity.
      // Area code for GB is +44.
      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      expect(countrySelect).toHaveTextContent(/\+44/);
    });

    it('falls back to userCountry when countryKey nav param is absent', () => {
      // Default beforeEach: countryKey = undefined, userCountry = US (+1)
      const { getByTestId } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      expect(countrySelect).toHaveTextContent(/\+1/);
    });

    it('does not overwrite pre-selected country when userCountry reference changes', () => {
      // countryKey resolves to GB; a subsequent re-fetch that creates a new userCountry
      // object reference must not reset the selection back to US.
      jest
        .requireMock('../../../../../util/navigation/navUtils')
        .useParams.mockReturnValue({ countryKey: 'GB' });

      const { getByTestId, rerender } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      // Simulate registrationSettings refetch: new userCountry object reference, same data
      const regions = [
        {
          key: 'US',
          name: 'United States',
          emoji: '🇺🇸',
          areaCode: '1',
          canSignUp: true,
        },
        {
          key: 'CA',
          name: 'Canada',
          emoji: '🇨🇦',
          areaCode: '1',
          canSignUp: true,
        },
        {
          key: 'GB',
          name: 'United Kingdom',
          emoji: '🇬🇧',
          areaCode: '44',
          canSignUp: true,
        },
      ];
      (useRegions as jest.Mock).mockReturnValue({
        signUpRegions: regions,
        userCountry: { ...regions[0] }, // new US object reference
        getRegionByCode: (code: string) =>
          regions.find((r) => r.key === code) ?? null,
        isLoading: false,
      });

      rerender(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      // GB must still be selected — the sync effect must not have fired
      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );
      expect(countrySelect).toHaveTextContent(/\+44/);
    });

    it('does not overwrite manual selection when userCountry reference changes', () => {
      // Start with no countryKey; userCountry = US. User manually picks GB via the
      // region selector. A subsequent re-fetch produces a new userCountry reference
      // (US) — it must not reset the selection back to US.
      const { getByTestId, rerender } = render(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      const countrySelect = getByTestId(
        'set-phone-number-country-area-code-select',
      );

      // Open the modal to register the onValueChange callback, then pick GB
      fireEvent.press(countrySelect);
      act(() => {
        capturedOnValueChange?.({
          key: 'GB',
          name: 'United Kingdom',
          emoji: '🇬🇧',
          areaCode: '44',
          canSignUp: true,
        });
      });

      // Simulate re-fetch: new userCountry reference (US), same data
      const regions = [
        {
          key: 'US',
          name: 'United States',
          emoji: '🇺🇸',
          areaCode: '1',
          canSignUp: true,
        },
        {
          key: 'CA',
          name: 'Canada',
          emoji: '🇨🇦',
          areaCode: '1',
          canSignUp: true,
        },
        {
          key: 'GB',
          name: 'United Kingdom',
          emoji: '🇬🇧',
          areaCode: '44',
          canSignUp: true,
        },
      ];
      (useRegions as jest.Mock).mockReturnValue({
        signUpRegions: regions,
        userCountry: { ...regions[0] },
        getRegionByCode: (code: string) =>
          regions.find((r) => r.key === code) ?? null,
        isLoading: false,
      });

      rerender(
        <Provider store={store}>
          <SetPhoneNumber />
        </Provider>,
      );

      // GB must still be selected
      expect(countrySelect).toHaveTextContent(/\+44/);
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
      const mockSendPhoneVerificationConflict = jest
        .fn()
        .mockRejectedValue(
          new CardError(
            CardErrorType.CONFLICT_ERROR,
            'Invalid or expired contact verification ID',
          ),
        );

      const mockReset = jest.fn();

      (usePhoneVerificationSend as jest.Mock).mockReturnValue({
        sendPhoneVerification: mockSendPhoneVerificationConflict,
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
        expect(mockSendPhoneVerificationConflict).toHaveBeenCalled();
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
      (useRegions as jest.Mock).mockReturnValue({
        signUpRegions: [],
        userCountry: null,
        getRegionByCode: () => null,
        isLoading: false,
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
      const unknownCountry = {
        key: 'XX',
        name: 'Unknown Country',
        emoji: '🏳️',
        areaCode: undefined,
        canSignUp: true,
      };
      (useRegions as jest.Mock).mockReturnValue({
        signUpRegions: [unknownCountry],
        userCountry: unknownCountry,
        getRegionByCode: (code: string) =>
          code === 'XX' ? unknownCountry : null,
        isLoading: false,
      });

      const { getByTestId } = render(
        <Provider store={store}>
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
        expect(
          queryByTestId('set-phone-number-us-phone-error'),
        ).not.toBeOnTheScreen();
        expect(
          queryByTestId('set-phone-number-phone-number-error'),
        ).not.toBeOnTheScreen();
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
        expect(
          queryByTestId('set-phone-number-us-phone-error'),
        ).not.toBeOnTheScreen();
        expect(
          queryByTestId('set-phone-number-phone-number-error'),
        ).not.toBeOnTheScreen();
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
        expect(
          queryByTestId('set-phone-number-us-phone-error'),
        ).not.toBeOnTheScreen();
        expect(
          queryByTestId('set-phone-number-phone-number-error'),
        ).not.toBeOnTheScreen();
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

    it('navigates to region selector with all regions when location defaults to international', () => {
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
