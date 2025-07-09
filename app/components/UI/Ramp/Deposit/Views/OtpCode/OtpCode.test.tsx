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
import { DepositRegion } from '../../constants';

const EMAIL = 'test@email.com';
const PAYMENT_METHOD_ID = 'test-payment-method';
const CRYPTO_CURRENCY_CHAIN_ID = '1';

const mockQuote = {
  quoteId: 'mock-quote-id',
} as BuyQuote;

const mockRouteAfterAuthentication = jest.fn().mockResolvedValue(undefined);

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: () => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  }),
}));

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useDepositSDK: jest.fn().mockReturnValue({
    sdk: {},
    sdkError: null,
    providerApiKey: 'mock-api-key',
    providerFrontendAuth: 'mock-frontend-auth',
    setAuthToken: jest.fn().mockResolvedValue(undefined),
    selectedWalletAddress: '0x1234567890abcdef',
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
      params: {
        email: EMAIL,
        quote: mockQuote,
        paymentMethodId: PAYMENT_METHOD_ID,
        cryptoCurrencyChainId: CRYPTO_CURRENCY_CHAIN_ID,
      },
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

  it('calls routeAfterAuthentication when valid code is submitted and response is received', async () => {
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
      setSelectedRegion: jest.fn(),
      selectedWalletAddress: '0x1234567890abcdef',
      selectedRegion: {
        isoCode: 'US',
      } as DepositRegion,
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
      expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockQuote);
    });
  });

  it('renders error snapshot when API call fails', async () => {
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
    const loadingButton = screen.getByTestId('otp-code-submit-button');
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

  it('calls resendOtp when resend link is clicked and properly handles cooldown timer', async () => {
    const mockResendFn = jest.fn().mockResolvedValue('success');

    mockUseDepositSdkMethodValues = [
      { ...mockUseDepositSdkMethodInitialState },
      mockResendFn,
    ];

    render(OtpCode);
    const resendButton = screen.getByText('Resend it');
    fireEvent.press(resendButton);
    expect(mockResendFn).toHaveBeenCalled();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders cooldown timer snapshot after resending OTP', async () => {
    const mockResendFn = jest.fn().mockResolvedValue('success');
    mockUseDepositSdkMethodValues = [
      { ...mockUseDepositSdkMethodInitialState },
      mockResendFn,
    ];

    render(OtpCode);
    const resendButton = screen.getByText('Resend it');
    fireEvent.press(resendButton);

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders resend error snapshot when resend fails', async () => {
    const mockResendFn = jest
      .fn()
      .mockRejectedValue(new Error('Failed to resend'));
    mockUseDepositSdkMethodValues = [
      { ...mockUseDepositSdkMethodInitialState },
      mockResendFn,
    ];
    render(OtpCode);
    const resendButton = screen.getByText('Resend it');
    fireEvent.press(resendButton);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
