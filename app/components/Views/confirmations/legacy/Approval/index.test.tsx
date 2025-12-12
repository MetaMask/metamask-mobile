import React from 'react';
import { render } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Approval from './index';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import initialRootState from '../../../../../util/test/initial-root-state';

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
  selectUseTransactionSimulations: () => false,
  selectIsTokenNetworkFilterEqualCurrentNetwork: () => true,
  selectTokenSortConfig: () => ({
    key: 'name',
    order: 'asc',
    sortCallback: 'alphaNumeric',
  }),
}));

jest.mock('../../../../../util/dappTransactions', () => ({
  handleGetGasLimit: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  rejectPendingApproval: jest.fn(),
  context: {
    GasFeeController: {
      getGasFeeEstimatesAndStartPolling: jest.fn().mockResolvedValue(null),
      stopPolling: jest.fn(),
    },
    TransactionController: {
      getNonceLock: jest.fn().mockResolvedValue({ releaseLock: jest.fn() }),
    },
  },
  controllerMessenger: {
    tryUnsubscribe: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../../selectors/confirmTransaction', () => ({
  selectCurrentTransactionSecurityAlertResponse: () => null,
  selectCurrentTransactionMetadata: () => null,
  selectGasFeeEstimates: () => ({}),
}));

jest.mock('../../../../../selectors/tokenListController', () => ({
  selectTokenList: () => ({}),
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

const renderComponent = ({ store }: { store: Store }) =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Approval">
              {() => (
                <Approval
                  dappTransactionModalVisible
                  navigation={navigationPropMock}
                  route={routeMock}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeContext.Provider>
    </Provider>,
  );

describe('Approval', () => {
  let store: Store;

  beforeEach(() => {
    jest.clearAllMocks();
    store = mockStore({
      ...initialRootState,
      settings: {},
      transaction: {
        id: TRANSACTION_ID_MOCK,
        from: '0x1234',
        transaction: {
          data: '0x1',
        },
      },
      browser: {
        tabs: [],
      },
      alert: {
        isVisible: false,
      },
    });
  });

  it('render matches snapshot', () => {
    const wrapper = renderComponent({ store });
    expect(wrapper).toMatchSnapshot();
  });
});
