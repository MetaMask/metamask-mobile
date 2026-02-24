import React from 'react';
import { fireEvent, act, screen } from '@testing-library/react-native';
import OrderContent from './OrderContent';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../../reducers/fiatOrders';
import type { RampsOrder } from '@metamask/ramps-controller';
import Clipboard from '@react-native-clipboard/clipboard';
import InAppBrowser from 'react-native-inappbrowser-reborn';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  getProviderName: jest.fn(() => 'Transak'),
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

const mockRampsOrderData: Partial<RampsOrder> = {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: { id: '/providers/transak', name: 'Transak', links: [] } as any,
};

const mockOrder: FiatOrder = {
  id: '/providers/transak/orders/abc123',
  provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
  createdAt: 1700000000000,
  amount: 100,
  currency: 'USD',
  cryptoAmount: 0.05,
  cryptocurrency: 'ETH',
  fee: 2.5,
  state: FIAT_ORDER_STATES.COMPLETED,
  account: '0x1234',
  network: '1',
  excludeFromPurchases: false,
  orderType: 'BUY',
  data: mockRampsOrderData as RampsOrder,
};

describe('OrderContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderOrder(
    order: FiatOrder,
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

  it('renders loading state when data has no fiatAmount', () => {
    const pendingOrder: FiatOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.PENDING,
      data: {
        ...mockRampsOrderData,
        fiatAmount: undefined,
      } as unknown as RampsOrder,
    };
    renderOrder(pendingOrder);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('copies order ID to clipboard when order ID is tapped', () => {
    renderOrder(mockOrder);
    const copyButton = screen.getByText('..abc123').parent;
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
    renderOrder({ ...mockOrder, state: FIAT_ORDER_STATES.COMPLETED });
    expect(screen.getByText('Complete')).toBeOnTheScreen();
  });

  it('renders failed status', () => {
    renderOrder({ ...mockOrder, state: FIAT_ORDER_STATES.FAILED });
    expect(screen.getByText('Failed')).toBeOnTheScreen();
  });

  it('renders cancelled status', () => {
    renderOrder({ ...mockOrder, state: FIAT_ORDER_STATES.CANCELLED });
    expect(screen.getByText('Cancelled')).toBeOnTheScreen();
  });

  it('renders processing status for pending orders', () => {
    renderOrder({ ...mockOrder, state: FIAT_ORDER_STATES.PENDING });
    expect(screen.getByText('Processing')).toBeOnTheScreen();
  });

  it('renders card processing info text', () => {
    renderOrder(mockOrder);
    expect(
      screen.getByText('Card purchases typically take a few minutes'),
    ).toBeOnTheScreen();
  });
});
