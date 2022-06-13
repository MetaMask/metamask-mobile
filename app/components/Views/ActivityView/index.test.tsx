import React from 'react';
import ActivityView from './';

import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import configureStore from '../../../util/test/configureStore';
import Engine from '../../../core/Engine';

const mockEngine = Engine;

jest.unmock('react-redux');

const mockNavigate = jest.fn();

const CURRENT_ACCOUNT = '0x1a';
const RECEIVER_ACCOUNT = '0x2a';
jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  context: {
    KeyringController: {
      getQRKeyringState: new Promise((resolve) =>
        resolve({
          subscribe: jest.fn(),
          unsubscribe: jest.fn(),
        }),
      ),
    },
    NetworkController: {
      state: {
        isCustomNetwork: false,
        network: '1',
        properties: { isEIP1559Compatible: true },
        provider: { chainId: '1', ticker: 'ETH', type: 'mainnet' },
      },
    },
  },
}));

const Stack = createStackNavigator();

const initialState = {
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          CURRENT_ACCOUNT: {
            balance: '0x21031a9235c92',
          },
        },
      },
      AddressBookController: {
        addressBook: {},
      },
      AssetsContractController: {},
      CollectiblesController: {
        allCollectibleContracts: {},
        allCollectibles: {},
        ignoredCollectibles: [],
        collectibleContracts: [],
        collectibles: [],
      },
      CurrencyRateController: {
        conversionDate: 1654614224.405,
        conversionRate: 0.05965,
        nativeCurrency: 'ETH',
        currentCurrency: 'btc',
        pendingCurrentCurrency: null,
        pendingNativeCurrency: null,
        usdConversionRate: null,
      },
      KeyringController: {},
      NetworkController: {
        network: '1',
        isCustomNetwork: false,
        provider: {
          type: 'mainnet',
          ticker: 'ETH',
          chainId: '1',
        },
        properties: {},
      },
      PreferencesController: {
        featureFlags: {},
        frequentRpcList: [
          {
            rpcUrl: 'https://polygon-rpc.com',
            chainId: '137',
            ticker: 'MATIC',
            nickname: 'Polygon Mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://polygonscan.com',
            },
          },
          {
            rpcUrl: 'https://bsc-dataseed1.binance.org',
            chainId: '56',
            ticker: 'BNB',
            nickname: 'Binance Smart Chain Mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://bscscan.com',
            },
          },
          {
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            chainId: '43114',
            ticker: 'AVAX',
            nickname: 'Avalanche C-Chain',
            rpcPrefs: {
              blockExplorerUrl: 'https://snowtrace.io',
            },
          },
        ],
        identities: {
          CURRENT_ACCOUNT: {
            address: CURRENT_ACCOUNT,
            name: 'Account 1',
            importTime: 1653905477311,
          },
        },
        ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
        lostIdentities: {},
        selectedAddress: CURRENT_ACCOUNT,
        useStaticTokenList: true,
        useCollectibleDetection: false,
        openSeaEnabled: false,
      },
      TokenRatesController: {
        contractExchangeRates: {
          '0x6B175474E89094C44Da98b954EedeAC495271d0F': 0.00056037,
          '0x514910771AF9Ca656af840dff83E8264EcF986CA': 0.00437457,
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 0.99904552,
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 0.00056092,
          '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0': 0.00033789,
        },
      },
      TokensController: {
        allTokens: {},
        allIgnoredTokens: {
          '1': {
            CURRENT_ACCOUNT: [],
          },
          '56': {
            CURRENT_ACCOUNT: [],
          },
          '137': {
            CURRENT_ACCOUNT: [],
          },
        },
        ignoredTokens: [],
        suggestedAssets: [],
        tokens: [
          {
            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            symbol: 'DAI',
            decimals: 18,
            isERC721: false,
            balanceError: null,
          },
          {
            address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
            symbol: 'LINK',
            decimals: 18,
            isERC721: false,
            balanceError: null,
          },
          {
            address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            symbol: 'WETH',
            decimals: 18,
            isERC721: false,
            balanceError: null,
          },
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            decimals: 6,
            isERC721: false,
            balanceError: null,
          },
          {
            address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
            symbol: 'MATIC',
            decimals: 18,
            isERC721: false,
            balanceError: null,
          },
        ],
      },
      TransactionController: {
        transactions: [
          {
            id: 'eab61a00-cd60-11ec-b9f9-b7d2516fb352',
            isTransfer: true,
            networkID: '1',
            chainId: '1',
            status: 'confirmed',
            time: 1651857668000,
            transaction: {
              chainId: 1,
              from: CURRENT_ACCOUNT,
              gas: '52095',
              gasPrice: '50197485220',
              gasUsed: '0x69fa',
              to: RECEIVER_ACCOUNT,
              value: '297809705543745959',
            },
            transactionHash:
              '0x9f32fe8737d1aed716f3b4a0e3d420638b673808cfad7b492e8cd0494e8b8678',
            transferInformation: {
              contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
              decimals: 18,
              symbol: 'DAI',
            },
            verifiedOnBlockchain: true,
            insertImportTime: true,
            toSmartContract: false,
          },
          {
            id: 'eab61a00-cd60-11ec-b9f9-b7d2516fb352',
            isTransfer: true,
            networkID: '1',
            chainId: '1',
            status: 'submitted',
            time: 1651857668000,
            transaction: {
              chainId: 1,
              from: '0x2990079bcdee240329a520d2444386fc119da21a',
              gas: '52095',
              gasPrice: '50197485220',
              gasUsed: '0x69fa',
              to: '0x2990079bcdee240329a520d2444386fc119da21a',
              value: '297809705543745959',
            },
            transactionHash:
              '0x9f32fe8737d1aed716f3b4a0e3d420638b673808cfad7b492e8cd0494e8b8678',
            transferInformation: {
              contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
              decimals: 18,
              symbol: 'DAI',
            },
            verifiedOnBlockchain: true,
            insertImportTime: true,
            toSmartContract: false,
          },
        ],
        internalTransactions: [],
        swapsTransactions: {},
      },
      SwapsController: {
        quotes: {},
        quoteValues: {},
        fetchParams: {
          slippage: 0,
          sourceToken: '',
          sourceAmount: 0,
          destinationToken: '',
          walletAddress: '',
        },
        fetchParamsMetaData: {
          sourceTokenInfo: {
            decimals: 0,
            address: '',
            symbol: '',
          },
          destinationTokenInfo: {
            decimals: 0,
            address: '',
            symbol: '',
          },
        },
        topAggSavings: null,
        aggregatorMetadata: null,
        tokens: null,
        topAssets: null,
        approvalTransaction: null,
        aggregatorMetadataLastFetched: 0,
        quotesLastFetched: 0,
        topAssetsLastFetched: 0,
        error: {
          key: null,
          description: null,
        },
        topAggId: null,
        tokensLastFetched: 0,
        isInPolling: false,
        pollingCyclesLeft: 3,
        quoteRefreshSeconds: null,
        usedGasEstimate: null,
        usedCustomGas: null,
        chainCache: {
          '1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
        },
      },
      GasFeeController: {
        gasFeeEstimates: {},
        estimatedGasFeeTimeBounds: {},
        gasEstimateType: 'none',
      },
    },
  },
};

const renderComponent = (state: any = {}) => {
  const store = configureStore(state);

  return renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="TransactionsView" options={{}}>
        {(props) => <ActivityView {...props} />}
      </Stack.Screen>
    </Stack.Navigator>,
    store,
  );
};

describe('ActivityView', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });
  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should display a transaction confirmed', async () => {
    const { findByText } = renderComponent(initialState);
    jest.advanceTimersByTime(5000);
    const check = await findByText('Confirmed');
    expect(check.props.children).toBe('Confirmed');
  });
  it('should display you have no transactions', async () => {
    const { queryByText } = renderComponent({
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accounts: {
              CURRENT_ACCOUNT: {
                balance: '0x21031a9235c92',
              },
            },
          },
          AddressBookController: {
            addressBook: {},
          },
          AssetsContractController: {},
          CollectiblesController: {
            allCollectibleContracts: {},
            allCollectibles: {},
            ignoredCollectibles: [],
            collectibleContracts: [],
            collectibles: [],
          },
          CurrencyRateController: {
            conversionDate: 1654614224.405,
            conversionRate: 0.05965,
            nativeCurrency: 'ETH',
            currentCurrency: 'btc',
            pendingCurrentCurrency: null,
            pendingNativeCurrency: null,
            usdConversionRate: null,
          },
          KeyringController: {},
          NetworkController: {
            network: '1',
            isCustomNetwork: false,
            provider: {
              type: 'mainnet',
              ticker: 'ETH',
              chainId: '1',
            },
            properties: {},
          },
          PreferencesController: {
            featureFlags: {},
            frequentRpcList: [
              {
                rpcUrl: 'https://polygon-rpc.com',
                chainId: '137',
                ticker: 'MATIC',
                nickname: 'Polygon Mainnet',
                rpcPrefs: {
                  blockExplorerUrl: 'https://polygonscan.com',
                },
              },
              {
                rpcUrl: 'https://bsc-dataseed1.binance.org',
                chainId: '56',
                ticker: 'BNB',
                nickname: 'Binance Smart Chain Mainnet',
                rpcPrefs: {
                  blockExplorerUrl: 'https://bscscan.com',
                },
              },
              {
                rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                chainId: '43114',
                ticker: 'AVAX',
                nickname: 'Avalanche C-Chain',
                rpcPrefs: {
                  blockExplorerUrl: 'https://snowtrace.io',
                },
              },
            ],
            identities: {
              CURRENT_ACCOUNT: {
                address: CURRENT_ACCOUNT,
                name: 'Account 1',
                importTime: 1653905477311,
              },
            },
            ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
            lostIdentities: {},
            selectedAddress: CURRENT_ACCOUNT,
            useStaticTokenList: true,
            useCollectibleDetection: false,
            openSeaEnabled: false,
          },
          TokenRatesController: {
            contractExchangeRates: {
              '0x6B175474E89094C44Da98b954EedeAC495271d0F': 0.00056037,
              '0x514910771AF9Ca656af840dff83E8264EcF986CA': 0.00437457,
              '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 0.99904552,
              '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 0.00056092,
              '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0': 0.00033789,
            },
          },
          TokensController: {
            allTokens: {},
            allIgnoredTokens: {
              '1': {
                CURRENT_ACCOUNT: [],
              },
              '56': {
                CURRENT_ACCOUNT: [],
              },
              '137': {
                CURRENT_ACCOUNT: [],
              },
            },
            ignoredTokens: [],
            suggestedAssets: [],
            tokens: [
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                symbol: 'DAI',
                decimals: 18,
                isERC721: false,
                balanceError: null,
              },
              {
                address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                symbol: 'LINK',
                decimals: 18,
                isERC721: false,
                balanceError: null,
              },
              {
                address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                symbol: 'WETH',
                decimals: 18,
                isERC721: false,
                balanceError: null,
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                decimals: 6,
                isERC721: false,
                balanceError: null,
              },
              {
                address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
                symbol: 'MATIC',
                decimals: 18,
                isERC721: false,
                balanceError: null,
              },
            ],
          },
          TransactionController: {
            transactions: [],
            internalTransactions: [],
            swapsTransactions: {},
          },
          SwapsController: {
            quotes: {},
            quoteValues: {},
            fetchParams: {
              slippage: 0,
              sourceToken: '',
              sourceAmount: 0,
              destinationToken: '',
              walletAddress: '',
            },
            fetchParamsMetaData: {
              sourceTokenInfo: {
                decimals: 0,
                address: '',
                symbol: '',
              },
              destinationTokenInfo: {
                decimals: 0,
                address: '',
                symbol: '',
              },
            },
            topAggSavings: null,
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            approvalTransaction: null,
            aggregatorMetadataLastFetched: 0,
            quotesLastFetched: 0,
            topAssetsLastFetched: 0,
            error: {
              key: null,
              description: null,
            },
            topAggId: null,
            tokensLastFetched: 0,
            isInPolling: false,
            pollingCyclesLeft: 3,
            quoteRefreshSeconds: null,
            usedGasEstimate: null,
            usedCustomGas: null,
            chainCache: {
              '1': {
                aggregatorMetadata: null,
                tokens: null,
                topAssets: null,
                aggregatorMetadataLastFetched: 0,
                topAssetsLastFetched: 0,
                tokensLastFetched: 0,
              },
            },
          },
          GasFeeController: {
            gasFeeEstimates: {},
            estimatedGasFeeTimeBounds: {},
            gasEstimateType: 'none',
          },
        },
      },
    });
    jest.advanceTimersByTime(5000);

    const emptyTxsList = await queryByText(/You have no transactions!/);

    expect(emptyTxsList).toBeTruthy();
  });
  it('should display a transaction submitted with speed up and cancel options', async () => {
    const { queryByText, queryByTestId } = renderComponent({
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accounts: {
              '0x4579d0Ad79BFBdf4539a1dDF5f10B378D724a34C': {
                balance: '0x21031a9235c92',
              },
              '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
                balance: '0x0',
              },
              '0x2990079bcdEe240329a520d2444386FC119da21a': {
                balance: '0x63080769101e75',
              },
            },
          },
          AddressBookController: {
            addressBook: {},
          },
          AssetsContractController: {},
          CollectiblesController: {
            allCollectibleContracts: {},
            allCollectibles: {},
            ignoredCollectibles: [],
            collectibleContracts: [],
            collectibles: [],
          },

          CurrencyRateController: {
            conversionDate: 1654614224.405,
            conversionRate: 0.05965,
            nativeCurrency: 'ETH',
            currentCurrency: 'btc',
            pendingCurrentCurrency: null,
            pendingNativeCurrency: null,
            usdConversionRate: null,
          },

          NetworkController: {
            network: '1',
            isCustomNetwork: false,
            provider: {
              type: 'mainnet',
              ticker: 'ETH',
              chainId: '1',
            },
          },

          PreferencesController: {
            featureFlags: {},
            frequentRpcList: [
              {
                rpcUrl: 'https://polygon-rpc.com',
                chainId: '137',
                ticker: 'MATIC',
                nickname: 'Polygon Mainnet',
                rpcPrefs: {
                  blockExplorerUrl: 'https://polygonscan.com',
                },
              },
              {
                rpcUrl: 'https://bsc-dataseed1.binance.org',
                chainId: '56',
                ticker: 'BNB',
                nickname: 'Binance Smart Chain Mainnet',
                rpcPrefs: {
                  blockExplorerUrl: 'https://bscscan.com',
                },
              },
              {
                rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                chainId: '43114',
                ticker: 'AVAX',
                nickname: 'Avalanche C-Chain',
                rpcPrefs: {
                  blockExplorerUrl: 'https://snowtrace.io',
                },
              },
            ],
            identities: {
              '0x2990079bcdEe240329a520d2444386FC119da21a': {
                address: '0x2990079bcdEe240329a520d2444386FC119da21a',
                name: 'Account 3',
                importTime: 1653911797118,
              },
            },
            ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
            lostIdentities: {},
            selectedAddress: '0x2990079bcdEe240329a520d2444386FC119da21a',
            useStaticTokenList: true,
            useCollectibleDetection: false,
            openSeaEnabled: false,
          },

          TokenRatesController: {
            contractExchangeRates: {
              '0x6B175474E89094C44Da98b954EedeAC495271d0F': 0.00056037,
              '0x514910771AF9Ca656af840dff83E8264EcF986CA': 0.00437457,
              '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 0.99904552,
              '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 0.00056092,
              '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0': 0.00033789,
            },
          },
          TokensController: {
            allTokens: {},
            allIgnoredTokens: {
              '1': {
                '0x2990079bcdEe240329a520d2444386FC119da21a': [],
              },
              '56': {
                '0x2990079bcdEe240329a520d2444386FC119da21a': [],
              },
              '137': {
                '0x2990079bcdEe240329a520d2444386FC119da21a': [],
              },
            },
            ignoredTokens: [],
            suggestedAssets: [],
            tokens: [
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                symbol: 'DAI',
                decimals: 18,
                isERC721: false,
                balanceError: null,
              },
            ],
          },
          TransactionController: {
            transactions: [
              {
                id: 'eab61a00-cd60-11ec-b9f9-b7d2516fb352',
                isTransfer: true,
                networkID: '1',
                chainId: '1',
                status: 'submitted',
                time: 1651857668000,
                transaction: {
                  chainId: 1,
                  from: '0x2990079bcdee240329a520d2444386fc119da21a',
                  gas: '52095',
                  gasPrice: '50197485220',
                  gasUsed: '0x69fa',
                  to: '0x2990079bcdee240329a520d2444386fc119da21a',
                  value: '297809705543745959',
                },
                transactionHash:
                  '0x9f32fe8737d1aed716f3b4a0e3d420638b673808cfad7b492e8cd0494e8b8678',
                transferInformation: {
                  contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                  decimals: 18,
                  symbol: 'DAI',
                },
                verifiedOnBlockchain: true,
                insertImportTime: true,
                toSmartContract: false,
              },
            ],
            internalTransactions: [],
            swapsTransactions: {},
          },

          SwapsController: {
            quotes: {},
            quoteValues: {},
            fetchParams: {
              slippage: 0,
              sourceToken: '',
              sourceAmount: 0,
              destinationToken: '',
              walletAddress: '',
            },
            fetchParamsMetaData: {
              sourceTokenInfo: {
                decimals: 0,
                address: '',
                symbol: '',
              },
              destinationTokenInfo: {
                decimals: 0,
                address: '',
                symbol: '',
              },
            },
            topAggSavings: null,
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            approvalTransaction: null,
            aggregatorMetadataLastFetched: 0,
            quotesLastFetched: 0,
            topAssetsLastFetched: 0,
            error: {
              key: null,
              description: null,
            },
            topAggId: null,
            tokensLastFetched: 0,
            isInPolling: false,
            pollingCyclesLeft: 3,
            quoteRefreshSeconds: null,
            usedGasEstimate: null,
            usedCustomGas: null,
            chainCache: {
              '1': {
                aggregatorMetadata: null,
                tokens: null,
                topAssets: null,
                aggregatorMetadataLastFetched: 0,
                topAssetsLastFetched: 0,
                tokensLastFetched: 0,
              },
            },
          },
          GasFeeController: {
            gasFeeEstimates: {},
            estimatedGasFeeTimeBounds: {},
            gasEstimateType: 'none',
          },
        },
      },
    });

    jest.advanceTimersByTime(2000);
    await new Promise(process.nextTick);

    const txSpeedButton = queryByText('Speed up');
    const txCancel = queryByTestId('txn-submitted-cancel-btn');

    expect(txSpeedButton).toBeTruthy();
    expect(txCancel).toBeTruthy();
  });
});
