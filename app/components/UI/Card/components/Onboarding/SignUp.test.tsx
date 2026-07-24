import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useNavigation } from '@react-navigation/native';
import useEmailVerificationSend from '../../hooks/useEmailVerificationSend';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { validateEmail } from '../../../Ramp/utils/depositUtils';
import { validatePassword } from '../../util/validatePassword';
import SignUp from './SignUp';
import Routes from '../../../../../constants/navigation/Routes';
import { MONEY_HOME_CARD_ORIGIN } from '../../hooks/useCardPostAuthRedirect';

const mockUseCardPostAuthRedirect = jest.fn();

jest.mock('../../hooks/useCardPostAuthRedirect', () => ({
  useCardPostAuthRedirect: () => mockUseCardPostAuthRedirect(),
  MONEY_HOME_CARD_ORIGIN: {
    screen: 'Money',
    params: { screen: 'MoneyHome' },
  },
}));

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
    canSignUp: false,
  },
  {
    key: 'DE',
    name: 'Germany',
    emoji: '🇩🇪',
    areaCode: '49',
    canSignUp: true,
  },
];
const mockGetRegionByCode = (code: string) =>
  mockSignUpRegions.find((r) => r.key === code) ?? null;
jest.mock('../../hooks/useRegions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    allRegions: mockSignUpRegions,
    signUpRegions: mockSignUpRegions.filter((r) => r.canSignUp),
    getRegionByCode: mockGetRegionByCode,
    isLoading: false,
  })),
}));
jest.mock('../../../../hooks/useDebouncedValue');

// Mock only the version-gated Immersve flag selector (avoids the real device-info
// version gate); keep the rest of the card selectors actual.
jest.mock('../../../../../selectors/featureFlagController/card', () => {
  const actual = jest.requireActual(
    '../../../../../selectors/featureFlagController/card',
  );
  return {
    ...actual,
    selectCardFeatureFlag: jest.fn(() => actual.defaultCardFeatureFlag),
    selectImmersveOnboardingEnabled: jest.fn(() => false),
  };
});

// Mock utility functions
jest.mock('../../../Ramp/utils/depositUtils');
jest.mock('../../util/validatePassword');

// Mock Engine
const mockSetUserLocation = jest.fn();
const mockSetSelectedCountry = jest.fn();
const mockSetSelectedCardProgramId = jest.fn();
const mockCreateFundingSource = jest.fn();
const mockGetFundingSources = jest.fn();
const mockGetSpendingPrerequisites = jest.fn();
const mockPatchContactDetails = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  context: {
    CardController: {
      setUserLocation: (...args: unknown[]) => mockSetUserLocation(...args),
      setSelectedCountry: (...args: unknown[]) =>
        mockSetSelectedCountry(...args),
      setSelectedCardProgramId: (...args: unknown[]) =>
        mockSetSelectedCardProgramId(...args),
      createFundingSource: (...args: unknown[]) =>
        mockCreateFundingSource(...args),
      getFundingSources: (...args: unknown[]) => mockGetFundingSources(...args),
      getSpendingPrerequisites: (...args: unknown[]) =>
        mockGetSpendingPrerequisites(...args),
      patchContactDetails: (...args: unknown[]) =>
        mockPatchContactDetails(...args),
    },
  },
}));

// Post-SIWE routing is unit-tested in useImmersveOnboardingRouter.test.ts;
// here we assert SignUp resolves the funding source + prerequisites and hands
// the derived action to the router.
const mockRouteImmersve = jest.fn();
jest.mock('../../hooks/useImmersveOnboardingRouter', () => ({
  useImmersveOnboardingRouter: () => mockRouteImmersve,
}));

// Immersve onboarding-entry mocks (SIWE + selected-account binding)
const mockImmersveSignIn = jest.fn();
jest.mock('../../hooks/useImmersveSiweAuth', () => ({
  useImmersveSiweAuth: () => ({
    signIn: mockImmersveSignIn,
    isAuthenticating: false,
    error: null,
  }),
}));
jest.mock('../../../../hooks/multichainAccounts/useAccountGroupName', () => ({
  useAccountGroupName: () => 'Account 1',
}));
const IMMERSVE_TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: () => () => ({
    address: IMMERSVE_TEST_ADDRESS,
  }),
}));

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
// Pass { selectedCardProgramId } to seed CardController override state.
const createTestStore = (initialState: Record<string, unknown> = {}) => {
  const { geoLocation, selectedCardProgramId, ...cardState } = initialState;
  const engineState = {
    backgroundState: {
      GeolocationController:
        typeof geoLocation === 'string' ? { location: geoLocation } : undefined,
      CardController: {
        selectedCountry: null,
        selectedCardProgramId:
          typeof selectedCardProgramId === 'string'
            ? selectedCardProgramId
            : null,
        activeProviderId: 'baanx',
        isAuthenticated: false,
        cardholderAccounts: [],
        providerData: {},
        cardHomeData: null,
        cardHomeDataStatus: 'idle',
        moneyAccountCardLinkInProgress: false,
        lastUnauthenticatedReason: null,
      },
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
          ...cardState,
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

describe('SignUp Component', () => {
  let store: ReturnType<typeof createTestStore>;
  let mockSendEmailVerification: jest.Mock;
  let mockNavigate: jest.Mock;
  let mockGoBack: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCardPostAuthRedirect.mockReturnValue(undefined);
    mockNavigate = jest.fn();
    mockGoBack = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
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
    const cardFlagSelectors = jest.requireMock(
      '../../../../../selectors/featureFlagController/card',
    );
    const actualCardFlagSelectors = jest.requireActual(
      '../../../../../selectors/featureFlagController/card',
    );
    (
      cardFlagSelectors.selectImmersveOnboardingEnabled as jest.Mock
    ).mockReturnValue(false);
    (cardFlagSelectors.selectCardFeatureFlag as jest.Mock).mockReturnValue(
      actualCardFlagSelectors.defaultCardFeatureFlag,
    );
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

      expect(queryByTestId('signup-email-error-text')).not.toBeOnTheScreen();
      expect(queryByTestId('signup-password-error-text')).not.toBeOnTheScreen();
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
        expect(queryByTestId('signup-email-error-text')).not.toBeOnTheScreen();
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
      expect(queryByTestId('signup-password-error-text')).not.toBeOnTheScreen();
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
      ).not.toBeOnTheScreen();
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
        expect(
          queryByTestId('signup-password-error-text'),
        ).not.toBeOnTheScreen();
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
      expect(mockSetUserLocation).toHaveBeenCalledWith('international');
    });

    it('prefills country and sets US location when geoLocation is US', () => {
      const storeWithGeo = createTestStore({ geoLocation: 'US' });

      render(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      expect(mockSetUserLocation).toHaveBeenCalledWith('us');
    });

    it('does not set userCardLocation when geoLocation is UNKNOWN', () => {
      const storeWithUnknown = createTestStore({ geoLocation: 'UNKNOWN' });

      render(
        <Provider store={storeWithUnknown}>
          <SignUp />
        </Provider>,
      );

      expect(mockSetUserLocation).not.toHaveBeenCalled();
    });

    it('does not set userCardLocation when geoLocation does not match any available region', () => {
      const storeWithUnsupported = createTestStore({ geoLocation: 'JP' });

      render(
        <Provider store={storeWithUnsupported}>
          <SignUp />
        </Provider>,
      );

      expect(mockSetUserLocation).not.toHaveBeenCalled();
    });

    it('pre-selects country when geoLocation matches a canSignUp: false country and enables waitlist mode', () => {
      // GB exists in allRegions with canSignUp: false — now gets auto-selected and shows waitlist CTA
      const storeWithGB = createTestStore({ geoLocation: 'GB' });

      const { getByText, getByTestId, queryByTestId } = render(
        <Provider store={storeWithGB}>
          <SignUp />
        </Provider>,
      );

      // GB is now pre-selected
      expect(getByText('United Kingdom')).toBeOnTheScreen();
      // Button is enabled (country is selected) and shows waitlist label
      expect(getByTestId('signup-continue-button')).toBeEnabled();
      // Country not available info text shown
      expect(
        getByTestId('signup-country-not-available-text'),
      ).toBeOnTheScreen();
      // Password field hidden in waitlist mode
      expect(queryByTestId('signup-password-input')).not.toBeOnTheScreen();
      // GB maps to 'international' location
      expect(mockSetUserLocation).toHaveBeenCalledWith('international');
    });

    it('routes the selected country to the provider via setSelectedCountry on prefill', () => {
      const storeWithGeo = createTestStore({ geoLocation: 'US' });

      render(
        <Provider store={storeWithGeo}>
          <SignUp />
        </Provider>,
      );

      expect(mockSetSelectedCountry).toHaveBeenCalledWith('US');
    });

    it('treats an Immersve country as supported (no waitlist) when onboarding is enabled', () => {
      // Default card feature flag lists GB in immersveCountries; enable the gate.
      const { selectImmersveOnboardingEnabled } = jest.requireMock(
        '../../../../../selectors/featureFlagController/card',
      );
      (selectImmersveOnboardingEnabled as jest.Mock).mockReturnValue(true);

      const storeWithImmersve = createTestStore({ geoLocation: 'GB' });

      const { getByText, getByTestId, queryByTestId } = render(
        <Provider store={storeWithImmersve}>
          <SignUp />
        </Provider>,
      );

      // GB is pre-selected but treated as supported (Immersve), not waitlist
      expect(getByText('United Kingdom')).toBeOnTheScreen();
      expect(
        queryByTestId('signup-country-not-available-text'),
      ).not.toBeOnTheScreen();
      // Immersve mode: password hidden, phone + account picker shown instead
      expect(queryByTestId('signup-password-input')).not.toBeOnTheScreen();
      expect(
        getByTestId('signup-immersve-phone-number-input'),
      ).toBeOnTheScreen();
      expect(getByTestId('signup-immersve-account-select')).toBeOnTheScreen();
      expect(mockSetSelectedCountry).toHaveBeenCalledWith('GB');
    });

    const enableImmersve = () => {
      const { selectImmersveOnboardingEnabled } = jest.requireMock(
        '../../../../../selectors/featureFlagController/card',
      );
      (selectImmersveOnboardingEnabled as jest.Mock).mockReturnValue(true);
    };

    const fillImmersveForm = (getByTestId: (id: string) => unknown) => {
      fireEvent.changeText(
        getByTestId('signup-email-input') as never,
        'gb@example.com',
      );
      fireEvent.changeText(
        getByTestId('signup-immersve-phone-number-input') as never,
        '7911123456',
      );
    };

    it('new user: SIWE, creates a funding source, patches contact, then routes', async () => {
      enableImmersve();
      mockImmersveSignIn.mockResolvedValue({ done: true });
      mockGetFundingSources.mockResolvedValue([]);
      mockCreateFundingSource.mockResolvedValue({ id: 'fs-1' });
      mockPatchContactDetails.mockResolvedValue(undefined);
      mockGetSpendingPrerequisites
        .mockResolvedValueOnce({
          prerequisites: [
            {
              stage: 'kyc',
              status: 'action-required',
              actionType: 'submit_contact_phone',
            },
          ],
        })
        .mockResolvedValueOnce({
          prerequisites: [
            {
              stage: 'kyc',
              status: 'action-required',
              actionType: 'follow_kyc_url',
              params: { kycUrl: 'https://kyc' },
            },
          ],
        });

      const { getByTestId } = render(
        <Provider store={createTestStore({ geoLocation: 'GB' })}>
          <SignUp />
        </Provider>,
      );

      fillImmersveForm(getByTestId);
      await act(async () => {
        fireEvent.press(getByTestId('signup-continue-button'));
      });

      expect(mockImmersveSignIn).toHaveBeenCalledWith({
        country: 'GB',
        address: IMMERSVE_TEST_ADDRESS,
      });
      expect(mockGetFundingSources).toHaveBeenCalled();
      expect(mockCreateFundingSource).toHaveBeenCalled();
      await waitFor(() =>
        expect(mockPatchContactDetails).toHaveBeenCalledWith({
          email: 'gb@example.com',
          phone: '+447911123456',
        }),
      );
      expect(mockRouteImmersve).toHaveBeenCalledWith(
        { type: 'kyc', url: 'https://kyc', ctaHint: undefined },
        { email: 'gb@example.com', countryKey: 'GB' },
      );
    });

    it('existing user: reuses the funding source (no create) and routes to their state', async () => {
      enableImmersve();
      mockImmersveSignIn.mockResolvedValue({ done: true });
      mockGetFundingSources.mockResolvedValue([{ id: 'fs-existing' }]);
      // Empty prerequisites → all satisfied → active.
      mockGetSpendingPrerequisites.mockResolvedValue({ prerequisites: [] });

      const { getByTestId } = render(
        <Provider store={createTestStore({ geoLocation: 'GB' })}>
          <SignUp />
        </Provider>,
      );

      fillImmersveForm(getByTestId);
      await act(async () => {
        fireEvent.press(getByTestId('signup-continue-button'));
      });

      expect(mockCreateFundingSource).not.toHaveBeenCalled();
      expect(mockPatchContactDetails).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(mockGetSpendingPrerequisites).toHaveBeenCalledWith(
          'fs-existing',
          expect.anything(),
        ),
      );
      expect(mockRouteImmersve).toHaveBeenCalledWith(
        { type: 'active' },
        { email: 'gb@example.com', countryKey: 'GB' },
      );
    });

    it('surfaces an inline error and does not route when resolution fails', async () => {
      enableImmersve();
      mockImmersveSignIn.mockResolvedValue({ done: true });
      mockGetFundingSources.mockRejectedValue(new Error('boom'));

      const { getByTestId, queryByTestId } = render(
        <Provider store={createTestStore({ geoLocation: 'GB' })}>
          <SignUp />
        </Provider>,
      );

      fillImmersveForm(getByTestId);
      await act(async () => {
        fireEvent.press(getByTestId('signup-continue-button'));
      });

      expect(mockRouteImmersve).not.toHaveBeenCalled();
      expect(queryByTestId('signup-immersve-error-text')).toBeOnTheScreen();
    });

    it('does not re-run auto-selection when getRegionByCode reference changes after initial selection', () => {
      // Simulates a background re-fetch of registrationSettings that produces a
      // new getRegionByCode reference without changing the actual data.
      const storeWithGeo = createTestStore({ geoLocation: 'US' });
      const mockUseRegions = jest.requireMock('../../hooks/useRegions').default;

      const firstGetRegionByCode = jest.fn(mockGetRegionByCode);
      mockUseRegions.mockReturnValue({
        allRegions: mockSignUpRegions,
        signUpRegions: mockSignUpRegions.filter((r) => r.canSignUp),
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
        allRegions: mockSignUpRegions,
        signUpRegions: mockSignUpRegions.filter((r) => r.canSignUp),
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
    it('navigates to authentication when "I already have an account" is pressed (direct card flow)', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      const alreadyHaveAccountButton = getByTestId(
        'signup-i-already-have-an-account-text',
      );
      fireEvent.press(alreadyHaveAccountButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.AUTHENTICATION);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('forwards postAuthRedirect to authentication when opened from Money', () => {
      mockUseCardPostAuthRedirect.mockReturnValue(MONEY_HOME_CARD_ORIGIN);

      const { getByTestId } = render(
        <Provider store={store}>
          <SignUp />
        </Provider>,
      );

      fireEvent.press(getByTestId('signup-i-already-have-an-account-text'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.AUTHENTICATION, {
        postAuthRedirect: MONEY_HOME_CARD_ORIGIN,
      });
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Card program selector (temporary testing)', () => {
    const PROGRAM_ALPHA = {
      name: 'Monavate (Alpha)',
      id: '836aae2080a211f1b5a601a9d64744df',
    };
    const PROGRAM_BRAVO = {
      name: 'Immersve (Bravo)',
      id: 'ba73e21080a211f1b059af0e8fb8b5f1',
    };

    const enableImmersve = () => {
      const { selectImmersveOnboardingEnabled } = jest.requireMock(
        '../../../../../selectors/featureFlagController/card',
      );
      (selectImmersveOnboardingEnabled as jest.Mock).mockReturnValue(true);
    };

    const setCardProgramFlag = (
      cardProgramIds?: { name: string; id: string }[],
      cardProgramId = PROGRAM_ALPHA.id,
    ) => {
      const { selectCardFeatureFlag } = jest.requireMock(
        '../../../../../selectors/featureFlagController/card',
      );
      const actual = jest.requireActual(
        '../../../../../selectors/featureFlagController/card',
      );
      (selectCardFeatureFlag as jest.Mock).mockReturnValue({
        ...actual.defaultCardFeatureFlag,
        immersve: {
          ...actual.defaultCardFeatureFlag.immersve,
          cardProgramId,
          ...(cardProgramIds ? { cardProgramIds } : {}),
        },
      });
    };

    const renderImmersveSignUp = (extras: Record<string, unknown> = {}) => {
      enableImmersve();
      return render(
        <Provider store={createTestStore({ geoLocation: 'GB', ...extras })}>
          <SignUp />
        </Provider>,
      );
    };

    it('does not render the selector for non-Immersve countries even with multiple programs', () => {
      setCardProgramFlag([PROGRAM_ALPHA, PROGRAM_BRAVO], PROGRAM_ALPHA.id);

      const { queryByTestId } = render(
        <Provider store={createTestStore({ geoLocation: 'US' })}>
          <SignUp />
        </Provider>,
      );

      expect(
        queryByTestId('signup-card-program-selector'),
      ).not.toBeOnTheScreen();
    });

    it('does not render the selector when cardProgramIds is absent', () => {
      setCardProgramFlag(undefined);

      const { queryByTestId } = renderImmersveSignUp();

      expect(
        queryByTestId('signup-card-program-selector'),
      ).not.toBeOnTheScreen();
    });

    it('does not render the selector when cardProgramIds has a single option', () => {
      setCardProgramFlag([PROGRAM_ALPHA]);

      const { queryByTestId } = renderImmersveSignUp();

      expect(
        queryByTestId('signup-card-program-selector'),
      ).not.toBeOnTheScreen();
    });

    it('renders the selector and pre-selects the default cardProgramId', () => {
      setCardProgramFlag([PROGRAM_ALPHA, PROGRAM_BRAVO], PROGRAM_ALPHA.id);

      const { getByTestId, getByText } = renderImmersveSignUp();

      expect(getByTestId('signup-card-program-selector')).toBeOnTheScreen();
      expect(getByText(PROGRAM_ALPHA.name)).toBeOnTheScreen();
      expect(getByText(PROGRAM_BRAVO.name)).toBeOnTheScreen();
      // Default option is checked (component-library RadioButton icon).
      expect(getByTestId('RadioButton-icon-component')).toBeOnTheScreen();
    });

    it('persists the selection via setSelectedCardProgramId', () => {
      setCardProgramFlag([PROGRAM_ALPHA, PROGRAM_BRAVO], PROGRAM_ALPHA.id);

      const { getByTestId } = renderImmersveSignUp();

      fireEvent.press(getByTestId(`signup-card-program-${PROGRAM_BRAVO.id}`));

      expect(mockSetSelectedCardProgramId).toHaveBeenCalledWith(
        PROGRAM_BRAVO.id,
      );
    });

    it('prefers a previously persisted selection over the flag default', () => {
      setCardProgramFlag([PROGRAM_ALPHA, PROGRAM_BRAVO], PROGRAM_ALPHA.id);

      const { getByTestId } = renderImmersveSignUp({
        selectedCardProgramId: PROGRAM_BRAVO.id,
      });

      // Persisted Bravo is pre-checked (only one checked icon rendered).
      expect(getByTestId('RadioButton-icon-component')).toBeOnTheScreen();
      // Changing selection writes the new id through to the controller.
      fireEvent.press(getByTestId(`signup-card-program-${PROGRAM_ALPHA.id}`));
      expect(mockSetSelectedCardProgramId).toHaveBeenCalledWith(
        PROGRAM_ALPHA.id,
      );
    });
  });
});
