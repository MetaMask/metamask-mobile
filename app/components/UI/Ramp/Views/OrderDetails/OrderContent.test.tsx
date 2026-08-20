import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import OrderContent from './OrderContent';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import Clipboard from '@react-native-clipboard/clipboard';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import imageIcons from '../../../../../images/image-icons';
import { AVATARTOKEN_IMAGE_TESTID } from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken.constants';
import { RampsOrderDetailsSelectorsIDs } from './OrderDetails.testIds';

type RampsOrderWithPaymentDetails = RampsOrder & {
  paymentDetails: {
    fiatCurrency: string;
    paymentMethod: string;
    fields: { name: string; id: string; value: string }[];
  }[];
};

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

// Only `getNetworkImageSource` is stubbed: `toRampsOrderCaipChainId` resolves
// decimal chain ids through the real `getDecimalChainId` from this module.
jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({
    uri: 'https://example.com/eth.png',
  })),
}));

const mockGetNetworkImageSource = jest.requireMock(
  '../../../../../util/networks',
).getNetworkImageSource as jest.Mock;

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

  it('renders completed state with order details', () => {
    renderOrder(mockOrder);
    expect(
      screen.getByTestId(RampsOrderDetailsSelectorsIDs.TOKEN_AMOUNT),
    ).toBeOnTheScreen();
  });

  it('renders pending order without crypto amount', () => {
    const pendingOrder: RampsOrder = {
      ...mockOrder,
      fiatAmount: 0,
      cryptoAmount: 0,
      status: RampsOrderStatus.Pending,
    };
    renderOrder(pendingOrder);
    expect(
      screen.getByTestId(RampsOrderDetailsSelectorsIDs.TOKEN_AMOUNT),
    ).toBeOnTheScreen();
  });

  it('shows placeholder for token amount when cryptoAmount is 0', () => {
    const orderWithZeroCrypto: RampsOrder = {
      ...mockOrder,
      cryptoAmount: 0,
      fiatAmount: 100,
      status: RampsOrderStatus.Pending,
    };
    renderOrder(orderWithZeroCrypto);
    expect(
      screen.getByTestId(RampsOrderDetailsSelectorsIDs.TOKEN_AMOUNT),
    ).toBeOnTheScreen();
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

    await waitFor(() =>
      expect(InAppBrowser.open).toHaveBeenCalledWith(
        'https://transak.com/order/abc',
      ),
    );
  });

  it('falls back to SimpleWebview for provider link when InAppBrowser unavailable', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);

    renderOrder(mockOrder);
    fireEvent.press(screen.getByText('View on Transak'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        'Webview',
        expect.objectContaining({ screen: 'SimpleWebview' }),
      ),
    );
  });

  it('renders close button when showCloseButton is true', () => {
    renderOrder(mockOrder, { showCloseButton: true });
    expect(screen.getByText('Close')).toBeOnTheScreen();
  });

  it('does not render close button by default', () => {
    renderOrder(mockOrder);
    expect(screen.queryByText('Close')).not.toBeOnTheScreen();
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

  it('does not render status description for processing statuses', () => {
    renderOrder({
      ...mockOrder,
      status: RampsOrderStatus.Pending,
      statusDescription: 'Payment block on user card.',
    });

    expect(
      screen.queryByText('Payment block on user card.'),
    ).not.toBeOnTheScreen();
  });

  it('renders status description for terminal statuses', () => {
    renderOrder({
      ...mockOrder,
      status: RampsOrderStatus.Failed,
      statusDescription: 'Payment failed. Please place another order.',
    });

    expect(
      screen.getByText('Payment failed. Please place another order.'),
    ).toBeOnTheScreen();
  });

  it('does not render bank details section when paymentDetails is absent', () => {
    renderOrder(mockOrder);

    expect(screen.queryByText('To complete your order')).not.toBeOnTheScreen();
  });

  it('does not render bank details section when paymentDetails has no matching fields', () => {
    const orderWithPaymentDetails: RampsOrderWithPaymentDetails = {
      ...mockOrder,
      paymentDetails: [
        {
          fiatCurrency: 'USD',
          paymentMethod: 'credit_debit_card',
          fields: [],
        },
      ],
    };

    renderOrder(orderWithPaymentDetails);

    expect(screen.queryByText('To complete your order')).not.toBeOnTheScreen();
  });

  it('renders bank details section when paymentDetails has bank transfer fields', () => {
    const orderWithPaymentDetails: RampsOrderWithPaymentDetails = {
      ...mockOrder,
      paymentDetails: [
        {
          fiatCurrency: 'USD',
          paymentMethod: 'manual_bank_transfer',
          fields: [
            { name: 'Amount', id: 'amount', value: '$100.00' },
            {
              name: 'Routing Number',
              id: 'routingNumber',
              value: '021000021',
            },
            {
              name: 'Account Number',
              id: 'accountNumber',
              value: '1234567890',
            },
          ],
        },
      ],
    };

    renderOrder(orderWithPaymentDetails);

    expect(screen.getByText('To complete your order')).toBeOnTheScreen();
    expect(screen.getByText(/Routing number/i)).toBeOnTheScreen();
    expect(screen.getByText('021000021')).toBeOnTheScreen();
  });

  it('renders bank details section when paymentDetails only includes SEPA fields', () => {
    const orderWithPaymentDetails: RampsOrderWithPaymentDetails = {
      ...mockOrder,
      paymentDetails: [
        {
          fiatCurrency: 'EUR',
          paymentMethod: 'sepa_bank_transfer',
          fields: [
            { name: 'IBAN', id: 'iban', value: 'DE89370400440532013000' },
            { name: 'BIC', id: 'bic', value: 'COBADEFFXXX' },
          ],
        },
      ],
    };

    renderOrder(orderWithPaymentDetails);

    expect(screen.getByText('To complete your order')).toBeOnTheScreen();
    expect(screen.getByText(/^IBAN$/i)).toBeOnTheScreen();
    expect(screen.getByText('DE89370400440532013000')).toBeOnTheScreen();
    expect(screen.getByText(/^BIC$/i)).toBeOnTheScreen();
    expect(screen.getByText('COBADEFFXXX')).toBeOnTheScreen();
  });

  it('truncates long crypto amounts to 5 decimal places', () => {
    const longDecimalOrder: RampsOrder = {
      ...mockOrder,
      cryptoAmount: 0.01588973776561068,
    };
    renderOrder(longDecimalOrder);
    const tokenAmount = screen.getByTestId('ramps-order-details-token-amount');
    expect(tokenAmount.props.children).not.toContain('0.01588973776561068');
    expect(tokenAmount).toHaveTextContent('0.01589 ETH');
  });

  it('uses subscript notation for very small crypto amounts', () => {
    const tinyAmountOrder: RampsOrder = {
      ...mockOrder,
      cryptoAmount: 0.00000614,
    };
    renderOrder(tinyAmountOrder);
    const tokenAmount = screen.getByTestId('ramps-order-details-token-amount');
    // 0.00000614 has 5 leading zeros -> "0.0₅614"
    expect(tokenAmount).toHaveTextContent('0.0₅614 ETH');
  });

  it('shows placeholder when cryptoAmount is missing', () => {
    const noAmountOrder: RampsOrder = {
      ...mockOrder,
      cryptoAmount: undefined as unknown as number,
    };
    renderOrder(noAmountOrder);
    const tokenAmount = screen.getByTestId('ramps-order-details-token-amount');
    expect(tokenAmount).toHaveTextContent('... ETH');
  });

  it('shows placeholder when cryptoAmount is zero', () => {
    const zeroAmountOrder: RampsOrder = {
      ...mockOrder,
      cryptoAmount: 0,
    };
    renderOrder(zeroAmountOrder);
    const tokenAmount = screen.getByTestId('ramps-order-details-token-amount');
    expect(tokenAmount).toHaveTextContent('... ETH');
  });

  it('shows placeholder amounts for terminal orders with no amounts', () => {
    const failedOrder: RampsOrder = {
      ...mockOrder,
      cryptoAmount: 0,
      fiatAmount: 0,
      totalFeesFiat: 0,
      status: RampsOrderStatus.Failed,
    };

    renderOrder(failedOrder);

    expect(screen.getByText('Failed')).toBeOnTheScreen();
    expect(
      screen.getByTestId('ramps-order-details-token-amount'),
    ).toHaveTextContent('... ETH');
    expect(screen.getAllByText('...')).toHaveLength(2);
  });

  describe('token icon and network badge', () => {
    // The V2 orders API is inconsistent about `network`: the declared type is
    // `{ chainId, name }`, but providers such as Sardine send a bare decimal
    // string and Coinbase sends an unparseable network name. The provider
    // `iconUrl` is equally unreliable, pointing at a per-environment host that
    // only resolves in production.
    //
    // Each chain-id case below puts a different chain on every resolver source
    // (network -> cryptoCurrency.chainId -> assetId), so a test can only pass
    // when the branch it names is the one that produced the value.
    const OPTIMISM_CAIP = 'eip155:10';
    const mainnetAssetId =
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const mainnetCdnUrl =
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png';
    const providerIconUrl =
      'https://dev-static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b8.png';

    function renderChainOrder(network: unknown, chainId?: string) {
      renderOrder({
        ...mockOrder,
        network: network as RampsOrder['network'],
        cryptoCurrency: {
          symbol: 'USDC',
          decimals: 6,
          assetId: mainnetAssetId,
          chainId,
          iconUrl: providerIconUrl,
        },
      });
    }

    it('resolves the network badge from the network object', () => {
      renderChainOrder({ chainId: '0x89', name: 'Polygon' }, OPTIMISM_CAIP);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:137',
      });
    });

    it('resolves the network badge when network is a bare decimal string', () => {
      renderChainOrder('137', OPTIMISM_CAIP);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:137',
      });
    });

    it('falls back to cryptoCurrency.chainId when network is an unparseable name', () => {
      renderChainOrder('ethereum', OPTIMISM_CAIP);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: OPTIMISM_CAIP,
      });
    });

    it('falls back to the asset id when network and chainId are missing', () => {
      renderChainOrder(undefined, undefined);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:1',
      });
    });

    it('renders no network badge when no source yields a chain id', () => {
      renderOrder({
        ...mockOrder,
        network: undefined as unknown as RampsOrder['network'],
        cryptoCurrency: { symbol: 'USDC', iconUrl: providerIconUrl },
      });

      expect(mockGetNetworkImageSource).not.toHaveBeenCalled();
    });

    it('prefers the bundled icon over the asset id CDN url for a known symbol', () => {
      renderChainOrder('1', 'eip155:1');

      // `imageIcons` carries a bundled USDC asset, so neither remote url is used.
      expect(screen.getByTestId(AVATARTOKEN_IMAGE_TESTID).props.source).toBe(
        imageIcons.USDC,
      );
    });

    it('renders the token icon from the asset id CDN for an unbundled symbol', () => {
      renderOrder({
        ...mockOrder,
        cryptoCurrency: {
          symbol: 'CROSSMINTTEST',
          decimals: 6,
          assetId: mainnetAssetId,
          chainId: 'eip155:1',
          iconUrl: providerIconUrl,
        },
      });

      expect(
        screen.getByTestId(AVATARTOKEN_IMAGE_TESTID).props.source,
      ).toStrictEqual({ uri: mainnetCdnUrl });
    });

    it('falls back to the provider iconUrl when the order has no asset id', () => {
      renderOrder({
        ...mockOrder,
        cryptoCurrency: {
          symbol: 'XYZ',
          iconUrl: 'https://provider.example/xyz.png',
        },
      });

      expect(
        screen.getByTestId(AVATARTOKEN_IMAGE_TESTID).props.source,
      ).toStrictEqual({ uri: 'https://provider.example/xyz.png' });
    });
  });

  it('does not render info row when statusDescription is absent', () => {
    const orderWithoutDescription: RampsOrder = {
      ...mockOrder,
      statusDescription: undefined,
    };
    renderOrder(orderWithoutDescription);
    expect(
      screen.queryByText('Card purchases typically take a few minutes'),
    ).not.toBeOnTheScreen();
  });
});
