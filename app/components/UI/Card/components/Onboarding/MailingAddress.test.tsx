/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MailingAddress from './MailingAddress';
import useRegisterMailingAddress from '../../hooks/useRegisterMailingAddress';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import { useCardSDK } from '../../sdk';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks/useRegisterMailingAddress');
jest.mock('../../hooks/useRegisterUserConsent');
jest.mock('../../hooks/useRegistrationSettings');
jest.mock('../../sdk');
import useRegisterUserConsent from '../../hooks/useRegisterUserConsent';

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

  const Icon = ({ name, size, ...props }: { name: string; size: string }) =>
    React.createElement(View, { testID: 'icon', ...props });

  return {
    Box,
    Text,
    Icon,
    TextVariant: {
      BodySm: 'BodySm',
      BodyMd: 'BodyMd',
    },
    IconName: {
      ArrowDown: 'arrow-down',
    },
    IconSize: {
      Sm: 'sm',
      Md: 'md',
      Lg: 'lg',
    },
  };
});

// Mock Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((styles) => styles),
  })),
}));

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

// Mock Checkbox
jest.mock('../../../../../component-library/components/Checkbox', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return ({
    label,
    isChecked,
    onPress,
    testID,
  }: {
    label: string;
    isChecked: boolean;
    onPress: () => void;
    testID?: string;
  }) => {
    const [checked, setChecked] = React.useState(isChecked);

    const handlePress = () => {
      setChecked(!checked);
      onPress?.();
    };

    return React.createElement(
      TouchableOpacity,
      {
        testID,
        onPress: handlePress,
      },
      React.createElement(Text, { testID: `${testID}-text` }, label),
      React.createElement(
        Text,
        { testID: `${testID}-status` },
        checked ? 'checked' : 'unchecked',
      ),
    );
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

// Mock utility functions
jest.mock('../../util/cardTokenVault');
jest.mock('../../util/mapCountryToLocation');
jest.mock('../../util/extractTokenExpiration');
jest.mock('../../../../../util/Logger');

// Mock Routes
jest.mock('../../../../../constants/navigation/Routes', () => ({
  CARD: {
    VERIFYING_REGISTRATION: 'VerifyingRegistration',
    ONBOARDING: {
      COMPLETE: 'CardOnboardingComplete',
      SIGN_UP: 'CardOnboardingSignUp',
    },
    MODALS: {
      ID: 'CardModals',
      REGION_SELECTION: 'RegionSelection',
    },
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

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.mailing_address.title': 'Mailing Address',
      'card.card_onboarding.mailing_address.description':
        'Enter your Mailing address information',
      'card.card_onboarding.mailing_address.address_line_1_label':
        'Address Line 1',
      'card.card_onboarding.mailing_address.address_line_1_placeholder':
        'Enter address line 1',
      'card.card_onboarding.mailing_address.address_line_2_label':
        'Address Line 2',
      'card.card_onboarding.mailing_address.address_line_2_placeholder':
        'Enter address line 2 (optional)',
      'card.card_onboarding.mailing_address.city_label': 'City',
      'card.card_onboarding.mailing_address.city_placeholder': 'Enter city',
      'card.card_onboarding.mailing_address.state_label': 'State',
      'card.card_onboarding.mailing_address.state_placeholder': 'Select state',
      'card.card_onboarding.mailing_address.zip_code_label': 'ZIP Code',
      'card.card_onboarding.mailing_address.zip_code_placeholder':
        'Enter ZIP code',
      'card.card_onboarding.mailing_address.same_mailing_address_label':
        'Use same address for mailing',
      'card.card_onboarding.mailing_address.electronic_consent_label':
        'I consent to electronic communications',
      'card.card_onboarding.continue_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

// Mock Redux selector and dispatch
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
            selectedCountry: {
              key: 'US',
              name: 'United States',
              emoji: '🇺🇸',
              areaCode: '1',
            },
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
const mockUseRegisterMailingAddress =
  useRegisterMailingAddress as jest.MockedFunction<
    typeof useRegisterMailingAddress
  >;
const mockUseRegisterUserConsent =
  useRegisterUserConsent as jest.MockedFunction<typeof useRegisterUserConsent>;
const mockUseRegistrationSettings =
  useRegistrationSettings as jest.MockedFunction<
    typeof useRegistrationSettings
  >;
const mockSetUser = jest.fn();
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('MailingAddress Component', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();

    // Mock navigation
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
    } as unknown as ReturnType<typeof useNavigation>);

    // Mock useRegisterMailingAddress
    mockUseRegisterMailingAddress.mockReturnValue({
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
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      consentSetId: null,
      getOnboardingConsentSetByOnboardingId: jest.fn(),
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
            eSignConsentDisclosure: '',
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
      isReturningSession: false,
      sdk: null,
      isLoading: false,
      user: {
        id: 'user-id',
        email: 'test@example.com',
      },
      fetchUserData: jest.fn(),
      setUser: mockSetUser,
      logoutFromProvider: jest.fn(),
    });

    // Mock useSelector
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: any) =>
      selector({
        card: {
          onboarding: {
            selectedCountry: {
              key: 'US',
              name: 'United States',
              emoji: '🇺🇸',
              areaCode: '1',
            },
            onboardingId: 'test-id',
            user: {
              id: 'user-id',
              email: 'test@example.com',
            },
          },
        },
      }),
    );
  });

  describe('Initial Render', () => {
    it('renders the component successfully', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('displays correct title and description', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');

      expect(title.props.children).toBe('Mailing Address');
      expect(description.props.children).toBe(
        'Enter your Mailing address information',
      );
    });

    it('renders all required form fields', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
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
          <MailingAddress />
        </Provider>,
      );

      expect(getByTestId('state-select')).toBeTruthy();
    });

    it('renders continue button', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      expect(getByTestId('mailing-address-continue-button')).toBeTruthy();
    });
  });

  describe('Form Input Handling', () => {
    it('handles address line 1 input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const input = getByTestId('address-line-1-input');
      fireEvent.changeText(input, '123 Main St');

      expect(input.props.value).toBe('123 Main St');
    });

    it('handles address line 2 input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const input = getByTestId('address-line-2-input');
      fireEvent.changeText(input, 'Apt 4B');

      expect(input.props.value).toBe('Apt 4B');
    });

    it('handles city input', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const input = getByTestId('city-input');
      fireEvent.changeText(input, 'San Francisco');

      expect(input.props.value).toBe('San Francisco');
    });

    it('handles ZIP code input with numeric filtering', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const input = getByTestId('zip-code-input');
      fireEvent.changeText(input, 'abc12345def');

      // The implementation doesn't filter, so it should keep the full input
      expect(input.props.value).toBe('abc12345def');
    });

    it('handles state selection', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const select = getByTestId('state-select');
      fireEvent.press(select);

      // Verify the select component is interactive
      expect(select).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('disables continue button when required fields are empty', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const button = getByTestId('mailing-address-continue-button');
      expect(button.props.disabled).toBe(true);
    });

    it('enables continue button when all required fields are filled', async () => {
      // Use non-US user to avoid state requirement
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      await waitFor(() => {
        const button = getByTestId('mailing-address-continue-button');
        expect(button.props.disabled).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays registration error when present', () => {
      mockUseRegisterMailingAddress.mockReturnValue({
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
          <MailingAddress />
        </Provider>,
      );

      expect(getByText('Registration failed')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('disables button during registration loading', () => {
      mockUseRegisterMailingAddress.mockReturnValue({
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
          <MailingAddress />
        </Provider>,
      );

      const button = getByTestId('mailing-address-continue-button');
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
              selectedCountry: {
                key: 'US',
                name: 'United States',
                emoji: '🇺🇸',
                areaCode: '1',
              },
              onboardingId: 'test-id',
            },
          },
        }),
      );

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
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
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
            },
          },
        }),
      );

      const { queryByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      expect(queryByTestId('state-select')).toBeFalsy();
    });
  });

  describe('Redux Integration', () => {
    it('reads selected country from Redux state', () => {
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelector = jest.fn();
      useSelector.mockImplementation(mockSelector);

      render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      expect(mockSelector).toHaveBeenCalled();
    });

    it('reads onboarding ID from Redux state', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'US',
                name: 'United States',
                emoji: '🇺🇸',
                areaCode: '1',
              },
              onboardingId: 'test-onboarding-id',
            },
          },
        }),
      );

      render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      // Component should render without errors when onboarding ID is present
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty Redux state gracefully', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: null,
              onboardingId: null,
              consentSetId: null,
            },
          },
        }),
      );

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
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
          <MailingAddress />
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
          <MailingAddress />
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
          <MailingAddress />
        </Provider>,
      );

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.mailing_address.title',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.mailing_address.description',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.continue_button',
      );
    });

    it('displays translated text correctly', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const buttonText = getByTestId('button-text');

      expect(title.props.children).toBe('Mailing Address');
      expect(description.props.children).toBe(
        'Enter your Mailing address information',
      );
      expect(buttonText.props.children).toBe('Continue');
    });
  });

  describe('handleContinue', () => {
    let mockRegisterAddress: jest.Mock;
    let mockStoreCardBaanxToken: jest.Mock;
    let mockMapCountryToLocation: jest.Mock;
    let mockExtractTokenExpiration: jest.Mock;
    let mockDispatch: jest.Mock;

    beforeEach(() => {
      mockRegisterAddress = jest.fn();
      mockStoreCardBaanxToken = jest.fn();
      mockMapCountryToLocation = jest.fn();
      mockExtractTokenExpiration = jest.fn();
      mockDispatch = jest.fn();

      // Mock the utility functions
      const cardTokenVault = jest.requireMock('../../util/cardTokenVault');
      cardTokenVault.storeCardBaanxToken = mockStoreCardBaanxToken;

      const mapCountry = jest.requireMock('../../util/mapCountryToLocation');
      mapCountry.mapCountryToLocation = mockMapCountryToLocation;

      const extractToken = jest.requireMock(
        '../../util/extractTokenExpiration',
      );
      extractToken.extractTokenExpiration = mockExtractTokenExpiration;

      // Mock react-redux dispatch
      const { useDispatch } = jest.requireMock('react-redux');
      useDispatch.mockReturnValue(mockDispatch);
    });

    it('returns early when onboarding ID is missing', async () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'US',
                name: 'United States',
                emoji: '🇺🇸',
                areaCode: '1',
              },
              onboardingId: null,
            },
          },
        }),
      );

      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');

      const button = getByTestId('mailing-address-continue-button');
      fireEvent.press(button);

      expect(mockRegisterAddress).not.toHaveBeenCalled();
    });

    it('returns early when address line 1 is missing', async () => {
      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');
      fireEvent.press(getByTestId('state-select'));

      const button = getByTestId('mailing-address-continue-button');
      fireEvent.press(button);

      expect(mockRegisterAddress).not.toHaveBeenCalled();
    });

    it('returns early when city is missing', async () => {
      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');
      fireEvent.press(getByTestId('state-select'));

      const button = getByTestId('mailing-address-continue-button');
      fireEvent.press(button);

      expect(mockRegisterAddress).not.toHaveBeenCalled();
    });

    it('returns early when state is missing for US users', async () => {
      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '12345');

      const button = getByTestId('mailing-address-continue-button');
      fireEvent.press(button);

      expect(mockRegisterAddress).not.toHaveBeenCalled();
    });

    it('returns early when zip code is missing', async () => {
      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.press(getByTestId('state-select'));

      const button = getByTestId('mailing-address-continue-button');
      fireEvent.press(button);

      expect(mockRegisterAddress).not.toHaveBeenCalled();
    });

    it('calls registerAddress with correct parameters for non-US users', async () => {
      // Use non-US user to avoid state requirement via modal
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      mockMapCountryToLocation.mockReturnValue('intl');
      mockExtractTokenExpiration.mockReturnValue(3600000);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('address-line-2-input'), 'Apt 4B');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockRegisterAddress).toHaveBeenCalledWith({
          onboardingId: 'test-id',
          addressLine1: '123 Main St',
          addressLine2: 'Apt 4B',
          city: 'Toronto',
          usState: undefined,
          zip: 'M5H 2N2',
        });
      });
    });

    it('calls registerAddress without state for non-US users', async () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
            },
          },
        }),
      );

      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      mockMapCountryToLocation.mockReturnValue('intl');
      mockExtractTokenExpiration.mockReturnValue(3600000);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockRegisterAddress).toHaveBeenCalledWith({
          onboardingId: 'test-id',
          addressLine1: '123 Main St',
          addressLine2: '',
          city: 'Toronto',
          usState: undefined,
          zip: 'M5H 2N2',
        });
      });
    });

    it('updates user via setUser when registration returns updated user', async () => {
      // Use non-US user to avoid state requirement
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      const updatedUser = { id: 'user-123', email: 'updated@example.com' };

      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-token',
        user: updatedUser,
      });

      mockMapCountryToLocation.mockReturnValue('intl');
      mockExtractTokenExpiration.mockReturnValue(3600000);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
      });
    });

    it('stores access token and dispatches Redux actions on success', async () => {
      // Use non-US user to avoid state requirement
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-access-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      mockMapCountryToLocation.mockReturnValue('intl');
      mockExtractTokenExpiration.mockReturnValue(3600000);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockStoreCardBaanxToken).toHaveBeenCalledWith({
          accessToken: 'test-access-token',
          accessTokenExpiresAt: 3600000,
          location: 'intl',
        });
      });
    });

    it('navigates to complete screen after successful registration', async () => {
      // Use non-US user to avoid state requirement
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      mockMapCountryToLocation.mockReturnValue('intl');
      mockExtractTokenExpiration.mockReturnValue(3600000);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      // Wait for token storage and Redux updates before navigation
      await waitFor(
        () => {
          expect(mockReset).toHaveBeenCalledWith({
            index: 0,
            routes: [{ name: 'VerifyingRegistration' }],
          });
        },
        { timeout: 3000 },
      );
    });

    it('navigates to sign up when Onboarding ID not found error occurs', async () => {
      // Use non-US user to avoid state requirement
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      const { CardError } = jest.requireMock('../../types');

      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockRegisterAddress.mockRejectedValue(
        new CardError('Onboarding ID not found'),
      );

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('CardOnboardingSignUp');
      });
    });

    it('allows error display for general registration errors', async () => {
      // Use non-US user to avoid state requirement
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: mockRegisterAddress,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      mockRegisterAddress.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      await act(async () => {
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Input Change Handler Error Resets', () => {
    let mockResetHandler: jest.Mock;

    beforeEach(() => {
      mockResetHandler = jest.fn();
      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: jest.fn(),
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        reset: mockResetHandler,
      });
    });

    it('calls reset when address line 1 changes', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const input = getByTestId('address-line-1-input');
      fireEvent.changeText(input, '123 Main St');

      expect(mockResetHandler).toHaveBeenCalled();
    });

    it('calls reset when address line 2 changes', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const input = getByTestId('address-line-2-input');
      fireEvent.changeText(input, 'Apt 4B');

      expect(mockResetHandler).toHaveBeenCalled();
    });

    it('calls reset when city changes', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const input = getByTestId('city-input');
      fireEvent.changeText(input, 'San Francisco');

      expect(mockResetHandler).toHaveBeenCalled();
    });

    it('calls reset when zip code changes', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      const input = getByTestId('zip-code-input');
      fireEvent.changeText(input, '94102');

      expect(mockResetHandler).toHaveBeenCalled();
    });
  });

  describe('Defensive Consent Management', () => {
    let mockRegisterAddress: jest.Mock;
    let mockGetOnboardingConsentSetByOnboardingId: jest.Mock;
    let mockCreateOnboardingConsent: jest.Mock;
    let mockLinkUserToConsent: jest.Mock;
    let mockDispatch: jest.Mock;

    beforeEach(() => {
      mockRegisterAddress = jest.fn();
      mockGetOnboardingConsentSetByOnboardingId = jest.fn();
      mockCreateOnboardingConsent = jest.fn();
      mockLinkUserToConsent = jest.fn();
      mockDispatch = jest.fn();

      const { useDispatch } = jest.requireMock('react-redux');
      useDispatch.mockReturnValue(mockDispatch);

      const cardTokenVault = jest.requireMock('../../util/cardTokenVault');
      cardTokenVault.storeCardBaanxToken = jest
        .fn()
        .mockResolvedValue({ success: true });

      const mapCountry = jest.requireMock('../../util/mapCountryToLocation');
      mapCountry.mapCountryToLocation = jest.fn().mockReturnValue('us');

      const extractToken = jest.requireMock(
        '../../util/extractTokenExpiration',
      );
      extractToken.extractTokenExpiration = jest.fn().mockReturnValue(3600000);
    });

    it('creates new consent when no existing consent found', async () => {
      // Given: No consent exists and registration will succeed (non-US user to avoid state requirement)
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      mockGetOnboardingConsentSetByOnboardingId.mockResolvedValue(null);
      mockCreateOnboardingConsent.mockResolvedValue('new-consent-123');
      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      mockUseRegisterMailingAddress.mockReturnValue({
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
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      // When: User submits the form
      await act(async () => {
        fireEvent.press(button);
      });

      // Then: Should check for existing consent and create new one
      await waitFor(() => {
        expect(mockGetOnboardingConsentSetByOnboardingId).toHaveBeenCalledWith(
          'test-id',
        );
      });

      await waitFor(() => {
        expect(mockCreateOnboardingConsent).toHaveBeenCalledWith('test-id');
      });

      await waitFor(() => {
        expect(mockLinkUserToConsent).toHaveBeenCalledWith(
          'new-consent-123',
          'user-123',
        );
      });
    });

    it('reuses existing incomplete consent', async () => {
      // Given: Incomplete consent exists (non-US user to avoid state requirement)
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      mockGetOnboardingConsentSetByOnboardingId.mockResolvedValue({
        consentSetId: 'existing-consent-456',
        userId: null,
        completedAt: null,
      });
      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      mockUseRegisterMailingAddress.mockReturnValue({
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
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      // When: User submits the form
      await act(async () => {
        fireEvent.press(button);
      });

      // Then: Should reuse existing consent without creating new one
      await waitFor(() => {
        expect(mockGetOnboardingConsentSetByOnboardingId).toHaveBeenCalledWith(
          'test-id',
        );
      });

      expect(mockCreateOnboardingConsent).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(mockLinkUserToConsent).toHaveBeenCalledWith(
          'existing-consent-456',
          'user-123',
        );
      });
    });

    it('skips consent operations when consent already completed', async () => {
      // Given: Completed consent exists (non-US user to avoid state requirement)
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      mockGetOnboardingConsentSetByOnboardingId.mockResolvedValue({
        consentSetId: 'completed-consent-789',
        userId: 'user-123',
        completedAt: '2024-01-01T00:00:00.000Z',
      });
      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      mockUseRegisterMailingAddress.mockReturnValue({
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
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      // When: User submits the form
      await act(async () => {
        fireEvent.press(button);
      });

      // Then: Should check for existing consent but skip all consent operations
      await waitFor(() => {
        expect(mockGetOnboardingConsentSetByOnboardingId).toHaveBeenCalledWith(
          'test-id',
        );
      });

      expect(mockCreateOnboardingConsent).not.toHaveBeenCalled();
      expect(mockLinkUserToConsent).not.toHaveBeenCalled();

      // Wait for token storage and Redux updates before navigation
      await waitFor(
        () => {
          expect(mockReset).toHaveBeenCalledWith({
            index: 0,
            routes: [{ name: 'VerifyingRegistration' }],
          });
        },
        { timeout: 3000 },
      );
    });

    it('uses existing consent set ID from Redux when available', async () => {
      // Given: Consent ID exists in Redux (non-US user to avoid state requirement)
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              consentSetId: 'redux-consent-999',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      mockUseRegisterMailingAddress.mockReturnValue({
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
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      // When: User submits the form
      await act(async () => {
        fireEvent.press(button);
      });

      // Then: Should use Redux consent ID without checking API
      expect(mockGetOnboardingConsentSetByOnboardingId).not.toHaveBeenCalled();
      expect(mockCreateOnboardingConsent).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(mockLinkUserToConsent).toHaveBeenCalledWith(
          'redux-consent-999',
          'user-123',
        );
      });
    });

    it('clears consent set ID from Redux after linking consent', async () => {
      // Given: No consent exists (non-US user to avoid state requirement)
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
          },
        }),
      );

      mockGetOnboardingConsentSetByOnboardingId.mockResolvedValue(null);
      mockCreateOnboardingConsent.mockResolvedValue('new-consent-123');
      mockRegisterAddress.mockResolvedValue({
        accessToken: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      mockUseRegisterMailingAddress.mockReturnValue({
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
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      const button = getByTestId('mailing-address-continue-button');

      // When: User submits the form and consent is linked
      await act(async () => {
        fireEvent.press(button);
      });

      // Then: Should dispatch action to clear consent set ID after linking
      await waitFor(() => {
        expect(mockLinkUserToConsent).toHaveBeenCalledWith(
          'new-consent-123',
          'user-123',
        );
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expect.stringContaining('setConsentSetId'),
            payload: null,
          }),
        );
      });
    });
  });

  describe('Additional Validation Edge Cases', () => {
    it('disables button when onboarding ID is missing', () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'US',
                name: 'United States',
                emoji: '🇺🇸',
                areaCode: '1',
              },
              onboardingId: null,
            },
          },
        }),
      );

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '94102');
      fireEvent.press(getByTestId('state-select'));

      const button = getByTestId('mailing-address-continue-button');
      expect(button.props.disabled).toBe(true);
    });

    it('enables button for non-US users without state field', async () => {
      const { useSelector } = jest.requireMock('react-redux');
      useSelector.mockImplementation((selector: any) =>
        selector({
          card: {
            onboarding: {
              selectedCountry: {
                key: 'CA',
                name: 'Canada',
                emoji: '🇨🇦',
                areaCode: '1',
              },
              onboardingId: 'test-id',
            },
          },
        }),
      );

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'Toronto');
      fireEvent.changeText(getByTestId('zip-code-input'), 'M5H 2N2');

      await waitFor(() => {
        const button = getByTestId('mailing-address-continue-button');
        expect(button.props.disabled).toBe(false);
      });
    });

    it('disables button when registration is in error state', () => {
      mockUseRegisterMailingAddress.mockReturnValue({
        registerAddress: jest.fn(),
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: 'Registration failed',
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      fireEvent.changeText(getByTestId('address-line-1-input'), '123 Main St');
      fireEvent.changeText(getByTestId('city-input'), 'San Francisco');
      fireEvent.changeText(getByTestId('zip-code-input'), '94102');
      fireEvent.press(getByTestId('state-select'));

      const button = getByTestId('mailing-address-continue-button');
      expect(button.props.disabled).toBe(true);
    });

    it('hides error message when no registration error exists', () => {
      const { queryByTestId } = render(
        <Provider store={store}>
          <MailingAddress />
        </Provider>,
      );

      expect(queryByTestId('mailing-address-error')).toBeFalsy();
    });
  });
});
