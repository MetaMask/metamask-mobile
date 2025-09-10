import React from 'react';
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

const mockedOrders = [mockOrder, mockOrder2, mockOrder3];

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

const mockSetOptions = jest.fn();
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
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      goBack: mockGoBack,
      reset: mockReset,
      dangerouslyGetParent: () => ({
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
    mockSetOptions.mockClear();
    mockReset.mockClear();
    mockPop.mockClear();
    mockDispatch.mockClear();
    mockTrackEvent.mockClear();
    mockAddTransaction.mockClear();
  });

  beforeEach(() => {
    mockUseParamsValues = {
      orderId: 'test-id-1',
    };
  });

  it('calls setOptions when rendering', async () => {
    render(SendTransaction);
    expect(mockSetOptions).toBeCalledTimes(1);
  });

  it('renders correctly', async () => {
    render(SendTransaction);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls analytics when rendering', async () => {
    render(SendTransaction);
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED",
        {
          "chain_id_source": undefined,
          "crypto_amount": undefined,
          "currency_destination": undefined,
          "currency_source": undefined,
          "fiat_out": undefined,
          "order_id": undefined,
          "payment_method_id": undefined,
          "provider_offramp": undefined,
        },
      ]
    `);
  });

  it('renders correctly for token', async () => {
    mockUseParamsValues = { orderId: 'test-id-2' };
    render(SendTransaction);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly for custom action payment method', async () => {
    mockUseParamsValues = { orderId: 'test-id-3' };
    render(SendTransaction);
    expect(screen.toJSON()).toMatchSnapshot();
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
});
