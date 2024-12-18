import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Approve from './index';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import initialRootState from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';

const TRANSACTION_ID_MOCK = '123';
jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn().mockReturnValue(false),
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
    AssetsContractController: {
      getERC20BalanceOf: jest.fn().mockResolvedValue(null),
    },
    KeyringController: {
      getOrAddQRKeyring: jest.fn(),
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

  it('should render transaction approval', () => {
    const wrapper = renderComponent({ store });
    expect(wrapper).toMatchSnapshot();
  });

  it('should navigate on confirm to the change in simulation modal when the transaction marked with isUpdatedAfterSecurityCheck as true', () => {
    const storeWithUpdatedTransaction = mockStore({
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
          TransactionController: {
            ...initialRootState.engine.backgroundState.TransactionController,
            transactions: [
              {
                id: TRANSACTION_ID_MOCK,
                simulationData: {
                  isUpdatedAfterSecurityCheck: true,
                },
              },
            ],
          },
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

    renderComponent({ store: storeWithUpdatedTransaction });

    fireEvent.press(screen.getByTestId('Confirm'));
    expect(navigationPropMock.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.CHANGE_IN_SIMULATION_MODAL,
      }),
    );
  });
});
