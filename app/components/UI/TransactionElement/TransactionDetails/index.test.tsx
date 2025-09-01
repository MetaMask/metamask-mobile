import React from 'react';
import { query } from '@metamask/controller-utils';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TransactionDetails from './';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { mockNetworkState } from '../../../../util/test/network';
import type { NetworkState } from '@metamask/network-controller';

const Stack = createStackNavigator();
const mockEthQuery = {
  getBalance: jest.fn(),
};
const initialState = {
  settings: {
    showFiatOnTestnets: true,
  },
  swaps: {
    featureFlags: {
      smart_transactions: {
        mobile_active: false,
        extension_active: true,
      },
      smartTransactions: {
        mobileActive: false,
        extensionActive: true,
        mobileActiveIOS: false,
        mobileActiveAndroid: false,
      },
    },
    '0x1': {
      isLive: true,
      featureFlags: {
        smartTransactions: {
          expectedDeadline: 45,
          maxDeadline: 160,
          mobileReturnTxHashAsap: false,
        },
      },
    },
    '0xe708': {
      isLive: true,
      featureFlags: {
        smartTransactions: {
          expectedDeadline: 45,
          maxDeadline: 160,
          mobileReturnTxHashAsap: false,
        },
      },
    },
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
    SmartTransactionsController: {
      smartTransactionsState: {
        liveness: 'live',
      },
    },
    PreferencesController: {
      smartTransactionsOptInStatus: true,
    },
  },
};

jest.mock('../../../../util/networks/global-network', () => ({
  getGlobalEthQuery: jest.fn(() => mockEthQuery),
}));

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  query: jest.fn(),
}));

const navigationMock = {
  navigate: jest.fn(),
  push: jest.fn(),
};

const renderComponent = ({
  state = {},
  hash,
  txParams,
  status = 'confirmed',
  networkId = '0x1',
  transactionObj = {},
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state?: any;
  hash?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txParams?: any;
  status?: string;
  shouldUseSmartTransaction?: boolean;
  networkId?: string;
  transactionObj?: Record<string, unknown>;
}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Amount" options={{}}>
        {() => (
          <TransactionDetails
            transactionObject={{
              networkID: '1',
              status,
              transaction: {
                nonce: '',
              },
              chainId: networkId,
              ...(txParams ? { txParams } : {}),
              ...transactionObj,
            }}
            transactionDetails={{
              renderFrom: '0x0',
              renderTo: networkId,
              transactionHash: '0x2',
              renderValue: '2 TKN',
              renderGas: '21000',
              renderGasPrice: '2',
              renderTotalValue: '2 TKN / 0.001 ETH',
              renderTotalValueFiat: '',
              txChainId: networkId,
              hash: '0x3',
              ...(hash ? { hash } : {}),
            }}
            navigation={navigationMock}
            chainId={networkId}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('TransactionDetails', () => {
  it('should render correctly', () => {
    const { toJSON, getByText } = renderComponent({ state: initialState });
    expect(toJSON()).toMatchSnapshot();
    const nonceText = getByText('Nonce');
    expect(nonceText).toBeDefined();
    const totalAmountText = getByText('Total amount');
    expect(totalAmountText).toBeDefined();
    const dateText = getByText('Date');
    expect(dateText).toBeDefined();
  });

  it('should render correctly for multi-layer fee network', () => {
    jest.mocked(query).mockResolvedValueOnce(123).mockResolvedValueOnce({
      timestamp: 1234,
      l1Fee: '0x1',
    });

    const { toJSON } = renderComponent({
      state: {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            NetworkController: {
              ...mockNetworkState({
                chainId: '0xa',
                id: 'optimism',
                nickname: 'OP Mainnet',
                ticker: 'ETH',
                blockExplorerUrl: 'https://optimistic.etherscan.io/',
              }),
            },
          },
        },
      },
      hash: '0x3',
      txParams: {
        multiLayerL1FeeTotal: '0x1',
      },
    });
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render correctly for multi-layer fee network with no l1 fee', () => {
    jest.mocked(query).mockResolvedValueOnce(123).mockResolvedValueOnce({
      timestamp: 1234,
      l1Fee: '0x0',
    });
    const { toJSON } = renderComponent({
      state: {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            NetworkController: {
              ...mockNetworkState({
                chainId: '0xa',
                id: 'optimism',
                nickname: 'OP Mainnet',
                ticker: 'ETH',
                blockExplorerUrl: 'https://optimistic.etherscan.io/',
              }),
            },
          },
        },
      },
      hash: '0x3',
      txParams: {
        multiLayerL1FeeTotal: '0x1',
      },
    });
    expect(toJSON()).toMatchSnapshot();
  });

  const arrangeBlockExplorerTest = () => {
    jest.mocked(query).mockResolvedValueOnce(123).mockResolvedValueOnce({
      timestamp: 1234,
      l1Fee: '0x1',
    });

    const mockState = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          NetworkController: {
            '0x1': {
              chainId: '0x1',
              blockExplorerUrls: [],
              rpcEndpoints: [
                {
                  rpcUrl: 'https://mainnet.infura.io/v3/123',
                  chainId: '0x1',
                  nickname: 'Mainnet',
                  ticker: 'ETH',
                },
              ],
              defaultRpcEndpointIndex: 0,
              name: 'Mainnet',
              nativeCurrency: 'ETH',
            },
          } as unknown as NetworkState,
        },
      },
    };

    const mockProps = {
      networkId: '0x1',
    };

    return {
      mockState,
      mockProps,
    };
  };

  const arrangeActAssertBlockExplorerTest = (props: {
    buttonText: string;
    expectedUrl: string;
    overrideMocks?: (
      mocks: ReturnType<typeof arrangeBlockExplorerTest>,
    ) => void;
  }) => {
    // Arrange
    const mocks = arrangeBlockExplorerTest();
    props.overrideMocks?.(mocks);

    const { getByText } = renderComponent({
      state: mocks.mockState,
      networkId: mocks.mockProps.networkId,
    });

    fireEvent.press(getByText(props.buttonText));

    expect(navigationMock.push).toHaveBeenCalledWith('Webview', {
      params: expect.objectContaining({ url: props.expectedUrl }),
      screen: 'SimpleWebview',
    });
  };

  it('should view transaction details on etherscan', () => {
    arrangeActAssertBlockExplorerTest({
      overrideMocks: (mocks) => {
        mocks.mockState.engine.backgroundState.NetworkController =
          mockNetworkState({
            chainId: '0x1',
            id: 'mainnet',
            nickname: 'Ethereum Mainnet',
            ticker: 'ETH',
          });
        mocks.mockProps.networkId = '0x1';
      },
      buttonText: 'View on Etherscan',
      expectedUrl: 'https://etherscan.io/tx/0x3',
    });
  });

  it('should display explorer link for linea mainnet', () => {
    arrangeActAssertBlockExplorerTest({
      overrideMocks: (mocks) => {
        mocks.mockState.engine.backgroundState.NetworkController =
          mockNetworkState({
            chainId: '0xe708',
            id: 'linea',
            nickname: 'Linea Mainnet',
            ticker: 'ETH',
          });
        mocks.mockProps.networkId = '0xe708';
      },
      buttonText: 'View on Lineascan',
      expectedUrl: 'https://lineascan.build/tx/0x3',
    });
  });

  it('should display explorer link for sepolia mainnet', () => {
    arrangeActAssertBlockExplorerTest({
      overrideMocks: (mocks) => {
        mocks.mockState.engine.backgroundState.NetworkController =
          mockNetworkState({
            chainId: '0xaa36a7',
            id: 'sepolia',
            nickname: 'Sepolia Mainnet',
            ticker: 'ETH',
          });
        mocks.mockProps.networkId = '0xaa36a7';
      },
      buttonText: 'View on Sepolia',
      expectedUrl: 'https://sepolia.etherscan.io/tx/0x3',
    });
  });

  it('should display explorer link for custom network', () => {
    arrangeActAssertBlockExplorerTest({
      overrideMocks: (mocks) => {
        mocks.mockState.engine.backgroundState.NetworkController =
          mockNetworkState({
            chainId: '0x1337',
            id: '123-123-123',
            nickname: 'My Custom Network',
            ticker: 'FOO',
            blockExplorerUrl: 'https://custom-block-explorer.net',
          });
        mocks.mockProps.networkId = '0x1337';
      },
      buttonText: 'View on Custom-block-explorer',
      expectedUrl: 'https://custom-block-explorer.net/tx/0x3',
    });
  });

  it('should render speed up and cancel buttons', async () => {
    const { getByText } = renderComponent({
      state: {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            PreferencesController: {
              smartTransactionsOptInStatus: false,
            },
          },
        },
      },
      hash: '0x3',
      txParams: {
        multiLayerL1FeeTotal: '0x1',
      },
      status: 'submitted',
    });

    await waitFor(() => {
      const speedUpButton = getByText('Speed up');
      expect(speedUpButton).toBeDefined();
      const cancelButton = getByText('Cancel');
      expect(cancelButton).toBeDefined();
      fireEvent.press(speedUpButton);
      fireEvent.press(cancelButton);
    });
  });

  it('should render `Batched transactions` tag if there are nested transactions', async () => {
    const { getByText } = renderComponent({
      state: initialState,
      transactionObj: { nestedTransactions: [{}, {}] },
    });

    expect(getByText('Batched transactions')).toBeTruthy();
  });
});
