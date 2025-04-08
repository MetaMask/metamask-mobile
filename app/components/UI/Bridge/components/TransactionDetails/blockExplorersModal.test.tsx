import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BlockExplorersModal from './blockExplorersModal';
import { TransactionMeta } from '@metamask/transaction-controller';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const store = mockStore({
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      NetworkController: {
        providerConfig: {
          chainId: '0x1',
        },
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'ETH',
            ticker: 'ETH',
            nickname: 'Ethereum Mainnet',
            name: 'Ethereum Mainnet',
          },
          '0xa': {
            chainId: '0xa',
            rpcEndpoints: [
              {
                networkClientId: 'optimism',
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'ETH',
            ticker: 'ETH',
            nickname: 'Optimism',
            name: 'Optimism',
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0x123',
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'account1',
          accounts: {
            account1: {
              id: 'account1',
              address: '0x123',
              name: 'Account 1',
            },
          },
        },
      },
      BridgeStatusController: {
        txHistory: {
          '1': {
            txMetaId: '1',
            account: '0x123' as Hex,
            quote: {
              requestId: 'test-request-id',
              srcChainId: 1,
              srcAsset: {
                chainId: 1,
                address: '0x0000000000000000000000000000000000000001' as Hex,
                decimals: 18,
              },
              destChainId: 10,
              destAsset: {
                chainId: 10,
                address: '0x0000000000000000000000000000000000000002' as Hex,
                decimals: 18,
              },
              srcTokenAmount: '1000000000000000000',
              destTokenAmount: '2000000000000000000',
            },
            status: {
              srcChain: {
                txHash: '0x123',
              },
              destChain: {
                txHash: '0x456',
              },
            },
            startTime: Date.now(),
            estimatedProcessingTimeInSeconds: 300,
          },
        },
      },
      BridgeController: {
        bridgeFeatureFlags: {
          MOBILE_CONFIG: {
            chains: {
              [formatChainIdToCaip('0x1')]: {
                isActiveSrc: true,
                isActiveDest: true,
              },
              [formatChainIdToCaip('0xa')]: {
                isActiveSrc: true,
                isActiveDest: true,
              },
            },
          },
        },
        quoteRequest: {
          slippage: 0.5,
        },
      },
    },
  },
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  mockTheme: {
    colors: {
      primary: {
        default: '#000000',
      },
    },
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'bridge_transaction_details.view_on_block_explorer': 'View on Block Explorer',
    };
    return translations[key] || key;
  },
}));

describe('BlockExplorersModal', () => {
  const mockProps = {
    route: {
      params: {
        tx: {
          id: '1',
          hash: '0x123',
          chainId: '0x1',
          networkClientId: 'mainnet',
          time: Date.now(),
          txParams: {
            from: '0x123',
            to: '0x456',
            value: '0x0',
            data: '0x',
          },
          status: 'submitted',
        } as unknown as TransactionMeta,
      },
    },
  };

  const renderComponent = () => {
    return render(
      <SafeAreaProvider>
        <Provider store={store}>
          <BlockExplorersModal {...mockProps} />
        </Provider>
      </SafeAreaProvider>
    );
  };

  it('should render without crashing', () => {
    expect(() => renderComponent()).not.toThrow();
  });
});
