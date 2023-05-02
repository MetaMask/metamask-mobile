import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { render } from '@testing-library/react-native';

import Engine from '../../../core/Engine';
import CustomGasModal from './';

Engine.init({});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
}));

const initialState = {
  settings: {},
  transaction: {
    selectedAsset: {},
    transaction: {},
  },
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: 200,
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0x0',
        identities: {
          '0x0': {
            address: '0x0',
            name: 'Account 1',
          },
        },
      },
      GasFeeController: {
        gasFeeEstimates: {},
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        conversionRate: 1,
      },
      TokenBalancesController: {
        contractBalances: {},
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

const mockStore = configureMockStore();
const store = mockStore(initialState);

describe('CustomGasModal', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <CustomGasModal
          gasSelected={'high'}
          onChange={() => undefined}
          onCancel={() => undefined}
          isAnimating={false}
          onlyGas={false}
          validateAmount={() => undefined}
          updateParent={() => undefined}
          legacy={false}
          legacyGasData={{
            legacyGasLimit: '',
            suggestedGasPrice: '',
          }}
          EIP1559GasData={{
            maxFeePerGas: '0x0',
            maxPriorityFeePerGas: '0x0',
            suggestedMaxFeePerGas: '0x0',
            suggestedMaxPriorityFeePerGas: '0x0',
            suggestedGasLimit: '0x0',
          }}
          EIP1559GasTxn={{
            suggestedGasLimit: '0x0',
            totalMaxHex: '0x0',
            error: undefined,
          }}
          selectedAsset={{ address: '0xABC', symbol: 'ABC', decimals: 0 }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
