import React from 'react';
import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import EnterAddress, { AddressFormData } from './EnterAddress';
import Routes from '../../../../../../constants/navigation/Routes';

import { BasicInfoFormData } from '../BasicInfo/BasicInfo';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';

const mockTrackEvent = jest.fn();

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockQuote = {
  quoteId: 'test-quote-id',
} as BuyQuote;

let mockUseParamsReturnValue: {
  quote: BuyQuote;
  previousFormData?: BasicInfoFormData & AddressFormData;
} = {
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

const mockRouteAfterAuthentication = jest.fn();

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: jest.fn(() => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  })),
}));

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn((config) => {
    if (config?.method === 'patchUser') {
      return [mockUseDepositSdkMethodInitialState, mockKycFunction];
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
  useDepositSDK: () => mockUseDepositSDKReturnValue,
}));

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParamsReturnValue,
}));

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.ENTER_ADDRESS,
    },
    {
      state: initialRootState,
    },
  );
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
    mockUseParamsReturnValue = { quote: mockQuote };
    mockUseDepositSDKReturnValue = {
      selectedRegion: { isoCode: 'US', name: 'United States', flag: '🇺🇸' },
    };
    mockKycFunction = jest.fn().mockResolvedValue(undefined);
    mockRouteAfterAuthentication.mockClear();
    mockTrackEvent.mockClear();
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(EnterAddress);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays form validation errors when continue is pressed with empty fields', () => {
    render(EnterAddress);
    fireEvent.press(screen.getByTestId('address-continue-button'));
    expect(screen.toJSON()).toMatchSnapshot();
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('submits form data and navigates to next page when form is valid and continue is pressed', async () => {
    render(EnterAddress);

    fillFormAndSubmit();

    await waitFor(() => {
      expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockQuote);
    });
  });

  it('does not navigate if form submission fails', async () => {
    mockKycFunction.mockRejectedValueOnce(new Error('API error'));

    render(EnterAddress);

    fillFormAndSubmit();

    expect(mockKycFunction).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
    });
  });

  it('calls setOptions with correct title when the component mounts', () => {
    render(EnterAddress);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Verify your identity',
      }),
    );
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
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('accepts valid address line 2', async () => {
    render(EnterAddress);

    fillFormAndSubmit({ addressLine2: 'Apt 4B' });

    await waitFor(() => {
      expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockQuote);
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
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('displays selected region in disabled country field', () => {
    render(EnterAddress);
    const countryInput = screen.getByTestId('country-input');
    expect(countryInput.props.value).toBe('United States');
    expect(countryInput.props.editable).toBe(false);
  });

  it('calls required SDK methods with address data only', async () => {
    render(EnterAddress);

    fillFormAndSubmit();

    await waitFor(() => {
      expect(mockKycFunction).toHaveBeenCalledWith({
        addressLine1: '123 Main St',
        addressLine2: '',
        city: 'San Francisco',
        state: 'CA',
        postCode: '10001',
        countryCode: 'US',
      });
    });
  });

  it('tracks analytics event when continue button is pressed with valid form data', async () => {
    render(EnterAddress);

    fillFormAndSubmit();

    expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_ADDRESS_ENTERED', {
      region: 'US',
      ramp_type: 'DEPOSIT',
      kyc_type: 'SIMPLE',
    });

    await waitFor(() => {
      expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockQuote);
    });
  });

  it('prefills form data when previousFormData is provided', () => {
    const mockPreviousFormData = {
      firstName: 'John',
      lastName: 'Doe',
      mobileNumber: '+1234567890',
      dob: '1993-03-25T00:00:00.000Z',
      ssn: '123456789',
      addressLine1: '456 Oak Street',
      addressLine2: 'Apt 2B',
      city: 'New York',
      state: 'NY',
      postCode: '10002',
      countryCode: 'US',
    };

    mockUseParamsReturnValue = {
      quote: mockQuote,
      previousFormData: mockPreviousFormData,
    };

    render(EnterAddress);

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
