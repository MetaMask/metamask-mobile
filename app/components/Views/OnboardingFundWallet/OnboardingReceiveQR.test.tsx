import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import { CommonActions } from '@react-navigation/native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import OnboardingReceiveQR from './OnboardingReceiveQR';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';

jest.mock('react-native-qrcode-svg', () => 'QRCode');

const mockSetString = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../core/ClipboardManager', () => ({
  setString: (...args: unknown[]) => mockSetString(...args),
}));

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      dispatch: mockDispatch,
    }),
  };
});

const MOCK_PARAMS = {
  tokenSymbol: 'ETH',
  networkName: 'Ethereum Mainnet',
  chainId: 'eip155:1',
  address: '0x1234567890abcdef1234567890abcdef12345678',
};

const renderComponent = (params = MOCK_PARAMS) =>
  renderScreen(
    OnboardingReceiveQR,
    { name: 'OnboardingReceiveQR' },
    { state: {} },
    params,
  );

describe('OnboardingReceiveQR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen with the token symbol in the title', () => {
    renderComponent();

    expect(
      screen.getByTestId('onboarding-receive-qr-screen'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(`Deposit ${MOCK_PARAMS.tokenSymbol}`),
    ).toBeOnTheScreen();
  });

  it('renders the network name in the description', () => {
    renderComponent();

    expect(screen.getByText(MOCK_PARAMS.networkName)).toBeOnTheScreen();
  });

  it('renders a QR code when an address is provided', () => {
    const { UNSAFE_getByType } = renderComponent();

    const qrCode = UNSAFE_getByType(
      'QRCode' as unknown as React.ComponentType<unknown>,
    );
    expect(qrCode.props.value).toBe(MOCK_PARAMS.address);
  });

  it('does not render a QR code when no address is provided', () => {
    const { UNSAFE_queryByType } = renderComponent({
      ...MOCK_PARAMS,
      address: '',
    });

    expect(
      UNSAFE_queryByType('QRCode' as unknown as React.ComponentType<unknown>),
    ).toBeNull();
  });

  it('renders the formatted, truncated address', () => {
    renderComponent();

    expect(screen.getByText(/0x1234/)).toBeOnTheScreen();
  });

  it('copies the full address to the clipboard when the copy button is pressed', async () => {
    renderComponent();

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-receive-qr-copy-button'));
    });

    expect(mockSetString).toHaveBeenCalledWith(MOCK_PARAMS.address);
  });

  it('goes back when the back button is pressed', async () => {
    renderComponent();

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-receive-qr-back'));
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('resets navigation to the onboarding home when Done is pressed', async () => {
    renderComponent();

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-receive-qr-done-button'));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
      }),
    );
  });

  it('renders the Done button label', () => {
    renderComponent();

    expect(
      screen.getByText(strings('onboarding_fund_wallet.done')),
    ).toBeOnTheScreen();
  });
});
