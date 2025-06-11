import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import OtpCode from './OtpCode';
import Routes from '../../../../../../constants/navigation/Routes';
import { DepositSdkMethodResult } from '../../hooks/useDepositSdkMethod';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import { useDepositSDK } from '../../sdk';
import {
  BuyQuote,
  NativeRampsSdk,
  NativeTransakAccessToken,
} from '@consensys/native-ramps-sdk';

const EMAIL = 'test@email.com';

const mockQuote = {
  quoteId: 'mock-quote-id',
} as BuyQuote;

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useDepositSDK: jest.fn().mockReturnValue({
    sdk: {},
    sdkError: null,
    providerApiKey: 'mock-api-key',
    providerFrontendAuth: 'mock-frontend-auth',
    setAuthToken: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockUseDepositSdkMethodInitialState = {
  data: null,
  error: null,
  isFetching: false,
};

const mockSdkMethod = jest.fn().mockResolvedValue('Success');

let mockUseDepositSdkMethodValues: DepositSdkMethodResult<'verifyUserOtp'> = [
  mockUseDepositSdkMethodInitialState,
  mockSdkMethod,
];

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: () => mockUseDepositSdkMethodValues,
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
    useRoute: () => ({
      params: { email: EMAIL, quote: mockQuote },
    }),
  };
});

jest.mock('../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Enter six-digit code',
  }),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.OTP_CODE);
}

describe('OtpCode Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkMethodValues = [
      { ...mockUseDepositSdkMethodInitialState },
      mockSdkMethod,
    ];
  });

  it('render matches snapshot', () => {
    render(OtpCode);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(OtpCode);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter six-digit code',
      }),
    );
  });

  it('renders loading state snapshot', async () => {
    mockUseDepositSdkMethodValues = [
      { ...mockUseDepositSdkMethodInitialState, isFetching: true },
      mockSdkMethod,
    ];
    render(OtpCode);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to next screen on submit button press when valid code is entered', async () => {
    const mockResponse = {
      id: 'mock-id',
      ttl: 1000,
      userId: 'mock-user-id',
    } as NativeTransakAccessToken;

    const mockSubmitCode = jest.fn().mockResolvedValue(mockResponse);
    const mockSetAuthToken = jest.fn().mockResolvedValue(undefined);

    mockUseDepositSdkMethodValues = [
      { ...mockUseDepositSdkMethodInitialState, data: null },
      mockSubmitCode,
    ];

    jest.mocked(useDepositSDK).mockReturnValue({
      sdk: {
        setAccessToken: jest.fn(),
        getAccessToken: jest.fn(),
        clearAccessToken: jest.fn(),
        verifyUserOtp: jest.fn(),
        sendUserOtp: jest.fn(),
        getVersion: jest.fn(),
      } as unknown as NativeRampsSdk,
      sdkError: undefined,
      providerApiKey: 'mock-api-key',
      providerFrontendAuth: 'mock-frontend-auth',
      setAuthToken: mockSetAuthToken,
      isAuthenticated: false,
      checkExistingToken: jest.fn(),
      clearAuthToken: jest.fn(),
      getStarted: true,
      setGetStarted: jest.fn(),
    });

    const { getByTestId } = render(OtpCode);

    const codeInput = getByTestId('otp-code-input');
    fireEvent.changeText(codeInput, '123456');

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Submit',
      }),
    );

    expect(mockSubmitCode).toHaveBeenCalled();

    mockUseDepositSdkMethodValues[0] = {
      ...mockUseDepositSdkMethodValues[0],
      data: mockResponse,
    };

    render(OtpCode);

    await waitFor(() => {
      expect(mockSetAuthToken).toHaveBeenCalledWith(mockResponse);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.DEPOSIT.VERIFY_IDENTITY,
        { quote: mockQuote },
      );
    });
  });

  it('render matches error snapshot when API call fails', async () => {
    mockUseDepositSdkMethodValues = [
      { ...mockUseDepositSdkMethodInitialState, error: 'Invalid code' },
      mockSdkMethod,
    ];
    render(OtpCode);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('disables submit button and shows loading state when loading', () => {
    mockUseDepositSdkMethodValues = [
      { ...mockUseDepositSdkMethodInitialState, isFetching: true },
      mockSdkMethod,
    ];
    render(OtpCode);
    expect(screen.toJSON()).toMatchSnapshot();
    const loadingButton = screen.getByRole('button', {
      name: 'Verifying code...',
    });
    fireEvent.press(loadingButton);
    expect(mockSdkMethod).not.toHaveBeenCalled();
  });

  it('disables submit button when code length is invalid', () => {
    mockUseDepositSdkMethodValues = [
      { ...mockUseDepositSdkMethodInitialState },
      mockSdkMethod,
    ];
    render(OtpCode);
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.press(submitButton);
    expect(mockSdkMethod).not.toHaveBeenCalled();
  });
});
