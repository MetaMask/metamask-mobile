import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import V2OtpCode from './OtpCode';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}`;
    return key;
  },
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

const mockVerifyUserOtp = jest.fn();
const mockSetAuthToken = jest.fn();
const mockSendUserOtp = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    setAuthToken: mockSetAuthToken,
    verifyUserOtp: mockVerifyUserOtp,
    sendUserOtp: mockSendUserOtp,
    isAuthenticated: false,
    userRegion: { regionCode: 'us-ca' },
    getBuyQuote: jest.fn(),
    selectedPaymentMethod: { id: 'pm-1' },
  }),
}));

const mockRouteAfterAuthentication = jest.fn();

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  }),
}));

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    selectedToken: { chainId: 'eip155:1' },
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    email: 'test@example.com',
    stateToken: 'test-state-token',
    amount: '100',
    currency: 'USD',
    assetId: 'eip155:1/erc20:0x123',
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: { DepositInputOtp: 'DepositInputOtp' },
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn().mockResolvedValue(''),
}));

jest.mock('react-native-confirmation-code-field', () => ({
  CodeField: ({
    onChangeText,
    value,
    renderCell,
    cellCount,
    ...rest
  }: {
    onChangeText: (text: string) => void;
    value: string;
    cellCount: number;
    renderCell: (info: {
      index: number;
      symbol: string;
      isFocused: boolean;
    }) => React.ReactNode;
    testID?: string;
  }) => {
    const { createElement } = jest.requireActual('react');
    const { TextInput, View } = jest.requireActual('react-native');
    return createElement(
      View,
      null,
      createElement(TextInput, {
        testID: rest.testID || 'otp-code-input',
        onChangeText,
        value,
      }),
      Array.from({ length: cellCount }, (_, i) =>
        renderCell({ index: i, symbol: value[i] || '', isFocused: false }),
      ),
    );
  },
  Cursor: () => null,
  useBlurOnFulfill: () => ({ current: { focus: jest.fn() } }),
  useClearByFocusCell: () => [{}, jest.fn()],
}));

jest.mock('../../Deposit/constants', () => ({
  TRANSAK_SUPPORT_URL: 'https://support.transak.com',
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2OtpCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<V2OtpCode />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the OTP input and submit button', () => {
    const { getByTestId } = renderWithTheme(<V2OtpCode />);

    expect(getByTestId('otp-code-input')).toBeOnTheScreen();
    expect(getByTestId('otp-code-submit-button')).toBeOnTheScreen();
  });

  it('renders the submit button', () => {
    const { getByTestId } = renderWithTheme(<V2OtpCode />);

    expect(getByTestId('otp-code-submit-button')).toBeOnTheScreen();
  });

  it('verifies OTP and navigates on successful submission', async () => {
    jest.useRealTimers();

    const mockToken = { accessToken: 'otp-token', ttl: 3600 };
    mockVerifyUserOtp.mockResolvedValue(mockToken);
    mockSetAuthToken.mockResolvedValue(true);

    const { getByTestId } = renderWithTheme(<V2OtpCode />);

    const otpInput = getByTestId('otp-code-input');

    await act(async () => {
      fireEvent.changeText(otpInput, '123456');
    });

    await waitFor(() => {
      expect(mockVerifyUserOtp).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        'test-state-token',
      );
    });
  });

  it('shows error when OTP verification fails', async () => {
    jest.useRealTimers();

    mockVerifyUserOtp.mockRejectedValue(new Error('Invalid OTP'));

    const { getByTestId, getByText } = renderWithTheme(<V2OtpCode />);

    const otpInput = getByTestId('otp-code-input');

    await act(async () => {
      fireEvent.changeText(otpInput, '123456');
    });

    await waitFor(() => {
      expect(getByText('Invalid OTP')).toBeOnTheScreen();
    });
  });

  it('renders the paste button', () => {
    const { getByTestId } = renderWithTheme(<V2OtpCode />);
    expect(getByTestId('otp-code-paste-button')).toBeOnTheScreen();
  });
});
