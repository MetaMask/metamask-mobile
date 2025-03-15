import React from 'react';
import TransactionDetails from './';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { mockNetworkState } from '../../../../util/test/network';

const Stack = createStackNavigator();
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
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any = {}, hash?: string, txParams?: any) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Amount" options={{}}>
        {() => (
          <TransactionDetails
            // @ts-expect-error - TransactionDetails needs to be converted to typescript
            transactionObject={{
              networkID: '1',
              status: 'confirmed',
              transaction: {
                nonce: '',
              },
              ...(txParams ? { txParams } : {}),
            }}
            //@ts-expect-error - TransactionDetails needs to be converted to typescript
            transactionDetails={{
              renderFrom: '0x0',
              renderTo: '0x1',
              transactionHash: '0x2',
              renderValue: '2 TKN',
              renderGas: '21000',
              renderGasPrice: '2',
              renderTotalValue: '2 TKN / 0.001 ETH',
              renderTotalValueFiat: '',
              ...(hash ? { hash } : {}),
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('TransactionDetails', () => {
  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly for multi-layer fee network', () => {
    const { toJSON } = renderComponent(
      {
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
      '0x3',
      {
        multiLayerL1FeeTotal: '0x1',
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
