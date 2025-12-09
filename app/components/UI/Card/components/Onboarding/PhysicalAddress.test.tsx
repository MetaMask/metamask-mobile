/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PhysicalAddress from './PhysicalAddress';
import Routes from '../../../../../constants/navigation/Routes';
import useRegisterPhysicalAddress from '../../hooks/useRegisterPhysicalAddress';
import useRegisterUserConsent from '../../hooks/useRegisterUserConsent';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import { useCardSDK } from '../../sdk';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks/useRegisterPhysicalAddress');
jest.mock('../../hooks/useRegisterUserConsent');
jest.mock('../../hooks/useRegistrationSettings');

// Mock SDK
jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(),
}));

// Mock useMetrics
jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  })),
  MetaMetricsEvents: {
    CARD_VIEWED: 'card_viewed',
    CARD_BUTTON_CLICKED: 'card_button_clicked',
  },
}));

// Mock utility functions
jest.mock('../../util/cardTokenVault', () => ({
  storeCardBaanxToken: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../util/mapCountryToLocation', () => ({
  mapCountryToLocation: jest.fn(() => 'us'),
}));

jest.mock('../../util/extractTokenExpiration', () => ({
  extractTokenExpiration: jest.fn(() => 3600000),
}));

// Mock OnboardingStep component
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
    title: string;
    description: string;
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

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  const Box = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(View, props, children);

  const Text = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(RNText, props, children);

  return {
    Box,
    Text,
    TextVariant: {
      BodySm: 'BodySm',
    },
  };
});

// Mock TextField
jest.mock('../../../../../component-library/components/Form/TextField', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
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
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(Text, props, children);
});

// Mock Button
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
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
    _variant,
    _size,
    _width,
  }: {
    label: string;
    onPress: () => void;
    isDisabled?: boolean;
    testID?: string;
    _variant?: string;
    _size?: string;
    _width?: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID,
        onPress: isDisabled ? undefined : onPress,
        disabled: isDisabled,
      },
      React.createElement(Text, { testID: 'button-text' }, label),
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

// Mock SelectComponent
jest.mock('../../../SelectComponent', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return ({
    testID,
    onValueChange,
    options,
    selectedValue,
    defaultValue,
    disabled,
  }: {
    testID?: string;
    onValueChange?: (value: string) => void;
    options?: { key: string; value: string; label: string }[];
    selectedValue?: string;
    defaultValue?: string;
    disabled?: boolean;
  }) => {
    const handlePress = () => {
      if (!disabled && options && options.length > 0 && onValueChange) {
        onValueChange(options[0].value);
      }
    };

    // Find the label for the selected value
    const selectedLabel =
      options?.find((opt) => opt.value === selectedValue)?.label ||
      selectedValue ||
      defaultValue ||
      'Select';

    return React.createElement(
      TouchableOpacity,
      {
        testID,
        onPress: handlePress,
        disabled,
      },
      React.createElement(Text, {}, selectedLabel),
    );
  };
});

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.physical_address.title': 'Physical Address',
      'card.card_onboarding.physical_address.description':
        'Enter your physical address information',
      'card.card_onboarding.physical_address.address_line_1_label':
        'Address Line 1',
      'card.card_onboarding.physical_address.address_line_1_placeholder':
        'Enter address line 1',
      'card.card_onboarding.physical_address.address_line_2_label':
        'Address Line 2',
      'card.card_onboarding.physical_address.address_line_2_placeholder':
        'Enter address line 2 (optional)',
      'card.card_onboarding.physical_address.city_label': 'City',
      'card.card_onboarding.physical_address.city_placeholder': 'Enter city',
      'card.card_onboarding.physical_address.state_label': 'State',
      'card.card_onboarding.physical_address.state_placeholder': 'Select state',
      'card.card_onboarding.physical_address.zip_code_label': 'ZIP Code',
      'card.card_onboarding.physical_address.zip_code_placeholder':
        'Enter ZIP code',
      'card.card_onboarding.physical_address.country_label': 'Country',
      'card.card_onboarding.physical_address.electronic_consent':
        'I consent to electronic communications',
      'card.card_onboarding.continue_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

// Mock Redux selector
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

// Create test store
const createTestStore = (initialState = {}) =>
  configureStore({
    reducer: {
      card: (
        state = {
          onboarding: {
            selectedCountry: 'US',
            onboardingId: 'test-id',
            contactVerificationId: 'contact-id',
            user: {
              id: 'user-id',
              email: 'test@example.com',
            },
          },
          userCardLocation: 'us',
          ...initialState,
        },
        action = { type: '', payload: null },
      ) => {
        switch (action.type) {
          case 'card/setOnboardingData':
            return {
              ...state,
              onboarding: {
                ...state.onboarding,
                ...action.payload,
              },
            };
          default:
            return state;
        }
      },
    },
  });

// Mock functions
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRegisterPhysicalAddress =
  useRegisterPhysicalAddress as jest.MockedFunction<
    typeof useRegisterPhysicalAddress
  >;
const mockUseRegisterUserConsent =
  useRegisterUserConsent as jest.MockedFunction<typeof useRegisterUserConsent>;
const mockUseRegistrationSettings =
  useRegistrationSettings as jest.MockedFunction<
    typeof useRegistrationSettings
  >;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('PhysicalAddress Component', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();

    // Mock navigation
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
    } as unknown as ReturnType<typeof useNavigation>);

    // Mock useRegisterPhysicalAddress
    mockUseRegisterPhysicalAddress.mockReturnValue({
      registerAddress: jest.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      clearError: jest.fn(),
      reset: jest.fn(),
    });

    // Mock useRegisterUserConsent
    mockUseRegisterUserConsent.mockReturnValue({
      createOnboardingConsent: jest.fn(),
      linkUserToConsent: jest.fn(),
      getOnboardingConsentSetByOnboardingId: jest.fn().mockResolvedValue(null),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      consentSetId: null,
      clearError: jest.fn(),
      reset: jest.fn(),
    });

    // Mock useRegistrationSettings
    mockUseRegistrationSettings.mockReturnValue({
      data: {
        countries: [
          {
            id: '1',
            name: 'United States',
            iso3166alpha2: 'US',
            callingCode: '+1',
            canSignUp: true,
          },
          {
            id: '2',
            name: 'Canada',
            iso3166alpha2: 'CA',
            callingCode: '+1',
            canSignUp: true,
          },
        ],
        usStates: [
          {
            id: '1',
            name: 'California',
            postalAbbreviation: 'CA',
            canSignUp: true,
          },
          {
            id: '2',
            name: 'New York',
            postalAbbreviation: 'NY',
            canSignUp: true,
          },
        ],
        links: {
          us: {
            termsAndConditions: '',
            accountOpeningDisclosure: '',
            noticeOfPrivacy: '',
            eSignConsentDisclosure: 'https://example.com/esign',
          },
          intl: { termsAndConditions: '', rightToInformation: '' },
        },
        config: {
          us: {
            emailSpecialCharactersDomainsException: '',
            consentSmsNumber: '',
            supportEmail: '',
          },
          intl: {
            emailSpecialCharactersDomainsException: '',
            consentSmsNumber: '',
            supportEmail: '',
          },
        },
      },
      isLoading: false,
      error: null,
      fetchData: jest.fn(),
    });

    // Mock useCardSDK
    mockUseCardSDK.mockReturnValue({
      sdk: null,
      isLoading: false,
      user: {
        id: 'user-id',
        email: 'test@example.com',
      },
      fetchUserData: jest.fn(),
      setUser: jest.fn(),
      logoutFromProvider: jest.fn(),
    });

    // Mock useSelector and useDispatch
    const { useSelector, useDispatch } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: any) =>
      selector({
        card: {
          onboarding: {
            selectedCountry: 'US',
            onboardingId: 'test-id',
            user: {
              id: 'user-id',
              email: 'test@example.com',
            },
          },
        },
      }),
    );
    useDispatch.mockReturnValue(jest.fn());
  });

  describe('Initial Render', () => {
    it('renders the component', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('displays correct title and description', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');

      expect(title.props.children).toBe('Physical Address');
      expect(description.props.children).toBe(
        'Enter your physical address information',
      );
    });

    it('renders all required form fields', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('address-line-1-input')).toBeTruthy();
      expect(getByTestId('address-line-2-input')).toBeTruthy();
      expect(getByTestId('city-input')).toBeTruthy();
      expect(getByTestId('zip-code-input')).toBeTruthy();
    });

    it('renders state field for US users', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('state-select')).toBeTruthy();
    });

    it('renders country field', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('country-select')).toBeTruthy();
    });

    it('renders continue button', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('physical-address-continue-button')).toBeTruthy();
    });
  });

  describe('Form Input Handling', () => {
    it('handles address line 1 input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const input = getByTestId('address-line-1-input');
      fireEvent.changeText(input, '123 Main St');

      expect(input.props.value).toBe('123 Main St');
    });

    it('handles address line 2 input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const input = getByTestId('address-line-2-input');
      fireEvent.changeText(input, 'Apt 4B');

      expect(input.props.value).toBe('Apt 4B');
    });

    it('handles city input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const input = getByTestId('city-input');
      fireEvent.changeText(input, 'San Francisco');

      expect(input.props.value).toBe('San Francisco');
    });

    it('handles ZIP code input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const input = getByTestId('zip-code-input');
      fireEvent.changeText(input, '12345');

      expect(input.props.value).toBe('12345');
    });

    it('handles state selection', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const select = getByTestId('state-select');
      fireEvent.press(select);

      expect(select).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('disables continue button when required fields are empty', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const button = getByTestId('physical-address-continue-button');
      expect(button.props.disabled).toBe(true);
    });

    it('enables continue button when all required fields are filled', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      // Fill required fields
      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');
      fireEvent.press(getByTestId('state-select'));

      // Wait for state updates
      await new Promise((resolve) => setTimeout(resolve, 50));

      const button = getByTestId('physical-address-continue-button');
      expect(button.props.disabled).toBe(false);
    });

    it('requires state for US users', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      // Fill all fields except state
      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');

      const button = getByTestId('physical-address-continue-button');
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('navigates to VALIDATING_KYC when registration is complete', async () => {
      const mockGetOnboardingConsentSetByOnboardingId = jest
        .fn()
        .mockResolvedValue(null);
      const mockCreateOnboardingConsent = jest
        .fn()
        .mockResolvedValue('consent-set-123');
      const mockLinkUserToConsent = jest.fn().mockResolvedValue(undefined);
      const mockRegisterAddress = jest.fn().mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-id' },
      });

      mockUseRegisterPhysicalAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockUseRegisterUserConsent.mockReturnValue({
        createOnboardingConsent: mockCreateOnboardingConsent,
        linkUserToConsent: mockLinkUserToConsent,
        getOnboardingConsentSetByOnboardingId:
          mockGetOnboardingConsentSetByOnboardingId,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        consentSetId: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');
      fireEvent.press(getByTestId('state-select'));

      await waitFor(() => {
        const button = getByTestId('physical-address-continue-button');
        expect(button.props.disabled).toBe(false);
      });

      const button = getByTestId('physical-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockRegisterAddress).toHaveBeenCalledWith({
          onboardingId: 'test-id',
          addressLine1: '123 Main St',
          addressLine2: '',
          city: 'San Francisco',
          usState: 'CA',
          zip: '12345',
          isSameMailingAddress: true,
        });
      });

      await waitFor(
        () => {
          expect(mockReset).toHaveBeenCalledWith({
            index: 0,
            routes: [{ name: Routes.CARD.ONBOARDING.VALIDATING_KYC }],
          });
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Consent Management', () => {
    it('creates new consent when no existing consent found', async () => {
      const mockGetOnboardingConsentSetByOnboardingId = jest
        .fn()
        .mockResolvedValue(null);
      const mockCreateOnboardingConsent = jest
        .fn()
        .mockResolvedValue('consent-set-123');
      const mockLinkUserToConsent = jest.fn().mockResolvedValue(undefined);
      const mockRegisterAddress = jest.fn().mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-id' },
      });

      mockUseRegisterPhysicalAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockUseRegisterUserConsent.mockReturnValue({
        createOnboardingConsent: mockCreateOnboardingConsent,
        linkUserToConsent: mockLinkUserToConsent,
        getOnboardingConsentSetByOnboardingId:
          mockGetOnboardingConsentSetByOnboardingId,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        consentSetId: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');
      fireEvent.press(getByTestId('state-select'));

      await waitFor(() => {
        const button = getByTestId('physical-address-continue-button');
        expect(button.props.disabled).toBe(false);
      });

      const button = getByTestId('physical-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockGetOnboardingConsentSetByOnboardingId).toHaveBeenCalledWith(
          'test-id',
        );
      });

      await waitFor(() => {
        expect(mockCreateOnboardingConsent).toHaveBeenCalledWith('test-id');
      });
    });

    it('reuses existing incomplete consent', async () => {
      const mockGetOnboardingConsentSetByOnboardingId = jest
        .fn()
        .mockResolvedValue({
          consentSetId: 'existing-consent-123',
          userId: null,
          completedAt: null,
        });
      const mockCreateOnboardingConsent = jest.fn();
      const mockLinkUserToConsent = jest.fn().mockResolvedValue(undefined);
      const mockRegisterAddress = jest.fn().mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-id' },
      });

      mockUseRegisterPhysicalAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockUseRegisterUserConsent.mockReturnValue({
        createOnboardingConsent: mockCreateOnboardingConsent,
        linkUserToConsent: mockLinkUserToConsent,
        getOnboardingConsentSetByOnboardingId:
          mockGetOnboardingConsentSetByOnboardingId,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        consentSetId: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');
      fireEvent.press(getByTestId('state-select'));

      await waitFor(() => {
        const button = getByTestId('physical-address-continue-button');
        expect(button.props.disabled).toBe(false);
      });

      const button = getByTestId('physical-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockGetOnboardingConsentSetByOnboardingId).toHaveBeenCalledWith(
          'test-id',
        );
      });

      expect(mockCreateOnboardingConsent).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(mockLinkUserToConsent).toHaveBeenCalledWith(
          'existing-consent-123',
          'user-id',
        );
      });
    });

    it('skips consent operations when consent already completed', async () => {
      const mockGetOnboardingConsentSetByOnboardingId = jest
        .fn()
        .mockResolvedValue({
          consentSetId: 'completed-consent-123',
          userId: 'user-id',
          completedAt: '2024-01-01T00:00:00.000Z',
        });
      const mockCreateOnboardingConsent = jest.fn();
      const mockLinkUserToConsent = jest.fn();
      const mockRegisterAddress = jest.fn().mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-id' },
      });

      mockUseRegisterPhysicalAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockUseRegisterUserConsent.mockReturnValue({
        createOnboardingConsent: mockCreateOnboardingConsent,
        linkUserToConsent: mockLinkUserToConsent,
        getOnboardingConsentSetByOnboardingId:
          mockGetOnboardingConsentSetByOnboardingId,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        consentSetId: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');
      fireEvent.press(getByTestId('state-select'));

      await waitFor(() => {
        const button = getByTestId('physical-address-continue-button');
        expect(button.props.disabled).toBe(false);
      });

      const button = getByTestId('physical-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockGetOnboardingConsentSetByOnboardingId).toHaveBeenCalledWith(
          'test-id',
        );
      });

      expect(mockCreateOnboardingConsent).not.toHaveBeenCalled();
      expect(mockLinkUserToConsent).not.toHaveBeenCalled();

      await waitFor(
        () => {
          expect(mockReset).toHaveBeenCalledWith({
            index: 0,
            routes: [{ name: Routes.CARD.ONBOARDING.VALIDATING_KYC }],
          });
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Error Handling', () => {
    it('displays registration error when present', () => {
      mockUseRegisterPhysicalAddress.mockReturnValue({
        registerAddress: jest.fn(),
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: 'Registration failed',
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByText } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByText('Registration failed')).toBeTruthy();
    });

    it('displays consent error when present', () => {
      mockUseRegisterUserConsent.mockReturnValue({
        createOnboardingConsent: jest.fn(),
        linkUserToConsent: jest.fn(),
        getOnboardingConsentSetByOnboardingId: jest
          .fn()
          .mockResolvedValue(null),
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: 'Consent failed',
        consentSetId: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByText } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByText('Consent failed')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('disables button during registration loading', () => {
      mockUseRegisterPhysicalAddress.mockReturnValue({
        registerAddress: jest.fn(),
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const button = getByTestId('physical-address-continue-button');
      expect(button.props.disabled).toBe(true);
    });

    it('disables button during consent loading', () => {
      mockUseRegisterUserConsent.mockReturnValue({
        createOnboardingConsent: jest.fn(),
        linkUserToConsent: jest.fn(),
        getOnboardingConsentSetByOnboardingId: jest
          .fn()
          .mockResolvedValue(null),
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        consentSetId: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const button = getByTestId('physical-address-continue-button');
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Conditional Rendering', () => {
    it('shows state field for US users', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: 'US',
              onboardingId: 'test-id',
            },
          },
        }),
      );

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('state-select')).toBeTruthy();
    });

    it('hides state field for non-US users', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: 'CA',
              onboardingId: 'test-id',
            },
          },
        }),
      );

      const { queryByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(queryByTestId('state-select')).toBeFalsy();
    });

    it('shows country field for all users', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('country-select')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing onboarding data gracefully', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: null,
              onboardingId: null,
              user: null,
            },
          },
        }),
      );

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('handles missing registration settings', () => {
      mockUseRegistrationSettings.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('handles loading registration settings', () => {
      mockUseRegistrationSettings.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        fetchData: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });
  });

  describe('i18n Integration', () => {
    it('uses correct translation keys for all text elements', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.physical_address.title',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.physical_address.description',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.continue_button',
      );
    });

    it('displays translated text correctly', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <PhysicalAddress />
        </Provider>,
      );

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const buttonText = getByTestId('button-text');

      expect(title.props.children).toBe('Physical Address');
      expect(description.props.children).toBe(
        'Enter your physical address information',
      );
      expect(buttonText.props.children).toBe('Continue');
    });
  });
});
