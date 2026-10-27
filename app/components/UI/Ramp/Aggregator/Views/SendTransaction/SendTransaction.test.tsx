import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { SellOrder } from '@consensys/on-ramp-sdk/dist/API';
import { FiatOrder } from '../../../../../../reducers/fiatOrders';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  renderScreen,
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

import { addTransaction } from '../../../../../../util/transaction-controller';
import { sendMultichainTransactionForReview } from '../../../../../Views/confirmations/utils/multichain-snaps';
import { validateTronTransferAmount } from '../../../../../../core/Multichain/tron';
import { getMemoizedInternalAccountByAddress } from '../../../../../../selectors/accountsController';
import SendTransaction from './SendTransaction';
import APP_CONSTANTS from '../../../../../../core/AppConstants';
const { ACH_LIGHT, ACH_DARK } = APP_CONSTANTS.URLS.ICONS;

const mockOrder = {
  id: 'test-id-1',
  provider: 'AGGREGATOR',
  createdAt: 1673886669608,
  amount: 0,
  fee: 9,
  cryptoAmount: '0.012361263',
  cryptoFee: 9,
  currency: 'USD',
  currencySymbol: '$',
  cryptocurrency: 'ETH',
  state: 'CREATED',
  account: '0x1234',
  network: '1',
  excludeFromPurchases: false,
  orderType: 'SELL',
  errorCount: 0,
  lastTimeFetched: 1673886669600,
  data: {
    id: 'test-id-1',
    providerOrderId: 'test-id-1',
    canBeUpdated: false,
    idHasExpired: false,
    success: false,
    isOnlyLink: false,
    paymentMethod: {
      id: '/payments/instant-bank-transfer',
      paymentType: 'bank-transfer',
      name: 'Instant Bank Transfer',
      score: 5,
      icons: [
        {
          type: 'materialCommunityIcons',
          name: 'bank',
        },
      ],
      logo: {
        light: [ACH_LIGHT],
        dark: [ACH_DARK],
      },
      delay: [0, 0],
      amountTier: [3, 3],
      supportedCurrency: ['/currencies/fiat/usd'],
      translation: 'ACH',
    },
    provider: {
      id: '/providers/test-staging',
      name: 'Test (Staging)',
      description: 'Per Test: test provider',
      hqAddress: '1234 Test St, Test, TS 12345',
      links: [
        {
          name: 'Homepage',
          url: 'https://test.provider/',
        },
        {
          name: 'Terms of service',
          url: 'https://test.provider/terms',
        },
      ],
      logos: {
        light:
          'https://on-ramp.dev-api.cx.metamask.io/assets/providers/test_light.png',
        dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/test_dark.png',
        height: 24,
        width: 65,
      },
    },
    createdAt: 1673886669608,
    fiatAmount: 0,
    totalFeesFiat: 9,
    cryptoAmount: '0.012361263',
    cryptoCurrency: {
      id: '/currencies/crypto/1/eth',
      idv2: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      network: {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
    },
    fiatCurrency: {
      symbol: 'USD',
      denomSymbol: '$',
      decimals: 2,
    },
    network: '1',
    status: 'CREATED',
    orderType: 'SELL',
    walletAddress: '0x1234',
    txHash: undefined,
    excludeFromPurchases: false,
    depositWallet: '0x34256',
  } as DeepPartial<SellOrder>,
} as FiatOrder;

const mockOrder2 = {
  id: 'test-id-2',
  provider: 'AGGREGATOR',
  createdAt: 1673886669608,
  amount: 0,
  fee: 9,
  cryptoAmount: '0.0123456',
  cryptoFee: 9,
  currency: 'USD',
  currencySymbol: '$',
  cryptocurrency: 'USDC',
  state: 'CREATED',
  account: '0x1234',
  network: '1',
  excludeFromPurchases: false,
  orderType: 'SELL',
  errorCount: 0,
  lastTimeFetched: 1673886669600,
  data: {
    id: 'test-id-2',
    providerOrderId: 'test-id-2',
    canBeUpdated: false,
    idHasExpired: false,
    success: false,
    isOnlyLink: false,
    paymentMethod: {
      id: '/payments/instant-bank-transfer',
      paymentType: 'bank-transfer',
      name: 'Instant Bank Transfer',
      score: 5,
      icons: [
        {
          type: 'materialCommunityIcons',
          name: 'bank',
        },
      ],
      logo: {
        light: [ACH_LIGHT],
        dark: [ACH_DARK],
      },
      delay: [0, 0],
      amountTier: [3, 3],
      supportedCurrency: ['/currencies/fiat/usd'],
      translation: 'ACH',
    },
    provider: {
      id: '/providers/test-staging',
      name: 'Test (Staging)',
      description: 'Per Test: test provider',
      hqAddress: '1234 Test St, Test, TS 12345',
      links: [
        {
          name: 'Homepage',
          url: 'https://test.provider/',
        },
        {
          name: 'Terms of service',
          url: 'https://test.provider/terms',
        },
      ],
      logos: {
        light:
          'https://on-ramp.dev-api.cx.metamask.io/assets/providers/test_light.png',
        dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/test_dark.png',
        height: 24,
        width: 65,
      },
    },
    createdAt: 1673886669608,
    fiatAmount: 0,
    totalFeesFiat: 9,
    cryptoAmount: '0.012361263',
    cryptoCurrency: {
      id: '/currencies/crypto/1/usdc',
      idv2: '/currencies/crypto/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      network: {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/usdc.png',
      decimals: 18,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      name: 'USD Coin',
    },
    fiatCurrency: {
      symbol: 'USD',
      denomSymbol: '$',
      decimals: 2,
    },
    network: '1',
    status: 'CREATED',
    orderType: 'SELL',
    walletAddress: '0x1234',
    txHash: undefined,
    excludeFromPurchases: false,
    depositWallet: '0x34256',
  } as DeepPartial<SellOrder>,
} as FiatOrder;

const mockOrder3 = {
  ...mockOrder2,
  id: 'test-id-3',
  data: {
    ...mockOrder2.data,
    paymentMethod: {
      id: '/payments/instant-bank-transfer',
      paymentType: 'bank-transfer',
      name: 'Instant Bank Transfer',
      score: 5,
      icons: [
        {
          type: 'materialCommunityIcons',
          name: 'bank',
        },
      ],
      logo: {
        light: [ACH_LIGHT],
        dark: [ACH_DARK],
      },
      delay: [0, 0],
      amountTier: [3, 3],
      supportedCurrency: ['/currencies/fiat/usd'],
      translation: 'ACH',
      customAction: {
        button: {
          dark: [{ value: 'sample value' }],
          light: [{ value: 'sample value' }],
        },
      },
    },
  } as DeepPartial<SellOrder>,
} as FiatOrder;

const SOLANA_WALLET_ADDRESS = '7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv';
const SOLANA_DEPOSIT_ADDRESS = 'HToZyUbXz2Vp8b6kY3p8qXxLnQ4F2u2pP5pUz6m9ELDR';

const mockSolanaAccount = {
  id: 'solana-account-id',
  address: SOLANA_WALLET_ADDRESS,
  type: 'solana:data-account',
  metadata: {
    name: 'Solana Account',
    snap: { id: 'npm:@metamask/solana-wallet-snap' },
  },
};

const mockSolanaOrder = {
  ...mockOrder,
  id: 'test-id-solana',
  cryptocurrency: 'SOL',
  network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  account: SOLANA_WALLET_ADDRESS,
  cryptoAmount: '1.5',
  data: {
    ...mockOrder.data,
    id: 'test-id-solana',
    providerOrderId: 'test-id-solana',
    cryptoAmount: '1.5',
    cryptoCurrency: {
      id: '/currencies/crypto/solana/sol',
      network: {
        active: true,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        chainName: 'Solana',
        shortName: 'Solana',
      },
      logo: 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/solana.svg',
      decimals: 9,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'SOL',
      name: 'Solana',
      assetId: 'slip44:501',
    },
    network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    walletAddress: SOLANA_WALLET_ADDRESS,
    depositWallet: SOLANA_DEPOSIT_ADDRESS,
  } as DeepPartial<SellOrder>,
} as FiatOrder;

const TRON_WALLET_ADDRESS = 'TJRabPrwbZy45sbavfcjinPJC18kjpRTv8';
const TRON_DEPOSIT_ADDRESS = 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE';

const mockTronAccount = {
  id: 'tron-account-id',
  address: TRON_WALLET_ADDRESS,
  type: 'tron:eoa',
  metadata: {
    name: 'Tron Account',
    snap: { id: 'npm:@metamask/tron-wallet-snap' },
  },
};

const mockTronOrder = {
  ...mockOrder,
  id: 'test-id-tron',
  cryptocurrency: 'TRX',
  network: 'tron:728126428',
  account: TRON_WALLET_ADDRESS,
  cryptoAmount: '42',
  data: {
    ...mockOrder.data,
    id: 'test-id-tron',
    providerOrderId: 'test-id-tron',
    cryptoAmount: '42',
    cryptoCurrency: {
      id: '/currencies/crypto/tron/trx',
      network: {
        active: true,
        chainId: 'tron:728126428',
        chainName: 'Tron',
        shortName: 'Tron',
      },
      logo: 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/tron.svg',
      decimals: 6,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'TRX',
      name: 'Tron',
      assetId: 'slip44:195',
    },
    network: 'tron:728126428',
    walletAddress: TRON_WALLET_ADDRESS,
    depositWallet: TRON_DEPOSIT_ADDRESS,
  } as DeepPartial<SellOrder>,
} as FiatOrder;

const TRON_USDT_ASSET_REFERENCE = 'trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const mockTronUsdtOrder = {
  ...mockTronOrder,
  id: 'test-id-tron-usdt',
  cryptocurrency: 'USDT',
  cryptoAmount: '100',
  data: {
    ...mockTronOrder.data,
    id: 'test-id-tron-usdt',
    providerOrderId: 'test-id-tron-usdt',
    cryptoAmount: '100',
    cryptoCurrency: {
      ...(mockTronOrder.data as SellOrder).cryptoCurrency,
      id: '/currencies/crypto/tron/usdt',
      logo: 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/usdt.svg',
      address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      symbol: 'USDT',
      name: 'Tether USD',
      assetId: TRON_USDT_ASSET_REFERENCE,
    },
  } as DeepPartial<SellOrder>,
} as FiatOrder;

const STELLAR_WALLET_ADDRESS =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const mockStellarAccount = {
  id: 'stellar-account-id',
  address: STELLAR_WALLET_ADDRESS,
  type: 'stellar:account',
  metadata: {
    name: 'Stellar Account',
    snap: { id: 'npm:@metamask/stellar-wallet-snap' },
  },
};

const mockStellarOrder = {
  ...mockOrder,
  id: 'test-id-stellar',
  cryptocurrency: 'XLM',
  network: 'stellar:pubnet',
  account: STELLAR_WALLET_ADDRESS,
  cryptoAmount: '1.5',
  data: {
    ...mockOrder.data,
    id: 'test-id-stellar',
    providerOrderId: 'test-id-stellar',
    cryptoAmount: '1.5',
    cryptoCurrency: {
      id: '/currencies/crypto/stellar/xlm',
      network: {
        active: true,
        chainId: 'stellar:pubnet',
        chainName: 'Stellar',
        shortName: 'Stellar',
      },
      decimals: 7,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'XLM',
      name: 'Stellar',
      assetId: 'slip44:148',
    },
    network: 'stellar:pubnet',
    walletAddress: STELLAR_WALLET_ADDRESS,
  } as DeepPartial<SellOrder>,
} as FiatOrder;

const mockedOrders = [
  mockOrder,
  mockOrder2,
  mockOrder3,
  mockSolanaOrder,
  mockTronOrder,
  mockTronUsdtOrder,
  mockStellarOrder,
];

function render(Component: React.ComponentType, orders = mockedOrders) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.SEND_TRANSACTION,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
        fiatOrders: {
          orders,
        },
      },
    },
  );
}

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddTransaction = addTransaction as jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
      getParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

let mockUseParamsValues: {
  orderId?: string;
} = {
  orderId: 'test-id-1',
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock('../../../../../../util/transaction-controller', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../../util/transaction-controller'),
  addTransaction: jest.fn(),
}));

jest.mock('../../../../../Views/confirmations/utils/multichain-snaps', () => ({
  sendMultichainTransactionForReview: jest.fn(),
}));

jest.mock('../../../../../../core/Multichain/tron', () => ({
  validateTronTransferAmount: jest.fn(),
}));

jest.mock('../../../../../../selectors/accountsController', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../../selectors/accountsController'),
  getMemoizedInternalAccountByAddress: jest.fn(),
}));

const mockSendMultichainTransactionForReview =
  sendMultichainTransactionForReview as jest.Mock;
const mockValidateTronTransferAmount = validateTronTransferAmount as jest.Mock;
const mockGetInternalAccountByAddress =
  getMemoizedInternalAccountByAddress as unknown as jest.Mock;

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

describe('SendTransaction View', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockReset.mockClear();
    mockPop.mockClear();
    mockDispatch.mockClear();
    mockTrackEvent.mockClear();
    mockAddTransaction.mockClear();
    mockSendMultichainTransactionForReview.mockClear();
    mockValidateTronTransferAmount.mockReset();
    mockGetInternalAccountByAddress.mockReset();
  });

  beforeEach(() => {
    mockUseParamsValues = {
      orderId: 'test-id-1',
    };
    mockValidateTronTransferAmount.mockResolvedValue({
      valid: true,
      errors: [],
    });
    // Default: no resolvable non-EVM account (EVM tests don't read it).
    mockGetInternalAccountByAddress.mockReturnValue(undefined);
  });

  it('shows header with back navigation when order data has no cryptoCurrency', async () => {
    const orderWithoutCrypto = {
      ...mockOrder,
      id: 'test-id-no-crypto',
      data: {
        ...mockOrder.data,
        cryptoCurrency: undefined,
      } as DeepPartial<SellOrder>,
    } as FiatOrder;

    mockUseParamsValues = { orderId: 'test-id-no-crypto' };
    render(SendTransaction, [orderWithoutCrypto]);
    expect(screen.getByText('Sell crypto')).toBeOnTheScreen();
    expect(screen.queryByText('Next')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('send-transaction-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows header with back navigation when order is missing', async () => {
    mockUseParamsValues = { orderId: 'invalid-order-id' };
    render(SendTransaction);
    expect(screen.getByText('Sell crypto')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('send-transaction-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates back when header back button is pressed', async () => {
    render(SendTransaction);
    fireEvent.press(screen.getByTestId('send-transaction-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders correctly', async () => {
    render(SendTransaction);
    expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen();
  });

  it('calls analytics when rendering', async () => {
    render(SendTransaction);
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED",
        {
          "chain_id_source": "1",
          "crypto_amount": "0.012361263",
          "currency_destination": "USD",
          "currency_source": "ETH",
          "fiat_out": 0,
          "order_id": "test-id-1",
          "payment_method_id": "/payments/instant-bank-transfer",
          "provider_offramp": "Test (Staging)",
        },
      ]
    `);
  });

  it('renders correctly for token', async () => {
    mockUseParamsValues = { orderId: 'test-id-2' };
    render(SendTransaction);
    expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen();
    expect(screen.getByText('USDC')).toBeOnTheScreen();
  });

  it('renders correctly for custom action payment method', async () => {
    mockUseParamsValues = { orderId: 'test-id-3' };
    render(SendTransaction);
    expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen();
  });

  it('calls addTransaction for native coin when clicking on send button', async () => {
    render(SendTransaction);
    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.press(nextButton);
    expect(mockAddTransaction).toBeCalledTimes(1);
    expect(mockAddTransaction.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "chainId": "0x1",
            "from": "0x1234",
            "to": "0x34256",
            "value": "0x2bea80d2171600",
          },
          {
            "deviceConfirmedOn": "metamask_mobile",
            "isInternal": true,
            "networkClientId": "mainnet",
            "origin": "RAMPS_SEND",
          },
        ],
      ]
    `);
  });

  it('calls analytics when clicking on send button', async () => {
    render(SendTransaction);
    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.press(nextButton);
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_SEND_TRANSACTION_INVOKED",
        {
          "chain_id_source": "1",
          "crypto_amount": "0.012361263",
          "currency_destination": "USD",
          "currency_source": "ETH",
          "fiat_out": 0,
          "order_id": "test-id-1",
          "payment_method_id": "/payments/instant-bank-transfer",
          "provider_offramp": "Test (Staging)",
        },
      ]
    `);
  });

  it('calls addTransaction for erc20 when clicking on send button', async () => {
    mockUseParamsValues = { orderId: 'test-id-2' };
    render(SendTransaction);
    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.press(nextButton);
    expect(mockAddTransaction).toBeCalledTimes(1);
    expect(mockAddTransaction.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "data": "0xa9059cbb0000000000000000000000000000000000000000000000000000000000034256000000000000000000000000000000000000000000000000002bea80d2171600",
            "from": "0x1234",
            "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            "value": "0x0",
          },
          {
            "deviceConfirmedOn": "metamask_mobile",
            "isInternal": true,
            "networkClientId": "mainnet",
            "origin": "RAMPS_SEND",
          },
        ],
      ]
    `);
  });

  it('calls analytics and redirects when the transaction is confirmed ', async () => {
    render(SendTransaction);
    const nextButton = screen.getByRole('button', { name: 'Next' });
    mockAddTransaction.mockImplementationOnce(() => ({
      result: Promise.resolve('0x987654321'),
    }));

    await act(async () => fireEvent.press(nextButton));
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_SEND_TRANSACTION_CONFIRMED",
        {
          "chain_id_source": "1",
          "crypto_amount": "0.012361263",
          "currency_destination": "USD",
          "currency_source": "ETH",
          "fiat_out": 0,
          "order_id": "test-id-1",
          "payment_method_id": "/payments/instant-bank-transfer",
          "provider_offramp": "Test (Staging)",
        },
      ]
    `);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('dispatches setFiatSellTxHash after getting hash from addTransaction', async () => {
    render(SendTransaction);
    const nextButton = screen.getByRole('button', { name: 'Next' });
    mockAddTransaction.mockImplementationOnce(() => ({
      result: Promise.resolve('0x987654321'),
    }));

    await act(async () => fireEvent.press(nextButton));
    expect(mockDispatch).toBeCalledTimes(1);
    expect(mockDispatch.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "payload": {
              "orderId": "test-id-1",
              "txHash": "0x987654321",
            },
            "type": "FIAT_SET_SELL_TX_HASH",
          },
        ],
      ]
    `);
  });

  it('calls analytics when the transaction is rejected', async () => {
    render(SendTransaction);
    const nextButton = screen.getByRole('button', { name: 'Next' });
    mockAddTransaction.mockImplementationOnce(() => ({
      result: Promise.reject(new Error('Transaction rejected')),
    }));

    await act(async () => fireEvent.press(nextButton));
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_SEND_TRANSACTION_REJECTED",
        {
          "chain_id_source": "1",
          "crypto_amount": "0.012361263",
          "currency_destination": "USD",
          "currency_source": "ETH",
          "fiat_out": 0,
          "order_id": "test-id-1",
          "payment_method_id": "/payments/instant-bank-transfer",
          "provider_offramp": "Test (Staging)",
        },
      ]
    `);
  });

  describe('transactionAnalyticsPayload with partial order data', () => {
    it('handles missing cryptoCurrency gracefully in analytics', async () => {
      const partialOrder = {
        ...mockOrder,
        id: 'test-partial-crypto',
        data: {
          ...mockOrder.data,
          cryptoCurrency: undefined,
        } as DeepPartial<SellOrder>,
      } as FiatOrder;

      mockUseParamsValues = { orderId: 'test-partial-crypto' };
      render(SendTransaction, [partialOrder]);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED',
        expect.objectContaining({
          chain_id_source: undefined,
          currency_source: undefined,
          crypto_amount: '0.012361263',
          order_id: 'test-partial-crypto',
        }),
      );
    });

    it('handles missing cryptoCurrency.network gracefully in analytics and does not invoke send', async () => {
      const partialOrder = {
        ...mockOrder,
        id: 'test-partial-network',
        data: {
          ...mockOrder.data,
          cryptoCurrency: {
            ...(mockOrder.data as DeepPartial<SellOrder>).cryptoCurrency,
            network: undefined,
          },
        } as DeepPartial<SellOrder>,
      } as FiatOrder;

      mockUseParamsValues = { orderId: 'test-partial-network' };
      render(SendTransaction, [partialOrder]);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED',
        expect.objectContaining({
          chain_id_source: undefined,
          currency_source: 'ETH',
          currency_destination: 'USD',
          payment_method_id: '/payments/instant-bank-transfer',
          provider_offramp: 'Test (Staging)',
        }),
      );

      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));
      expect(mockAddTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Non-EVM (Solana) send', () => {
    beforeEach(() => {
      mockUseParamsValues = { orderId: 'test-id-solana' };
      mockGetInternalAccountByAddress.mockReturnValue(mockSolanaAccount);
    });

    it('sends via the Snap and stores the returned transaction id', async () => {
      mockSendMultichainTransactionForReview.mockResolvedValueOnce({
        transactionId: 'solana-signature-123',
      });

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockAddTransaction).not.toHaveBeenCalled();
      expect(mockSendMultichainTransactionForReview).toHaveBeenCalledWith(
        mockSolanaAccount,
        {
          fromAccountId: mockSolanaAccount.id,
          toAddress: SOLANA_DEPOSIT_ADDRESS,
          assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          amount: '1.5',
        },
      );
      expect(mockDispatch.mock.calls).toMatchInlineSnapshot(`
        [
          [
            {
              "payload": {
                "orderId": "test-id-solana",
                "txHash": "solana-signature-123",
              },
              "type": "FIAT_SET_SELL_TX_HASH",
            },
          ],
        ]
      `);
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockTrackEvent.mock.lastCall?.[0]).toBe(
        'OFFRAMP_SEND_TRANSACTION_CONFIRMED',
      );
    });

    it('leaves the screen without storing a hash when the Snap succeeds without a transaction id', async () => {
      mockSendMultichainTransactionForReview.mockResolvedValueOnce({
        valid: true,
      });

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockTrackEvent.mock.lastCall?.[0]).toBe(
        'OFFRAMP_SEND_TRANSACTION_CONFIRMED',
      );
    });

    it('tracks rejected and stays when the Snap rejects the transfer', async () => {
      mockSendMultichainTransactionForReview.mockResolvedValueOnce({
        valid: false,
        errors: [{ code: 'rejected' }],
      });

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockTrackEvent.mock.lastCall?.[0]).toBe(
        'OFFRAMP_SEND_TRANSACTION_REJECTED',
      );
    });

    it('sends a Tron order via the same Snap path', async () => {
      mockUseParamsValues = { orderId: 'test-id-tron' };
      mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
      mockSendMultichainTransactionForReview.mockResolvedValueOnce({
        transactionId: 'tron-tx-hash-456',
      });

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockAddTransaction).not.toHaveBeenCalled();
      expect(mockValidateTronTransferAmount).toHaveBeenCalledWith(
        mockTronAccount,
        {
          accountId: mockTronAccount.id,
          assetId: 'tron:728126428/slip44:195',
          value: '42',
          toAddress: TRON_DEPOSIT_ADDRESS,
        },
      );
      expect(mockSendMultichainTransactionForReview).toHaveBeenCalledWith(
        mockTronAccount,
        {
          fromAccountId: mockTronAccount.id,
          toAddress: TRON_DEPOSIT_ADDRESS,
          assetId: 'tron:728126428/slip44:195',
          amount: '42',
        },
      );
      expect(mockDispatch.mock.calls).toMatchInlineSnapshot(`
        [
          [
            {
              "payload": {
                "orderId": "test-id-tron",
                "txHash": "tron-tx-hash-456",
              },
              "type": "FIAT_SET_SELL_TX_HASH",
            },
          ],
        ]
      `);
    });

    it('blocks a Tron transfer when the account lacks TRX or network resources', async () => {
      mockUseParamsValues = { orderId: 'test-id-tron' };
      mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
      mockValidateTronTransferAmount.mockResolvedValueOnce({
        valid: false,
        errors: [{ code: 'InsufficientBalanceToCoverFee' }],
      });

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockValidateTronTransferAmount).toHaveBeenCalledWith(
        mockTronAccount,
        {
          accountId: mockTronAccount.id,
          assetId: 'tron:728126428/slip44:195',
          value: '42',
          toAddress: TRON_DEPOSIT_ADDRESS,
        },
      );
      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
      expect(
        screen.getByTestId('send-transaction-validation-error'),
      ).toHaveTextContent(
        'This account needs more TRX or network resources to complete the transaction.',
      );
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockTrackEvent.mock.lastCall?.[0]).toBe(
        'OFFRAMP_SEND_TRANSACTION_REJECTED',
      );
    });

    it('validates and sends Tron USDT through the Snap', async () => {
      mockUseParamsValues = { orderId: 'test-id-tron-usdt' };
      mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
      mockSendMultichainTransactionForReview.mockResolvedValueOnce({
        transactionId: 'tron-usdt-tx-hash-789',
      });

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      const assetId = `tron:728126428/${TRON_USDT_ASSET_REFERENCE}`;
      expect(mockValidateTronTransferAmount).toHaveBeenCalledWith(
        mockTronAccount,
        {
          accountId: mockTronAccount.id,
          assetId,
          value: '100',
          toAddress: TRON_DEPOSIT_ADDRESS,
        },
      );
      expect(mockSendMultichainTransactionForReview).toHaveBeenCalledWith(
        mockTronAccount,
        {
          fromAccountId: mockTronAccount.id,
          toAddress: TRON_DEPOSIT_ADDRESS,
          assetId,
          amount: '100',
        },
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            orderId: 'test-id-tron-usdt',
            txHash: 'tron-usdt-tx-hash-789',
          },
        }),
      );
    });

    it('blocks Tron USDT when the account lacks TRX or network resources', async () => {
      mockUseParamsValues = { orderId: 'test-id-tron-usdt' };
      mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
      mockValidateTronTransferAmount.mockResolvedValueOnce({
        valid: false,
        errors: [{ code: 'InsufficientBalanceToCoverFee' }],
      });

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockValidateTronTransferAmount).toHaveBeenCalledWith(
        mockTronAccount,
        {
          accountId: mockTronAccount.id,
          assetId: `tron:728126428/${TRON_USDT_ASSET_REFERENCE}`,
          value: '100',
          toAddress: TRON_DEPOSIT_ADDRESS,
        },
      );
      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
      expect(
        screen.getByTestId('send-transaction-validation-error'),
      ).toHaveTextContent(
        'This account needs more TRX or network resources to complete the transaction.',
      );
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    it('shows insufficient funds when the Tron Snap reports InsufficientBalance', async () => {
      mockUseParamsValues = { orderId: 'test-id-tron' };
      mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
      mockValidateTronTransferAmount.mockResolvedValueOnce({
        valid: false,
        errors: [{ code: 'InsufficientBalance' }],
      });

      render(SendTransaction);
      await act(async () =>
        fireEvent.press(screen.getByRole('button', { name: 'Next' })),
      );

      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
      expect(
        screen.getByTestId('send-transaction-validation-error'),
      ).toHaveTextContent('Insufficient funds');
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    it('fails closed with a retryable error when Tron validation throws', async () => {
      mockUseParamsValues = { orderId: 'test-id-tron' };
      mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
      mockValidateTronTransferAmount.mockRejectedValueOnce(
        new Error('Snap unavailable'),
      );

      render(SendTransaction);
      await act(async () =>
        fireEvent.press(screen.getByRole('button', { name: 'Next' })),
      );

      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
      expect(
        screen.getByTestId('send-transaction-validation-error'),
      ).toHaveTextContent(
        "We couldn't verify this transfer. Please try again.",
      );
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
      expect(
        screen.getByTestId('send-transaction-retry-validation'),
      ).toBeOnTheScreen();
      expect(mockTrackEvent.mock.lastCall?.[0]).toBe(
        'OFFRAMP_SEND_TRANSACTION_REJECTED',
      );
    });

    it('fails closed when the Tron Snap returns no validation result', async () => {
      mockUseParamsValues = { orderId: 'test-id-tron' };
      mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
      mockValidateTronTransferAmount.mockResolvedValueOnce(undefined);

      render(SendTransaction);
      await act(async () =>
        fireEvent.press(screen.getByRole('button', { name: 'Next' })),
      );

      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
      expect(
        screen.getByTestId('send-transaction-validation-error'),
      ).toHaveTextContent(
        "We couldn't verify this transfer. Please try again.",
      );
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    it('keeps Next disabled when a Tron retry still lacks resources', async () => {
      mockUseParamsValues = { orderId: 'test-id-tron' };
      mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
      mockValidateTronTransferAmount.mockResolvedValue({
        valid: false,
        errors: [{ code: 'InsufficientBalanceToCoverFee' }],
      });

      render(SendTransaction);
      await act(async () =>
        fireEvent.press(screen.getByRole('button', { name: 'Next' })),
      );
      await act(async () =>
        fireEvent.press(
          screen.getByTestId('send-transaction-retry-validation'),
        ),
      );

      expect(mockValidateTronTransferAmount).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
      expect(
        screen.getByTestId('send-transaction-validation-error'),
      ).toBeOnTheScreen();
      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
    });

    it('re-enables Next after a successful Tron retry without sending, then sends on Next', async () => {
      mockUseParamsValues = { orderId: 'test-id-tron' };
      mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
      mockValidateTronTransferAmount
        .mockResolvedValueOnce({
          valid: false,
          errors: [{ code: 'InsufficientBalanceToCoverFee' }],
        })
        .mockResolvedValue({ valid: true, errors: [] });
      mockSendMultichainTransactionForReview.mockResolvedValueOnce({
        transactionId: 'tron-retry-tx-hash',
      });

      render(SendTransaction);
      await act(async () =>
        fireEvent.press(screen.getByRole('button', { name: 'Next' })),
      );
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

      await act(async () =>
        fireEvent.press(
          screen.getByTestId('send-transaction-retry-validation'),
        ),
      );

      expect(
        screen.queryByTestId('send-transaction-validation-error'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('send-transaction-retry-validation'),
      ).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
      // Retry only re-checks; it never opens the Snap confirmation itself.
      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();

      await act(async () =>
        fireEvent.press(screen.getByRole('button', { name: 'Next' })),
      );

      // Next validates again right before sending.
      expect(mockValidateTronTransferAmount).toHaveBeenCalledTimes(3);
      expect(mockSendMultichainTransactionForReview).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalled();
    });

    describe('Tron validation accessibility', () => {
      const TRON_RESOURCES_ERROR =
        'This account needs more TRX or network resources to complete the transaction.';
      let announceSpy: jest.SpyInstance;

      beforeEach(() => {
        announceSpy = jest
          .spyOn(AccessibilityInfo, 'announceForAccessibility')
          .mockImplementation(() => undefined);
        // The react-native jest preset already mocks this function, so clear
        // calls made by earlier tests in this file.
        announceSpy.mockClear();
      });

      afterEach(() => {
        announceSpy.mockRestore();
      });

      it('announces the validation error and exposes it as an alert', async () => {
        mockUseParamsValues = { orderId: 'test-id-tron' };
        mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
        mockValidateTronTransferAmount.mockResolvedValueOnce({
          valid: false,
          errors: [{ code: 'InsufficientBalanceToCoverFee' }],
        });

        render(SendTransaction);
        await act(async () =>
          fireEvent.press(screen.getByRole('button', { name: 'Next' })),
        );

        expect(announceSpy).toHaveBeenCalledTimes(1);
        expect(announceSpy).toHaveBeenCalledWith(TRON_RESOURCES_ERROR);
        expect(
          screen.getByTestId('send-transaction-validation-error'),
        ).toHaveProp('accessibilityRole', 'alert');
      });

      it('announces again when a retry fails with the same error', async () => {
        mockUseParamsValues = { orderId: 'test-id-tron' };
        mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
        mockValidateTronTransferAmount.mockResolvedValue({
          valid: false,
          errors: [{ code: 'InsufficientBalanceToCoverFee' }],
        });

        render(SendTransaction);
        await act(async () =>
          fireEvent.press(screen.getByRole('button', { name: 'Next' })),
        );
        await act(async () =>
          fireEvent.press(
            screen.getByTestId('send-transaction-retry-validation'),
          ),
        );

        expect(announceSpy).toHaveBeenCalledTimes(2);
        expect(announceSpy).toHaveBeenNthCalledWith(2, TRON_RESOURCES_ERROR);
      });

      it('marks Try again as busy while validation is running', async () => {
        mockUseParamsValues = { orderId: 'test-id-tron' };
        mockGetInternalAccountByAddress.mockReturnValue(mockTronAccount);
        let resolveRetry: (value: unknown) => void = () => undefined;
        mockValidateTronTransferAmount
          .mockResolvedValueOnce({
            valid: false,
            errors: [{ code: 'InsufficientBalanceToCoverFee' }],
          })
          .mockImplementationOnce(
            () =>
              new Promise((resolve) => {
                resolveRetry = resolve;
              }),
          );

        render(SendTransaction);
        await act(async () =>
          fireEvent.press(screen.getByRole('button', { name: 'Next' })),
        );
        expect(
          screen.getByTestId('send-transaction-retry-validation'),
        ).toHaveProp('accessibilityState', { busy: false, disabled: false });

        await act(async () => {
          fireEvent.press(
            screen.getByTestId('send-transaction-retry-validation'),
          );
        });
        expect(
          screen.getByTestId('send-transaction-retry-validation'),
        ).toHaveProp('accessibilityState', { busy: true, disabled: true });

        await act(async () => {
          resolveRetry({
            valid: false,
            errors: [{ code: 'InsufficientBalanceToCoverFee' }],
          });
        });
        expect(
          screen.getByTestId('send-transaction-retry-validation'),
        ).toHaveProp('accessibilityState', { busy: false, disabled: false });
      });
    });

    it('blocks Stellar sends until provider memo support is wired', async () => {
      mockUseParamsValues = { orderId: 'test-id-stellar' };
      mockGetInternalAccountByAddress.mockReturnValue(mockStellarAccount);

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });

      expect(nextButton).toBeDisabled();
      fireEvent.press(nextButton);
      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not call the Snap when the asset id is missing', async () => {
      const { assetId: _assetId, ...cryptoCurrency } = (
        mockSolanaOrder.data as SellOrder
      ).cryptoCurrency;
      const orderWithoutAssetId = {
        ...mockSolanaOrder,
        data: {
          ...mockSolanaOrder.data,
          cryptoCurrency,
        },
      } as FiatOrder;

      render(SendTransaction, [orderWithoutAssetId]);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockTrackEvent.mock.lastCall?.[0]).toBe(
        'OFFRAMP_SEND_TRANSACTION_REJECTED',
      );
    });

    it('tracks rejected and re-enables Next when the Snap throws', async () => {
      mockSendMultichainTransactionForReview.mockRejectedValueOnce(
        new Error('User rejected the request'),
      );

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockTrackEvent.mock.lastCall?.[0]).toBe(
        'OFFRAMP_SEND_TRANSACTION_REJECTED',
      );
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    });

    it('sends an eip155 chain id through the EVM transaction path', async () => {
      const cryptoCurrency = {
        ...(mockOrder.data as SellOrder).cryptoCurrency,
        network: {
          ...(mockOrder.data as SellOrder).cryptoCurrency.network,
          chainId: 'eip155:1',
        },
      };
      const evmCaipOrder = {
        ...mockOrder,
        id: 'test-id-eip155',
        data: {
          ...mockOrder.data,
          id: 'test-id-eip155',
          cryptoCurrency,
        },
      } as FiatOrder;

      mockUseParamsValues = { orderId: 'test-id-eip155' };
      mockGetInternalAccountByAddress.mockReset();
      render(SendTransaction, [evmCaipOrder]);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
    });

    it('does not call the Snap when the account has no snap id', async () => {
      mockGetInternalAccountByAddress.mockReturnValue({
        ...mockSolanaAccount,
        metadata: { name: 'Solana Account' },
      });

      render(SendTransaction);
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await act(async () => fireEvent.press(nextButton));

      expect(mockSendMultichainTransactionForReview).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockTrackEvent.mock.lastCall?.[0]).toBe(
        'OFFRAMP_SEND_TRANSACTION_REJECTED',
      );
    });
  });
});
