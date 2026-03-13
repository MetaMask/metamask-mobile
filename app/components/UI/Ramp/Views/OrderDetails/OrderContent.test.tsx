import React from 'react';
import { fireEvent, act, screen } from '@testing-library/react-native';
import OrderContent from './OrderContent';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import Clipboard from '@react-native-clipboard/clipboard';
import InAppBrowser from 'react-native-inappbrowser-reborn';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({
    uri: 'https://example.com/eth.png',
  })),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(),
  open: jest.fn(),
}));

const mockOrder: RampsOrder = {
  id: '/providers/transak/orders/abc123',
  isOnlyLink: false,
  success: true,
  providerOrderId: 'transak_order_abc123',
  providerOrderLink: 'https://transak.com/order/abc',
  fiatAmount: 100,
  totalFeesFiat: 2.5,
  cryptoAmount: 0.05,
  cryptoCurrency: {
    symbol: 'ETH',
    decimals: 18,
    iconUrl: 'https://example.com/eth.png',
    chainId: 'eip155:1',
  },
  fiatCurrency: { symbol: 'USD', decimals: 2, denomSymbol: '$' },
  statusDescription: 'Card purchases typically take a few minutes',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: { id: '/providers/transak', name: 'Transak', links: [] } as any,
  createdAt: 1700000000000,
  txHash: '',
  walletAddress: '0x1234',
  status: RampsOrderStatus.Completed,
  network: { chainId: '1', name: 'Ethereum' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '',
  orderType: 'BUY',
};

describe('OrderContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderOrder(
    order: RampsOrder,
    props?: { showCloseButton?: boolean },
  ) {
    return renderWithProvider(<OrderContent order={order} {...props} />, {
      state: { engine: { backgroundState } },
    });
  }

  it('renders completed state correctly', () => {
    renderOrder(mockOrder);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders loading state when order has no amount', () => {
    const pendingOrder: RampsOrder = {
      ...mockOrder,
      fiatAmount: 0,
      status: RampsOrderStatus.Pending,
    };
    renderOrder(pendingOrder);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('shows ellipsis for token amount when cryptoAmount is 0 or missing', () => {
    const orderWithZeroCrypto: RampsOrder = {
      ...mockOrder,
      cryptoAmount: 0,
      fiatAmount: 100,
      status: RampsOrderStatus.Pending,
    };
    renderOrder(orderWithZeroCrypto);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('copies order ID to clipboard when order ID is tapped', () => {
    renderOrder(mockOrder);
    const copyButton = screen.getByText('...abc123').parent;
    if (copyButton) {
      fireEvent.press(copyButton);
    }
    expect(Clipboard.setString).toHaveBeenCalledWith('transak_order_abc123');
  });

  it('opens provider link with InAppBrowser when available', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);
    (InAppBrowser.open as jest.Mock).mockResolvedValue(undefined);

    renderOrder(mockOrder);
    fireEvent.press(screen.getByText('View on Transak'));

    await act(async () => {
      // wait for async InAppBrowser calls
    });

    expect(InAppBrowser.open).toHaveBeenCalledWith(
      'https://transak.com/order/abc',
    );
  });

  it('falls back to SimpleWebview for provider link when InAppBrowser unavailable', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);

    renderOrder(mockOrder);
    fireEvent.press(screen.getByText('View on Transak'));

    await act(async () => {
      // wait for async calls
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Webview',
      expect.objectContaining({ screen: 'SimpleWebview' }),
    );
  });

  it('renders close button when showCloseButton is true', () => {
    renderOrder(mockOrder, { showCloseButton: true });
    expect(screen.getByText('Close')).toBeOnTheScreen();
  });

  it('does not render close button by default', () => {
    renderOrder(mockOrder);
    expect(screen.queryByText('Close')).toBeNull();
  });

  it('renders correct status text for each order state', () => {
    renderOrder({ ...mockOrder, status: RampsOrderStatus.Completed });
    expect(screen.getByText('Complete')).toBeOnTheScreen();
  });

  it('renders failed status', () => {
    renderOrder({ ...mockOrder, status: RampsOrderStatus.Failed });
    expect(screen.getByText('Failed')).toBeOnTheScreen();
  });

  it('renders cancelled status', () => {
    renderOrder({ ...mockOrder, status: RampsOrderStatus.Cancelled });
    expect(screen.getByText('Cancelled')).toBeOnTheScreen();
  });

  it('renders processing status for pending orders', () => {
    renderOrder({ ...mockOrder, status: RampsOrderStatus.Pending });
    expect(screen.getByText('Processing')).toBeOnTheScreen();
  });

  it('renders status description with info icon', () => {
    renderOrder(mockOrder);
    expect(
      screen.getByText('Card purchases typically take a few minutes'),
    ).toBeOnTheScreen();
  });

  it('does not render info row when statusDescription is absent', () => {
    const orderWithoutDescription: RampsOrder = {
      ...mockOrder,
      statusDescription: undefined,
    };
    renderOrder(orderWithoutDescription);
    expect(
      screen.queryByText('Card purchases typically take a few minutes'),
    ).toBeNull();
  });
});
