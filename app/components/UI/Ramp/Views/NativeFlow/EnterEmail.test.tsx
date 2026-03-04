import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import V2EnterEmail from './EnterEmail';
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
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

const mockSendUserOtp = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    sendUserOtp: mockSendUserOtp,
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    amount: '100',
    currency: 'USD',
    assetId: 'eip155:1/erc20:0x123',
  }),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../Deposit/utils', () => ({
  ...jest.requireActual('../../Deposit/utils'),
  validateEmail: (email: string) => /\S+@\S+\.\S+/.test(email),
  generateThemeParameters: jest.fn(() => ({})),
}));

jest.mock(
  '../../Deposit/components/DepositProgressBar/DepositProgressBar',
  () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => createElement(View, { testID: 'deposit-progress-bar' }),
    };
  },
);

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2EnterEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<V2EnterEmail />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the email input and submit button', () => {
    const { getByPlaceholderText } = renderWithTheme(<V2EnterEmail />);
    expect(
      getByPlaceholderText('deposit.enter_email.input_placeholder'),
    ).toBeOnTheScreen();
  });

  it('submits email and navigates to OTP code screen', async () => {
    mockSendUserOtp.mockResolvedValue({
      stateToken: 'test-state-token',
      isTncAccepted: true,
      email: 'test@example.com',
      expiresIn: 300,
    });

    const { getByPlaceholderText, getByText } = renderWithTheme(
      <V2EnterEmail />,
    );

    const emailInput = getByPlaceholderText(
      'deposit.enter_email.input_placeholder',
    );
    fireEvent.changeText(emailInput, 'test@example.com');

    await act(async () => {
      fireEvent.press(getByText('deposit.enter_email.submit_button'));
    });

    await waitFor(() => {
      expect(mockSendUserOtp).toHaveBeenCalledWith('test@example.com');
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('shows validation error for invalid email', async () => {
    const { getByPlaceholderText, getByText, queryByText } = renderWithTheme(
      <V2EnterEmail />,
    );

    const emailInput = getByPlaceholderText(
      'deposit.enter_email.input_placeholder',
    );
    fireEvent.changeText(emailInput, 'invalid-email');

    await act(async () => {
      fireEvent.press(getByText('deposit.enter_email.submit_button'));
    });

    expect(
      queryByText('deposit.enter_email.validation_error'),
    ).toBeOnTheScreen();
    expect(mockSendUserOtp).not.toHaveBeenCalled();
  });

  it('shows error message when sendUserOtp fails', async () => {
    mockSendUserOtp.mockRejectedValue(new Error('Network error'));

    const { getByPlaceholderText, getByText, queryByText } = renderWithTheme(
      <V2EnterEmail />,
    );

    const emailInput = getByPlaceholderText(
      'deposit.enter_email.input_placeholder',
    );
    fireEvent.changeText(emailInput, 'test@example.com');

    await act(async () => {
      fireEvent.press(getByText('deposit.enter_email.submit_button'));
    });

    await waitFor(() => {
      expect(queryByText('Network error')).toBeOnTheScreen();
    });
  });
});
