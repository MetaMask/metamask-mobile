import React from 'react';
import { merge } from 'lodash';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Approve from './index';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import initialRootState from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
// eslint-disable-next-line import/no-namespace
import * as TransactionController from '../../../../../util/transaction-controller';

const TRANSACTION_ID_MOCK = '123';
jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectSmartTransactionsEnabled: () => false,
  selectShouldUseSmartTransaction: () => false,
  selectPendingSmartTransactionsBySender: () => [],
  selectPendingSmartTransactionsForSelectedAccountGroup: () => [],
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectSmartTransactionsBannerDismissed: () => false,
  selectSmartTransactionsMigrationApplied: () => false,
  selectSmartTransactionsOptInStatus: () => false,
  selectIsTokenNetworkFilterEqualCurrentNetwork: () => true,
}));

jest.mock('../../../../../core/GasPolling/GasPolling', () => ({
  startGasPolling: jest.fn().mockResolvedValue(null),
  stopGasPolling: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    tryUnsubscribe: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  rejectPendingApproval: jest.fn(),
  context: {
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {
            '30786334-3935-4563-b064-363339643939': {
              address: '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
            },
          },
        },
      },
    },
    AssetsContractController: {
      getERC20BalanceOf: jest.fn().mockResolvedValue(null),
    },
    TransactionController: {
      getNonceLock: jest
        .fn()
        .mockResolvedValue({ nextNonce: 2, releaseLock: jest.fn() }),
    },
  },
}));

jest.mock('../../../../../util/transactions', () => ({
  ...jest.requireActual('../../../../../util/transactions'),
  getMethodData: jest.fn().mockResolvedValue({}),
  decodeApproveData: jest.fn().mockReturnValue({
    spenderAddress: '0x123',
    encodedAmount: '0x456',
  }),
}));

const Stack = createStackNavigator();
const mockStore = configureMockStore();
const navigationPropMock = {
  setOptions: jest.fn(),
  setParams: jest.fn(),
  navigate: jest.fn(),
};
const routeMock = {
  params: {},
};
const hideModalMock = jest.fn();

const renderComponent = ({ store }: { store: Store }) =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Approve">
              {() => (
                <Approve
                  modalVisible
                  navigation={navigationPropMock}
                  route={routeMock}
                  hideModal={hideModalMock}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeContext.Provider>
    </Provider>,
  );

describe('Approve', () => {
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
  });

  it('renders transaction approval', () => {
    const wrapper = renderComponent({ store });
    expect(wrapper).toMatchSnapshot();
  });

  it('renders transaction approval details', async () => {
    const { findByText, findByTestId } = renderComponent({ store });

    await act(async () => {
      fireEvent.press(await findByTestId('view-transaction-details'));
    });

    expect(await findByText('Transaction Details')).toBeTruthy();
    expect(await findByText('Approve asset:')).toBeTruthy();
    expect(await findByText('undefined (#1110)')).toBeTruthy();
  });

  it('navigates on confirm to the change in simulation modal when the transaction marked with isUpdatedAfterSecurityCheck as true', async () => {
    const storeWithUpdatedTransaction = mockStore(
      merge({}, store.getState(), {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: TRANSACTION_ID_MOCK,
                  simulationData: {
                    isUpdatedAfterSecurityCheck: true,
                  },
                },
              ],
            },
          },
        },
      }),
    );

    renderComponent({ store: storeWithUpdatedTransaction });

    await act(async () => {
      fireEvent.press(screen.getByTestId('Confirm'));
    });

    expect(navigationPropMock.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.CHANGE_IN_SIMULATION_MODAL,
      }),
    );
  });

  it('fetches network nonce on component mount', async () => {
    const getNetworkNonceSpy = jest.spyOn(
      TransactionController,
      'getNetworkNonce',
    );

    const storeWithTransaction = mockStore(
      merge({}, store.getState(), {
        settings: {},
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: TRANSACTION_ID_MOCK,
                  transaction: {
                    from: '0xfrom',
                    to: '0xto',
                    nonce: '0x2',
                  },
                  mode: 'edit',
                },
              ],
            },
          },
        },
        transaction: {
          mode: 'edit',
        },
      }),
    );

    renderComponent({
      store: storeWithTransaction,
    });

    expect(getNetworkNonceSpy).toHaveBeenCalledWith(
      { id: TRANSACTION_ID_MOCK, mode: 'edit' },
      undefined,
    );
    const nonceSpyResult = await getNetworkNonceSpy.mock.results[0].value;
    expect(nonceSpyResult).toBe(2);

    getNetworkNonceSpy.mockRestore();
  });
});
