import React from 'react';
import { screen } from '@testing-library/react-native';
import { SellOrder } from '@consensys/on-ramp-sdk/dist/API';
import { FiatOrder } from '../../../../../../reducers/fiatOrders';
import Routes from '../../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../../../util/test/initial-background-state.json';

import SendTransaction from './SendTransaction';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

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
        light: [
          'https://on-ramp.metafi-dev.codefi.network/assets/ACHBankTransfer-regular@3x.png',
        ],
        dark: [
          'https://on-ramp.metafi-dev.codefi.network/assets/ACHBankTransfer@3x.png',
        ],
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
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://token.metaswap.codefi.network/assets/nativeCurrencyLogos/ethereum.svg',
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
  } as DeepPartial<SellOrder>,
} as FiatOrder;

const mockedOrders = [mockOrder];

function render(Component: React.ComponentType, orders = mockedOrders) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.SEND_TRANSACTION,
    },
    {
      state: {
        engine: {
          backgroundState: initialBackgroundState,
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

describe('SendTransaction View', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetOptions.mockClear();
    mockReset.mockClear();
    mockPop.mockClear();
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
});
