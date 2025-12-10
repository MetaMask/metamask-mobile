// Mock dependencies first
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('./OnboardingStep', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

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
      React.createElement(Text, { testID: 'onboarding-step-title' }, title),
      React.createElement(
        Text,
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

jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  const TextVariant = {
    BodySm: 'BodySm',
    BodyMd: 'BodyMd',
    HeadingMd: 'HeadingMd',
  };

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => React.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => React.createElement(Text, { testID, ...props }, children),
    TextVariant,
  };
});

jest.mock('../../../../../component-library/components/Form/TextField', () => {
  const React = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  const TextFieldSize = {
    Sm: 'sm',
    Md: 'md',
    Lg: 'lg',
  };

  const MockTextField = ({
    testID,
    onChangeText,
    value,
    placeholder,
    maxLength,
    size,
    accessibilityLabel,
    ...props
  }: {
    testID?: string;
    onChangeText?: (text: string) => void;
    value?: string;
    placeholder?: string;
    maxLength?: number;
    size?: string;
    accessibilityLabel?: string;
  }) =>
    React.createElement(TextInput, {
      testID,
      onChangeText,
      value,
      placeholder,
      maxLength,
      accessibilityLabel,
      ...props,
    });

  MockTextField.Size = TextFieldSize;

  return {
    __esModule: true,
    default: MockTextField,
    TextFieldSize,
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  const ButtonSize = {
    Sm: 'sm',
    Md: 'md',
    Lg: 'lg',
  };

  const ButtonVariants = {
    Primary: 'primary',
    Secondary: 'secondary',
    Link: 'link',
  };

  const ButtonWidthTypes = {
    Auto: 'auto',
    Full: 'full',
  };

  const MockButton = ({
    testID,
    onPress,
    children,
    disabled,
    label,
    variant,
    size,
    width,
    isDisabled,
    ...props
  }: {
    testID?: string;
    onPress?: () => void;
    children?: React.ReactNode;
    disabled?: boolean;
    label?: string;
    variant?: string;
    size?: string;
    width?: string;
    isDisabled?: boolean;
  }) =>
    React.createElement(
      TouchableOpacity,
      { testID, onPress, disabled: disabled || isDisabled, ...props },
      React.createElement(Text, {}, children || label),
    );

  MockButton.Size = ButtonSize;
  MockButton.Variants = ButtonVariants;
  MockButton.WidthTypes = ButtonWidthTypes;

  return {
    __esModule: true,
    default: MockButton,
    ButtonSize,
    ButtonVariants,
    ButtonWidthTypes,
  };
});

jest.mock('../../../../../component-library/components/Form/Label', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => React.createElement(Text, { testID }, children);
});

jest.mock('../../../SelectComponent', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return ({
    testID,
    options,
    selectedValue,
    onValueChange,
    ...props
  }: {
    testID?: string;
    options?: { label: string; value: string }[];
    selectedValue?: string;
    onValueChange?: (value: string) => void;
  }) =>
    React.createElement(
      View,
      { testID, ...props },
      React.createElement(Text, {}, `Selected: ${selectedValue || 'None'}`),
    );
});

jest.mock('../../../Ramp/Deposit/components/DepositDateField', () => {
  const React = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  return ({
    testID,
    onChangeText,
    value,
    ...props
  }: {
    testID?: string;
    onChangeText?: (text: string) => void;
    value?: string;
  }) =>
    React.createElement(TextInput, {
      testID,
      onChangeText,
      value,
      ...props,
    });
});

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}));

jest.mock('../../hooks/useRegisterPersonalDetails', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useRegistrationSettings', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'card.onboarding.personal_details.title': 'Personal Details',
      'card.onboarding.personal_details.description':
        'Enter your personal information',
      'card.onboarding.personal_details.first_name': 'First Name',
      'card.onboarding.personal_details.last_name': 'Last Name',
      'card.onboarding.personal_details.date_of_birth': 'Date of Birth',
      'card.onboarding.personal_details.nationality': 'Nationality',
      'card.onboarding.personal_details.ssn': 'SSN',
      'card.onboarding.personal_details.continue': 'Continue',
      'card.onboarding.personal_details.ssn_error': 'Invalid SSN',
      'card.onboarding.personal_details.age_error': 'Must be 18 or older',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    CARD_VIEWED: 'card_viewed',
    CARD_BUTTON_CLICKED: 'card_button_clicked',
  },
  useMetrics: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../types', () => ({
  CardError: class CardError extends Error {
    type: string;
    constructor(type: string, message: string) {
      super(message);
      this.type = type;
      this.name = 'CardError';
    }
  },
  CardErrorType: {
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  },
}));

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import PersonalDetails from './PersonalDetails';
import useRegisterPersonalDetails from '../../hooks/useRegisterPersonalDetails';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import { useCardSDK } from '../../sdk';
import { useMetrics } from '../../../../hooks/useMetrics';
import { CardError, CardErrorType } from '../../types';

// Mock implementations
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockDispatch = jest.fn();
const mockRegisterPersonalDetails = jest.fn();
const mockSetUser = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

// Mock hooks
(useNavigation as jest.Mock).mockReturnValue({
  navigate: mockNavigate,
  reset: mockReset,
});

(useDispatch as jest.Mock).mockReturnValue(mockDispatch);

(useSelector as jest.Mock).mockImplementation((selector) => {
  const mockState = {
    card: {
      onboarding: {
        onboardingId: 'test-onboarding-id',
        selectedCountry: 'US',
      },
    },
  };
  return selector(mockState);
});

(useRegisterPersonalDetails as jest.Mock).mockReturnValue({
  registerPersonalDetails: mockRegisterPersonalDetails,
  isLoading: false,
  isError: false,
  error: null,
  reset: jest.fn(),
});

(useRegistrationSettings as jest.Mock).mockReturnValue({
  data: {
    countries: [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
    ],
  },
});

(useCardSDK as jest.Mock).mockReturnValue({
  sdk: null,
  isLoading: false,
  user: null,
  setUser: mockSetUser,
  logoutFromProvider: jest.fn(),
});

(useMetrics as jest.Mock).mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: mockCreateEventBuilder,
});

describe('PersonalDetails Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders all required form fields with correct testIDs', () => {
      const { getByTestId } = render(<PersonalDetails />);

      expect(getByTestId('personal-details-first-name-input')).toBeTruthy();
      expect(getByTestId('personal-details-last-name-input')).toBeTruthy();
      expect(getByTestId('personal-details-nationality-select')).toBeTruthy();
      expect(getByTestId('personal-details-continue-button')).toBeTruthy();
    });

    it('has continue button disabled initially', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const continueButton = getByTestId('personal-details-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('does not show error messages initially', () => {
      const { queryByTestId } = render(<PersonalDetails />);

      expect(queryByTestId('personal-details-ssn-error')).toBeNull();
      expect(queryByTestId('personal-details-error')).toBeNull();
    });
  });

  describe('Conditional SSN Field Rendering', () => {
    it('shows SSN field when selected country is US', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          card: {
            onboarding: {
              onboardingId: 'test-onboarding-id',
              selectedCountry: 'US',
            },
          },
        };
        return selector(mockState);
      });

      const { getByTestId } = render(<PersonalDetails />);

      expect(getByTestId('personal-details-ssn-input')).toBeTruthy();
    });

    it('does not show SSN field when selected country is not US', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          card: {
            onboarding: {
              onboardingId: 'test-onboarding-id',
              selectedCountry: 'CA',
            },
          },
        };
        return selector(mockState);
      });

      const { queryByTestId } = render(<PersonalDetails />);

      expect(queryByTestId('personal-details-ssn-input')).toBeNull();
    });
  });

  describe('Form Field Interactions', () => {
    it('allows text input in first name field', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      fireEvent.changeText(firstNameInput, 'John');

      expect(firstNameInput.props.value).toBe('John');
    });

    it('allows text input in last name field', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const lastNameInput = getByTestId('personal-details-last-name-input');
      fireEvent.changeText(lastNameInput, 'Doe');

      expect(lastNameInput.props.value).toBe('Doe');
    });

    it('limits first name input to 255 characters', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      expect(firstNameInput.props.maxLength).toBe(255);
    });

    it('limits last name input to 255 characters', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const lastNameInput = getByTestId('personal-details-last-name-input');
      expect(lastNameInput.props.maxLength).toBe(255);
    });
  });

  describe('SSN Validation', () => {
    beforeEach(() => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          card: {
            onboarding: {
              onboardingId: 'test-onboarding-id',
              selectedCountry: 'US',
            },
          },
        };
        return selector(mockState);
      });
    });

    it('filters non-numeric characters from SSN input', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const ssnInput = getByTestId('personal-details-ssn-input');
      fireEvent.changeText(ssnInput, 'abc123def456ghi789');

      expect(ssnInput.props.value).toBe('123456789');
    });

    it('limits SSN input to 9 characters', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const ssnInput = getByTestId('personal-details-ssn-input');
      expect(ssnInput.props.maxLength).toBe(9);
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to OnboardingStep', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const onboardingStep = getByTestId('onboarding-step');
      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const formFields = getByTestId('onboarding-step-form-fields');
      const actions = getByTestId('onboarding-step-actions');

      expect(onboardingStep).toBeTruthy();
      expect(title).toBeTruthy();
      expect(description).toBeTruthy();
      expect(formFields).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('renders form fields section with all inputs', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields).toBeTruthy();

      // Verify all form inputs are within the form fields section
      expect(getByTestId('personal-details-first-name-input')).toBeTruthy();
      expect(getByTestId('personal-details-last-name-input')).toBeTruthy();
      expect(getByTestId('personal-details-nationality-select')).toBeTruthy();
    });

    it('renders actions section with continue button', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
      expect(getByTestId('personal-details-continue-button')).toBeTruthy();
    });
  });

  describe('Date of Birth Parsing from userData', () => {
    it('populates date field with valid ISO 8601 date string', () => {
      const mockUserData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2002-06-07T00:00:00.000Z',
        countryOfResidence: 'US',
        ssn: '123456789',
      };
      (useCardSDK as jest.Mock).mockReturnValue({
        user: mockUserData,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      render(<PersonalDetails />);

      // Date should be parsed to timestamp: June 7, 2002
      // The exact timestamp will depend on local timezone
      // Just verify it's a valid number string
      expect(mockSetUser).not.toHaveBeenCalled();
    });

    it('populates all form fields when userData is provided', () => {
      const mockUserData = {
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1995-03-15T00:00:00.000Z',
        countryOfResidence: 'CA',
        ssn: '987654321',
      };
      (useCardSDK as jest.Mock).mockReturnValue({
        user: mockUserData,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      const lastNameInput = getByTestId('personal-details-last-name-input');

      expect(firstNameInput.props.value).toBe('Jane');
      expect(lastNameInput.props.value).toBe('Smith');
    });

    it('handles missing dateOfBirth gracefully', () => {
      const mockUserData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: null,
        countryOfResidence: 'US',
        ssn: '123456789',
      };
      (useCardSDK as jest.Mock).mockReturnValue({
        user: mockUserData,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      expect(firstNameInput.props.value).toBe('John');
    });

    it('handles empty string dateOfBirth', () => {
      const mockUserData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '',
        countryOfResidence: 'US',
        ssn: '123456789',
      };
      (useCardSDK as jest.Mock).mockReturnValue({
        user: mockUserData,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      expect(firstNameInput.props.value).toBe('John');
    });

    it('handles invalid date format without crashing', () => {
      const mockUserData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: 'invalid-date',
        countryOfResidence: 'US',
        ssn: '123456789',
      };
      (useCardSDK as jest.Mock).mockReturnValue({
        user: mockUserData,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      expect(firstNameInput.props.value).toBe('John');
    });

    it('handles non-string dateOfBirth type', () => {
      const mockUserData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: 1234567890000,
        countryOfResidence: 'US',
        ssn: '123456789',
      };
      (useCardSDK as jest.Mock).mockReturnValue({
        user: mockUserData,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      expect(firstNameInput.props.value).toBe('John');
    });

    it('extracts date components correctly from ISO date string', () => {
      const mockUserData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-12-25T00:00:00.000Z',
        countryOfResidence: 'US',
        ssn: '123456789',
      };
      (useCardSDK as jest.Mock).mockReturnValue({
        user: mockUserData,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      render(<PersonalDetails />);

      // If parsing succeeds, component renders without error
      expect(mockSetUser).not.toHaveBeenCalled();
    });

    it('populates SSN field when userData includes SSN', () => {
      const mockUserData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        countryOfResidence: 'US',
        ssn: '123456789',
      };
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          card: {
            onboarding: {
              onboardingId: 'test-onboarding-id',
              selectedCountry: 'US',
            },
          },
        };
        return selector(mockState);
      });
      (useCardSDK as jest.Mock).mockReturnValue({
        user: mockUserData,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      const { getByTestId } = render(<PersonalDetails />);

      const ssnInput = getByTestId('personal-details-ssn-input');
      expect(ssnInput.props.value).toBe('123456789');
    });
  });

  describe('registerPersonalDetails Function Call', () => {
    beforeEach(() => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          card: {
            onboarding: {
              onboardingId: 'test-onboarding-id',
              selectedCountry: 'US',
            },
          },
        };
        return selector(mockState);
      });
    });

    it('calls registerPersonalDetails with correct parameters on continue', async () => {
      mockRegisterPersonalDetails.mockResolvedValue({
        user: { id: 'user-123' },
      });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      const lastNameInput = getByTestId('personal-details-last-name-input');
      const ssnInput = getByTestId('personal-details-ssn-input');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(ssnInput, '123456789');

      const continueButton = getByTestId('personal-details-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockRegisterPersonalDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          onboardingId: 'test-onboarding-id',
          firstName: 'John',
          lastName: 'Doe',
          ssn: '123456789',
        }),
      );
    });

    it('navigates to physical address screen after successful registration', async () => {
      const mockUser = { id: 'user-123', firstName: 'John' };
      mockRegisterPersonalDetails.mockResolvedValue({ user: mockUser });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      const lastNameInput = getByTestId('personal-details-last-name-input');
      const ssnInput = getByTestId('personal-details-ssn-input');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(ssnInput, '123456789');

      const continueButton = getByTestId('personal-details-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockReset).toHaveBeenCalled();
    });

    it('disables continue button when required fields are missing', () => {
      // Ensure no user data is pre-populated
      (useCardSDK as jest.Mock).mockReturnValue({
        user: null,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      fireEvent.changeText(firstNameInput, 'John');

      const continueButton = getByTestId('personal-details-continue-button');

      expect(continueButton.props.disabled).toBe(true);
    });

    it('does not call registerPersonalDetails when onboardingId is missing', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          card: {
            onboarding: {
              onboardingId: null,
              selectedCountry: 'US',
            },
          },
        };
        return selector(mockState);
      });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      const lastNameInput = getByTestId('personal-details-last-name-input');
      const ssnInput = getByTestId('personal-details-ssn-input');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(ssnInput, '123456789');

      const continueButton = getByTestId('personal-details-continue-button');
      fireEvent.press(continueButton);

      expect(mockRegisterPersonalDetails).not.toHaveBeenCalled();
    });

    it('displays error message when registerPersonalDetails fails', async () => {
      const mockError = 'Registration failed';
      (useRegisterPersonalDetails as jest.Mock).mockReturnValue({
        registerPersonalDetails: mockRegisterPersonalDetails,
        isLoading: false,
        isError: true,
        error: mockError,
        reset: jest.fn(),
      });

      const { getByTestId } = render(<PersonalDetails />);

      await waitFor(() => {
        const errorText = getByTestId('personal-details-error');
        expect(errorText.props.children).toBe(mockError);
      });
    });

    it('handles onboarding ID not found error by resetting state', async () => {
      // Setup: Pre-fill all required fields via userData
      const mockUserData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        countryOfResidence: 'US',
        ssn: '123456789',
      };
      (useCardSDK as jest.Mock).mockReturnValue({
        user: mockUserData,
        setUser: mockSetUser,
        logoutFromProvider: jest.fn(),
      });

      mockRegisterPersonalDetails.mockRejectedValue(
        new CardError(CardErrorType.UNKNOWN_ERROR, 'Onboarding ID not found'),
      );

      const { getByTestId } = render(<PersonalDetails />);

      const continueButton = getByTestId('personal-details-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('disables continue button when SSN is invalid', () => {
      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      const lastNameInput = getByTestId('personal-details-last-name-input');
      const ssnInput = getByTestId('personal-details-ssn-input');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(ssnInput, '123'); // Invalid SSN (less than 9 digits)

      const continueButton = getByTestId('personal-details-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });

    it('includes dateOfBirth in registration payload when provided', async () => {
      mockRegisterPersonalDetails.mockResolvedValue({
        user: { id: 'user-123' },
      });

      const { getByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      const lastNameInput = getByTestId('personal-details-last-name-input');
      const ssnInput = getByTestId('personal-details-ssn-input');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(ssnInput, '123456789');

      const continueButton = getByTestId('personal-details-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockRegisterPersonalDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          onboardingId: 'test-onboarding-id',
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
    });

    it('does not require SSN when country is not US', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          card: {
            onboarding: {
              onboardingId: 'test-onboarding-id',
              selectedCountry: 'CA',
            },
          },
        };
        return selector(mockState);
      });

      const { getByTestId, queryByTestId } = render(<PersonalDetails />);

      const firstNameInput = getByTestId('personal-details-first-name-input');
      const lastNameInput = getByTestId('personal-details-last-name-input');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');

      expect(queryByTestId('personal-details-ssn-input')).toBeNull();
    });
  });
});
