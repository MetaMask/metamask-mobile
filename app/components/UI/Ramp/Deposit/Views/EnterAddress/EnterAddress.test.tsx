import React from 'react';
import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import EnterAddress from './EnterAddress';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import { BasicInfoFormData } from '../BasicInfo/BasicInfo';
import { BuyQuote } from '@consensys/native-ramps-sdk';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockFormData: BasicInfoFormData = {
  firstName: 'John',
  lastName: 'Doe',
  mobileNumber: '+1234567890',
  dob: '01/01/1990',
  ssn: '123-45-6789',
};

const mockQuote = {
  quoteId: 'test-quote-id',
} as BuyQuote;

let mockUseParamsReturnValue: {
  formData: BasicInfoFormData;
  quote: BuyQuote;
  kycUrl?: string;
} = {
  formData: mockFormData,
  quote: mockQuote,
};

let mockUseDepositSDKReturnValue = {
  selectedRegion: { isoCode: 'US', name: 'United States', flag: '🇺🇸' },
};

const mockUseDepositSdkMethodInitialState = {
  data: null,
  error: null as string | null,
  isFetching: false,
};

let mockKycFunction = jest.fn().mockResolvedValue(undefined);
let mockPurposeFunction = jest.fn().mockResolvedValue(undefined);
let mockSsnFunction = jest.fn().mockResolvedValue(undefined);
let mockKycValues = [mockUseDepositSdkMethodInitialState, mockKycFunction];
let mockPurposeValues = [
  mockUseDepositSdkMethodInitialState,
  mockPurposeFunction,
];
let mockSsnValues = [
  { ...mockUseDepositSdkMethodInitialState },
  mockSsnFunction,
];

const mockNavigateToKycWebview = jest.fn();

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: jest.fn(() => ({
    navigateToKycWebview: mockNavigateToKycWebview,
  })),
}));

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn((config) => {
    if (config?.method === 'patchUser') {
      return mockKycValues;
    }
    if (config?.method === 'submitPurposeOfUsageForm') {
      return mockPurposeValues;
    }
    if (config?.method === 'submitSsnDetails') {
      return mockSsnValues;
    }
    return [mockUseDepositSdkMethodInitialState, jest.fn()];
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useDepositSDK: () => mockUseDepositSDKReturnValue,
}));

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParamsReturnValue,
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.ENTER_ADDRESS);
}

function fillFormAndSubmit({
  addressLine1 = '123 Main St',
  addressLine2 = '',
  city = 'San Francisco',
  state = 'CA',
  postCode = '10001',
} = {}) {
  fireEvent.changeText(
    screen.getByTestId('address-line-1-input'),
    addressLine1,
  );
  if (addressLine2) {
    fireEvent.changeText(
      screen.getByTestId('address-line-2-input'),
      addressLine2,
    );
  }
  fireEvent.changeText(screen.getByTestId('city-input'), city);
  fireEvent.press(screen.getByTestId('state-input'));
  // Wait for the navigation to happen and then call the onStateSelect callback
  act(() => {
    const lastNavigateCall =
      mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1];
    if (lastNavigateCall?.[1]?.params?.onStateSelect) {
      lastNavigateCall[1].params.onStateSelect(state);
    }
  });
  fireEvent.changeText(screen.getByTestId('postal-code-input'), postCode);
  fireEvent.press(screen.getByTestId('address-continue-button'));
}

describe('EnterAddress Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsReturnValue = { formData: mockFormData, quote: mockQuote };
    mockUseDepositSDKReturnValue = {
      selectedRegion: { isoCode: 'US', name: 'United States', flag: '🇺🇸' },
    };
    mockKycFunction = jest.fn().mockResolvedValue(undefined);
    mockPurposeFunction = jest.fn().mockResolvedValue(undefined);
    mockSsnFunction = jest.fn().mockResolvedValue(undefined);
    mockKycValues = [
      { ...mockUseDepositSdkMethodInitialState },
      mockKycFunction,
    ];
    mockPurposeValues = [
      { ...mockUseDepositSdkMethodInitialState },
      mockPurposeFunction,
    ];
    mockSsnValues = [
      { ...mockUseDepositSdkMethodInitialState },
      mockSsnFunction,
    ];
    mockNavigateToKycWebview.mockClear();
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(EnterAddress);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays form validation errors when continue is pressed with empty fields', () => {
    render(EnterAddress);
    fireEvent.press(screen.getByTestId('address-continue-button'));
    expect(screen.toJSON()).toMatchSnapshot();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.DEPOSIT.KYC_PROCESSING,
      expect.any(Object),
    );
  });

  it('submits form data and navigates to next page when form is valid and continue is pressed', async () => {
    render(EnterAddress);

    fillFormAndSubmit();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.KYC_PROCESSING, {
        quote: mockQuote,
      });
    });
  });

  it('navigates to KYC webview when kycUrl is provided', async () => {
    const kycUrl = 'https://example.com/kyc';

    mockUseParamsReturnValue = {
      formData: mockFormData,
      quote: mockQuote,
      kycUrl,
    };

    render(EnterAddress);

    fillFormAndSubmit();

    await waitFor(() => {
      expect(mockKycFunction).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSsnFunction).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockPurposeFunction).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigateToKycWebview).toHaveBeenCalledWith({
        quote: mockQuote,
        kycUrl,
      });
    });
  });

  it('does not navigate if form submission fails', async () => {
    mockKycFunction.mockRejectedValueOnce(new Error('API error'));

    render(EnterAddress);

    fillFormAndSubmit();

    expect(mockKycFunction).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.DEPOSIT.KYC_PROCESSING,
        expect.any(Object),
      );
    });
  });

  it('calls setOptions with correct title when the component mounts', () => {
    render(EnterAddress);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter your address',
      }),
    );
  });

  it('calls submitSsnDetails with SSN if present and proceeds if successful', async () => {
    render(EnterAddress);
    fillFormAndSubmit();
    await waitFor(() => {
      expect(mockSsnFunction).toHaveBeenCalledWith('123-45-6789');
      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.KYC_PROCESSING, {
        quote: mockQuote,
      });
    });
  });

  it('does not call submitSsnDetails when SSN is not present', async () => {
    const formDataWithoutSsn: BasicInfoFormData = {
      firstName: 'John',
      lastName: 'Doe',
      mobileNumber: '+1234567890',
      dob: '01/01/1990',
    };

    mockUseParamsReturnValue = {
      formData: formDataWithoutSsn,
      quote: mockQuote,
    };

    render(EnterAddress);

    fillFormAndSubmit();

    await waitFor(() => {
      expect(mockSsnFunction).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.KYC_PROCESSING, {
        quote: mockQuote,
      });
    });
  });

  it('does not navigate if submitSsnDetails throws an error', async () => {
    mockSsnFunction.mockRejectedValueOnce(new Error('SSN error'));

    render(EnterAddress);

    fillFormAndSubmit();

    await waitFor(() => {
      expect(mockSsnFunction).toHaveBeenCalledWith('123-45-6789');
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.DEPOSIT.KYC_PROCESSING,
        expect.any(Object),
      );
    });
  });

  it('disables the continue button when loading is true', () => {
    render(EnterAddress);
    const button = screen.getByTestId('address-continue-button');
    expect(button.props.disabled).toBe(false);

    fillFormAndSubmit();

    mockKycFunction.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    fireEvent.press(button);

    expect(button.props.disabled).toBe(true);
  });

  it('shows text input for state when region is not US', () => {
    mockUseDepositSDKReturnValue = {
      selectedRegion: { isoCode: 'FR', name: 'France', flag: '🇫🇷' },
    };

    const { toJSON } = render(EnterAddress);
    expect(toJSON()).toMatchSnapshot();
  });

  it('validates address line 2 when provided', () => {
    render(EnterAddress);

    fillFormAndSubmit();

    fireEvent.changeText(screen.getByTestId('address-line-2-input'), '12345');

    fireEvent.press(screen.getByTestId('address-continue-button'));

    expect(screen.getByText('Please enter a valid address')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.DEPOSIT.KYC_PROCESSING,
      expect.any(Object),
    );
  });

  it('accepts valid address line 2', async () => {
    render(EnterAddress);

    fillFormAndSubmit({ addressLine2: 'Apt 4B' });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.KYC_PROCESSING, {
        quote: mockQuote,
      });
    });
  });

  it('displays validation error when continue is pressed without selecting a state for US region', () => {
    render(EnterAddress);

    fireEvent.changeText(
      screen.getByTestId('address-line-1-input'),
      '123 Main St',
    );
    fireEvent.changeText(screen.getByTestId('city-input'), 'San Francisco');
    fireEvent.changeText(screen.getByTestId('postal-code-input'), '10001');

    fireEvent.press(screen.getByTestId('address-continue-button'));

    expect(screen.getByText('State/Region is required')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.DEPOSIT.KYC_PROCESSING,
      expect.any(Object),
    );
  });

  it('displays selected region in disabled country field', () => {
    render(EnterAddress);
    const countryInput = screen.getByTestId('country-input');
    expect(countryInput.props.value).toBe('United States');
    expect(countryInput.props.editable).toBe(false);
  });

  it('calls all required SDK methods in correct order', async () => {
    render(EnterAddress);

    fillFormAndSubmit();

    await waitFor(() => {
      expect(mockKycFunction).toHaveBeenCalledWith({
        ...mockFormData,
        addressLine1: '123 Main St',
        addressLine2: '',
        city: 'San Francisco',
        state: 'CA',
        postCode: '10001',
        countryCode: 'US',
      });
      expect(mockSsnFunction).toHaveBeenCalledWith('123-45-6789');
      expect(mockPurposeFunction).toHaveBeenCalled();
    });
  });

  it('calls SDK methods without SSN when SSN is not provided', async () => {
    const formDataWithoutSsn: BasicInfoFormData = {
      firstName: 'John',
      lastName: 'Doe',
      mobileNumber: '+1234567890',
      dob: '01/01/1990',
    };

    mockUseParamsReturnValue = {
      formData: formDataWithoutSsn,
      quote: mockQuote,
    };

    render(EnterAddress);

    fillFormAndSubmit();

    await waitFor(() => {
      expect(mockKycFunction).toHaveBeenCalledWith({
        ...formDataWithoutSsn,
        addressLine1: '123 Main St',
        addressLine2: '',
        city: 'San Francisco',
        state: 'CA',
        postCode: '10001',
        countryCode: 'US',
      });
      expect(mockSsnFunction).not.toHaveBeenCalled();
      expect(mockPurposeFunction).toHaveBeenCalled();
    });
  });
});
