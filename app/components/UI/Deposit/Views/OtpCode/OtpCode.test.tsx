import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import OtpCode from './OtpCode';
import Routes from '../../../../../constants/navigation/Routes';
import { DepositSdkResult } from '../../hooks/useDepositSdkMethod';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import { useDepositSDK } from '../../sdk';
import { NativeRampsSdk } from '@consensys/native-ramps-sdk';

const EMAIL = 'test@email.com';

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useDepositSDK: jest.fn().mockReturnValue({
    email: EMAIL,
    setEmail: jest.fn(),
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

const mockUseDepositSdkMethodInitialValues: DepositSdkResult<'success'> = {
  error: null,
  loading: false,
  sdkMethod: jest.fn().mockResolvedValue('Success'),
  response: null,
};

let mockUseDepositSdkMethodValues: DepositSdkResult<'success'> = {
  ...mockUseDepositSdkMethodInitialValues,
};

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
  };
});

jest.mock('../../../Navbar', () => ({
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
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
    };
  });

  it('renders correctly', () => {
    render(OtpCode);
    expect(
      screen.getByText(
        `Enter the 6-digit code we sent to ${EMAIL}. If you don't see it in your inbox, check your spam folder.`,
      ),
    ).toBeTruthy();
  });

  it('calls setOptions when the component mounts', () => {
    render(OtpCode);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter six-digit code',
      }),
    );
  });

  it('displays loading state', async () => {
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
      loading: true,
    };
    render(OtpCode);
    expect(screen.getByText('Verifying code...')).toBeTruthy();
  });

  it('navigates to next screen on submit button press when valid code is entered', async () => {
    const mockResponse = 'success';
    const mockSetAuthToken = jest.fn().mockResolvedValue(undefined);
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
      sdkMethod: jest.fn().mockResolvedValue(mockResponse),
      response: mockResponse,
    };

    jest.mocked(useDepositSDK).mockReturnValue({
      email: EMAIL,
      setEmail: jest.fn(),
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
    });

    const { getByTestId } = render(OtpCode);

    const codeInput = getByTestId('otp-code-input');

    fireEvent.changeText(codeInput, '123456');

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Submit',
      }),
    );

    await waitFor(() => {
      expect(mockUseDepositSdkMethodValues.sdkMethod).toHaveBeenCalled();
      expect(mockSetAuthToken).toHaveBeenCalledWith(mockResponse);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.DEPOSIT.VERIFY_IDENTITY,
        undefined,
      );
    });
  });

  it('displays error message when API call fails', async () => {
    mockUseDepositSdkMethodValues.error = 'Invalid code';
    render(OtpCode);
    expect(screen.getByText('Invalid code')).toBeTruthy();
  });

  it('disables submit button and shows loading state when loading', () => {
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
      loading: true,
    };
    render(OtpCode);
    expect(screen.getByText('Verifying code...')).toBeTruthy();
    const loadingButton = screen.getByRole('button', {
      name: 'Verifying code...',
    });
    fireEvent.press(loadingButton);
    expect(mockUseDepositSdkMethodValues.sdkMethod).not.toHaveBeenCalled();
  });

  it('disables submit button when code length is invalid', () => {
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
      loading: false,
    };
    render(OtpCode);
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.press(submitButton);
    expect(mockUseDepositSdkMethodValues.sdkMethod).not.toHaveBeenCalled();
  });
});
