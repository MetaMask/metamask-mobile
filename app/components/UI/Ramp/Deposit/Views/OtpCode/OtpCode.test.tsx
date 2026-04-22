import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import OtpCode from './OtpCode';
import Routes from '../../../../../../constants/navigation/Routes';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { trace } from '../../../../../../util/trace';

jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(),
}));

const mockGetString = Clipboard.getString as jest.Mock;

const mockEmail = 'test@email.com';

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

const mockUseParams = jest.fn(() => ({
  email: mockEmail,
  stateToken: 'mock-state-token',
  redirectToRootAfterAuth: false,
}));

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockUseDepositSdkMethodInitialState = {
  data: null,
  error: null,
  isFetching: false,
};

const mockAccessTokenResponse: NativeTransakAccessToken = {
  accessToken: 'mock-access-token',
  ttl: 3600,
  created: new Date('2024-01-01'),
};

const mockVerifyUserOtp = jest.fn().mockResolvedValue(mockAccessTokenResponse);
const mockSendUserOtp = jest.fn().mockResolvedValue({
  stateToken: 'new-mock-state-token',
  isTncAccepted: false,
  email: mockEmail,
  expiresIn: 300,
});

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
    mockGetString.mockResolvedValue('');
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

    await act(async () => {
      fireEvent.press(resendButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Error resending code.')).toBeOnTheScreen();
    });

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to build quote when valid code is input', async () => {
    const mockTokenResponse: NativeTransakAccessToken = {
      accessToken: 'mock-access-token-123',
      ttl: 1000,
      created: new Date('2024-01-01'),
    };

    mockVerifyUserOtp.mockResolvedValue(mockTokenResponse);
    mockSetAuthToken.mockResolvedValue(undefined);
    const { getByTestId } = render(OtpCode);
    act(() => {
      const codeInput = getByTestId('otp-code-input');
      fireEvent.changeText(codeInput, '123456');
    });
    await waitFor(() => {
      expect(mockVerifyUserOtp).toHaveBeenCalled();
      expect(mockSetAuthToken).toHaveBeenCalledWith(mockTokenResponse);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.BUILD_QUOTE, {
        shouldRouteImmediately: true,
      });
    });
  });

  it('tracks analytics event when OTP is successfully confirmed', async () => {
    const mockTokenResponse: NativeTransakAccessToken = {
      accessToken: 'mock-access-token-456',
      ttl: 1000,
      created: new Date('2024-01-01'),
    };

    mockVerifyUserOtp.mockResolvedValue(mockTokenResponse);
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

    const mockTokenResponse: NativeTransakAccessToken = {
      accessToken: 'mock-access-token-789',
      ttl: 1000,
      created: new Date('2024-01-01'),
    };

    mockVerifyUserOtp.mockResolvedValue(mockTokenResponse);
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

  it('shows error when resend response missing stateToken', async () => {
    mockSendUserOtp.mockResolvedValue({
      isTncAccepted: false,
      email: mockEmail,
      expiresIn: 300,
      // stateToken missing
    });
    render(OtpCode);
    const resendButton = screen.getByText('Resend it');
    fireEvent.press(resendButton);
    await waitFor(() => {
      expect(screen.getByText('Contact support')).toBeOnTheScreen();
    });
  });

  describe('when redirectToRootAfterAuth is true', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({
        email: mockEmail,
        stateToken: 'mock-state-token',
        redirectToRootAfterAuth: true,
      });
    });

    it('navigates to root when redirectToRootAfterAuth is true', async () => {
      const mockTokenResponse: NativeTransakAccessToken = {
        accessToken: 'mock-access-token-root',
        ttl: 1000,
        created: new Date('2024-01-01'),
      };

      mockVerifyUserOtp.mockResolvedValue(mockTokenResponse);
      mockSetAuthToken.mockResolvedValue(undefined);
      const { getByTestId } = render(OtpCode);
      act(() => {
        const codeInput = getByTestId('otp-code-input');
        fireEvent.changeText(codeInput, '123456');
      });
      await waitFor(() => {
        expect(mockVerifyUserOtp).toHaveBeenCalled();
        expect(mockSetAuthToken).toHaveBeenCalledWith(mockTokenResponse);
        expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ROOT);
      });
    });
  });

  describe('paste functionality', () => {
    it('renders paste button', () => {
      const { getByTestId } = render(OtpCode);

      const pasteButton = getByTestId('otp-code-paste-button');

      expect(pasteButton).toBeOnTheScreen();
    });

    it('reads from clipboard when paste button is pressed', async () => {
      mockGetString.mockResolvedValue('123456');
      const { getByTestId } = render(OtpCode);
      const pasteButton = getByTestId('otp-code-paste-button');

      await act(async () => {
        fireEvent.press(pasteButton);
      });

      expect(mockGetString).toHaveBeenCalled();
    });

    it('extracts only numeric characters from clipboard content', async () => {
      mockGetString.mockResolvedValue('abc123def456');
      const { getByTestId } = render(OtpCode);
      const pasteButton = getByTestId('otp-code-paste-button');

      await act(async () => {
        fireEvent.press(pasteButton);
      });

      const codeInput = getByTestId('otp-code-input');
      expect(codeInput.props.value).toBe('123456');
    });

    it('limits pasted content to 6 digits', async () => {
      mockGetString.mockResolvedValue('123456789');
      const { getByTestId } = render(OtpCode);
      const pasteButton = getByTestId('otp-code-paste-button');

      await act(async () => {
        fireEvent.press(pasteButton);
      });

      const codeInput = getByTestId('otp-code-input');
      expect(codeInput.props.value).toBe('123456');
    });

    it('does not update value when clipboard content has no numeric characters', async () => {
      mockGetString.mockResolvedValue('abcdef');
      const { getByTestId } = render(OtpCode);
      const pasteButton = getByTestId('otp-code-paste-button');

      await act(async () => {
        fireEvent.press(pasteButton);
      });

      const codeInput = getByTestId('otp-code-input');
      expect(codeInput.props.value).toBe('');
    });

    it('overwrites existing input when paste button is pressed', async () => {
      mockGetString.mockResolvedValue('654321');
      const { getByTestId } = render(OtpCode);
      const codeInput = getByTestId('otp-code-input');

      act(() => {
        fireEvent.changeText(codeInput, '123');
      });

      const pasteButton = getByTestId('otp-code-paste-button');
      await act(async () => {
        fireEvent.press(pasteButton);
      });

      expect(codeInput.props.value).toBe('654321');
    });

    it('triggers auto-submit when pasting 6 digits', async () => {
      const mockTokenResponse: NativeTransakAccessToken = {
        accessToken: 'mock-access-token-paste',
        ttl: 1000,
        created: new Date('2024-01-01'),
      };
      mockVerifyUserOtp.mockResolvedValue(mockTokenResponse);
      mockSetAuthToken.mockResolvedValue(undefined);
      mockGetString.mockResolvedValue('123456');
      const { getByTestId } = render(OtpCode);
      const pasteButton = getByTestId('otp-code-paste-button');

      await act(async () => {
        fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        expect(mockVerifyUserOtp).toHaveBeenCalled();
      });
    });
  });
});
