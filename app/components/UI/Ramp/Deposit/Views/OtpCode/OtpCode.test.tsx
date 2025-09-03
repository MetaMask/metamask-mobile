import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import OtpCode from './OtpCode';
import Routes from '../../../../../../constants/navigation/Routes';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { trace } from '../../../../../../util/trace';

const EMAIL = 'test@email.com';

const mockTrackEvent = jest.fn();

const mockSetAuthToken = jest.fn();

jest.mock('../../sdk', () => ({
  useDepositSDK: () => ({
    setAuthToken: mockSetAuthToken,
    selectedWalletAddress: '0x1234567890abcdef',
    selectedRegion: { isoCode: 'US' },
  }),
}));

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => ({
    email: EMAIL,
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

const mockVerifyUserOtp = jest.fn().mockResolvedValue('Success');
const mockSendUserOtp = jest.fn().mockResolvedValue('Success');

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn((config) => {
    if (config.method === 'verifyUserOtp') {
      return [mockUseDepositSdkMethodInitialState, mockVerifyUserOtp];
    } else if (config.method === 'sendUserOtp') {
      return [mockUseDepositSdkMethodInitialState, mockSendUserOtp];
    }
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

jest.mock('../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Enter six-digit code',
  }),
}));

jest.mock('../../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.OTP_CODE,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('OtpCode Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyUserOtp.mockResolvedValue('Success');
    mockSendUserOtp.mockResolvedValue('Success');
    mockTrackEvent.mockClear();
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

  it('renders error snapshot when API call fails', async () => {
    mockVerifyUserOtp.mockImplementation(() => {
      throw new Error('API call failed');
    });
    const { getByTestId } = render(OtpCode);
    act(() => {
      const codeInput = getByTestId('otp-code-input');
      fireEvent.changeText(codeInput, '123456');
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('disables submit button when code length is invalid', () => {
    render(OtpCode);
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.press(submitButton);
    expect(mockVerifyUserOtp).not.toHaveBeenCalled();
  });

  it('calls resendOtp when resend link is clicked and properly handles cooldown timer', async () => {
    mockSendUserOtp.mockResolvedValue('success');
    render(OtpCode);
    const resendButton = screen.getByText('Resend it');
    fireEvent.press(resendButton);
    expect(mockSendUserOtp).toHaveBeenCalled();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders cooldown timer snapshot after resending OTP', async () => {
    render(OtpCode);
    const resendButton = screen.getByText('Resend it');
    fireEvent.press(resendButton);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders resend error snapshot when resend fails', async () => {
    mockSendUserOtp.mockRejectedValue(new Error('Failed to resend'));
    render(OtpCode);
    const resendButton = screen.getByText('Resend it');
    fireEvent.press(resendButton);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to build quote when valid code is input', async () => {
    const mockResponse = {
      id: 'mock-id-123',
      ttl: 1000,
      userId: 'mock-user-id',
    } as NativeTransakAccessToken;

    mockVerifyUserOtp.mockResolvedValue(mockResponse);
    mockSetAuthToken.mockResolvedValue(undefined);
    const { getByTestId } = render(OtpCode);
    act(() => {
      const codeInput = getByTestId('otp-code-input');
      fireEvent.changeText(codeInput, '123456');
    });
    await waitFor(() => {
      expect(mockVerifyUserOtp).toHaveBeenCalled();
      expect(mockSetAuthToken).toHaveBeenCalledWith(mockResponse);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.BUILD_QUOTE, {
        shouldRouteImmediately: true,
      });
    });
  });

  it('tracks analytics event when OTP is successfully confirmed', async () => {
    const mockResponse = {
      id: 'mock-id-123',
      ttl: 1000,
      userId: 'mock-user-id',
    } as NativeTransakAccessToken;

    mockVerifyUserOtp.mockResolvedValue(mockResponse);
    mockSetAuthToken.mockResolvedValue(undefined);
    const { getByTestId } = render(OtpCode);
    act(() => {
      const codeInput = getByTestId('otp-code-input');
      fireEvent.changeText(codeInput, '123456');
    });
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_OTP_CONFIRMED', {
        ramp_type: 'DEPOSIT',
        region: 'US',
      });
    });
  });

  it('tracks analytics event when OTP submission fails', async () => {
    mockVerifyUserOtp.mockImplementation(() => {
      throw new Error('API call failed');
    });
    const { getByTestId } = render(OtpCode);
    act(() => {
      const codeInput = getByTestId('otp-code-input');
      fireEvent.changeText(codeInput, '123456');
    });
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_OTP_FAILED', {
        ramp_type: 'DEPOSIT',
        region: 'US',
      });
    });
  });

  it('should call trace when valid OTP code is submitted', async () => {
    const mockTrace = trace as jest.MockedFunction<typeof trace>;
    mockTrace.mockClear();

    const mockResponse = {
      id: 'mock-id-123',
      ttl: 1000,
      userId: 'mock-user-id',
    } as NativeTransakAccessToken;

    mockVerifyUserOtp.mockResolvedValue(mockResponse);
    mockSetAuthToken.mockResolvedValue(undefined);
    const { getByTestId } = render(OtpCode);
    act(() => {
      const codeInput = getByTestId('otp-code-input');
      fireEvent.changeText(codeInput, '123456');
    });

    await waitFor(() => {
      expect(mockTrace).toHaveBeenCalledWith({
        name: 'Deposit Input OTP',
      });
    });
  });
});
