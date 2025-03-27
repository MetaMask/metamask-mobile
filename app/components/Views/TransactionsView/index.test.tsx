import React from 'react';
import { act, render } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import TransactionsView from './index';
import initialRootState from '../../../util/test/initial-root-state';
import { Store } from 'redux';

jest.mock('../../../util/activity', () => ({
  sortTransactions: jest.fn((txs) => txs),
  filterByAddressAndNetwork: jest.fn(() => true),
}));

jest.mock('../../../util/transactions', () => ({
  addAccountTimeFlagFilter: jest.fn(() => false),
}));

const TRANSACTION_ID_MOCK = '123';
const Stack = createStackNavigator();
const mockStore = configureMockStore();

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      getOrAddQRKeyring: jest.fn(),
      cancelQRSignRequest: jest.fn().mockResolvedValue(undefined),
      state: {
        keyrings: [],
      },
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  rejectPendingApproval: jest.fn(),
}));

describe('TransactionsView', () => {
  let store: Store;

  beforeEach(() => {
    jest.clearAllMocks();
    store = mockStore({
      ...initialRootState,
      transaction: {
        id: TRANSACTION_ID_MOCK,
      },
      settings: {
        primaryCurrency: 'Fiat',
      },
      alert: {
        isVisible: false,
      },
      engine: {
        backgroundState: {
          ...initialRootState.engine.backgroundState,
          AccountsController: {
            ...initialRootState.engine.backgroundState.AccountsController,
            internalAccounts: {
              ...initialRootState.engine.backgroundState.AccountsController
                .internalAccounts,
              selectedAccount: '30786334-3935-4563-b064-363339643939',
              accounts: {
                '30786334-3935-4563-b064-363339643939': {
                  address: '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
                },
              },
            },
          },
          TokensController: {
            ...initialRootState.engine.backgroundState.TokensController,
            allTokens: {
              ...initialRootState.engine.backgroundState.TokensController
                .allTokens,
              '0x1': {
                '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272': [],
              },
            },
          },
        },
      },
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly and matches snapshot', async () => {
    const component = render(
      <Provider store={store}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="TransactionsView"
              // @ts-expect-error-next-line
              component={TransactionsView}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>,
    );

    // Flush the InteractionManager callback
    act(() => {
      jest.runAllTimers();
    });

    expect(component.toJSON()).toMatchSnapshot();
  });
});
