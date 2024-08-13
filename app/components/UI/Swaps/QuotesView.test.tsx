import React from 'react';
import QuotesView from './QuotesView';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  expectedUuid,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../util/test/accountsControllerTestUtils';

jest.setTimeout(10_000);

const mockEngine = Engine;

const mockInitialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        providerConfig: {
          type: 'mainnet' as
            | 'mainnet'
            | 'rpc'
            | 'goerli'
            | 'sepolia'
            | 'linea-goerli'
            | 'linea-sepolia'
            | 'linea-mainnet'
            | undefined,
          chainId: '0x1' as '0x${string}',
          ticker: 'ETH',
        },
      },
      SwapsControlller: {
        quotesLastFetched: Date.now(),
        topAggId: 'airswapV4',
        tokens: [
          [
            {
              address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              aggregators: ['socket', 'coinmarketcap'],
              decimals: 6,
              iconUrl:
                'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
              name: 'USD Coin',
              occurrences: 10,
              symbol: 'USDC',
              type: 'erc20',
            },
          ],
        ],
        isInPolling: false,
        quotes: {
          airswapV4: {
            aggType: 'RFQ',
            aggregator: 'airswapV4',
            approvalNeeded: null,
            averageGas: 190431,
            destinationAmount: '2636315',
            destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            destinationTokenRate: 0.00037280152318031886,
            error: null,
            estimatedRefund: 48635,
            fee: 0.875,
            fetchTime: 823,
            gasEstimate: '0x3a5da',
            gasEstimateWithRefund: '2e7df',
            gasMultiplier: 1,
            hasRoute: false,
            maxGas: 239066,
            priceSlippage: {
              bucket: 'low',
              calculationError: '',
              destinationAmountInETH: 0.000987688784254516,
              destinationAmountInNativeCurrency: 0.000987688784254516,
              destinationAmountInUSD: 2.64300052191,
              ratio: 1.0108456942379809,
              sourceAmountInETH: 0.001,
              sourceAmountInNativeCurrency: 0.001,
              sourceAmountInUSD: 2.67198,
            },
            quoteRefreshSeconds: 30,
            slippage: 2,
            sourceAmount: '1000000000000000',
            sourceToken: '0x0000000000000000000000000000000000000000',
            sourceTokenRate: 1,
            trade: {
              data: '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000001c616972737761704c696768743446656544796e616d696346697865640000000000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000190e021676f0000000000000000000000000000000000000000000000000000000066ba7b9700000000000000000000000051c72848c68a965f66fa7a88855f9f7784502a7f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000002857a100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003858960223400000000000000000000000000000000000000000000000000000000000000001be9fc4346e69a599f2e81e99b6e41b633430d9214b4d46f7919604931e5b193b40ebe350105169a651e5afd44ea7d06958e621b21ffbec6159f6adf4ce8148b47000000000000000000000000000000000000000000000000000007f544a44c00000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000000f8',
              from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
              gas: '0x3e9b5',
              to: '0x881d40237659c251811cec9c364ef91dc08d300c',
              value: '0x38d7ea4c68000',
            },
          },
        },
      },
      AccountTrackerController: {
        accounts: {
          [MOCK_ADDRESS_1]: {
            balance: '0x0',
          },
        },
      },
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        internalAccounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
          selectedAccount: expectedUuid,
        },
        accounts: {
          [MOCK_ADDRESS_1]: {
            balance: '0x0',
            name: 'Account 1',
            address: MOCK_ADDRESS_1,
          },
        },
      },
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  context: {
    SwapsController: {
      stopPollingAndResetState: jest.fn(),
      startFetchAndSetQuotes: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            // Can't use MOCK_ADDRESS_1 variable due to mocks being hoisted before the import, so just hard code it
            accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
          },
        ],
      },
    },
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: jest.fn(() => ({
      params: {
        destinationTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        slippage: 2,
        sourceAmount: '1000000000000000',
        sourceTokenAddress: '0x0000000000000000000000000000000000000000',
        tokens: [
          {
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            name: 'Ether',
            occurrences: 0,
            symbol: 'ETH',
          },
          {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            aggregators: [],
            decimals: 6,
            iconUrl:
              'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
            name: 'USDC',
            occurrences: 16,
            symbol: 'USDC',
            type: 'erc20',
          },
        ],
      },
    })),
  };
});

jest.mock('./utils/useBalance', () => jest.fn(() => 1_000_000));
jest.mock('./components/QuotesModal', () => 'QuotesModal');

describe('QuotesView', () => {
  it.only('should render correctly', async () => {
    const { findByText } = renderWithProvider(
      <QuotesView />,
      {
        state: mockInitialState,
      },
      false,
    );

    const swapButton = await findByText('Swap', {}, { timeout: 5000 });
    expect(swapButton).toBeDefined();
  });
});
