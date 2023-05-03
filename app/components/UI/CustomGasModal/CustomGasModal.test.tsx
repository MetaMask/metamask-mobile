import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { fireEvent, render } from '@testing-library/react-native';

import Engine from '../../../core/Engine';
import { mockTheme, ThemeContext } from '../../../util/theme';
import CustomGasModal from './';

Engine.init({});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const KeyboardAwareScrollView = jest.requireActual('react-native').ScrollView;
  return { KeyboardAwareScrollView };
});

const gasSelected = 'high';
const dummyAddress = '0x0';

const initialState = {
  settings: {},
  transaction: {
    selectedAsset: {},
    transaction: {
      gas: '0x0',
      gasPrice: '0x0',
      data: '0x0'
    },
  },
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          dummyAddress: {
            balance: 200,
          },
        },
      },
      PreferencesController: {
        selectedAddress: dummyAddress,
        identities: {
          dummyAddress: {
            address: dummyAddress,
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

const mockedAction = jest.fn();
const updateParentAction = jest.fn();
const eip1559GasData = {
  maxFeePerGas: '0x0',
  maxPriorityFeePerGas: '0x1',
  suggestedMaxFeePerGas: '0x2',
  suggestedMaxPriorityFeePerGas: '0x3',
  suggestedGasLimit: '0x4',
};
const eip1559GasTxn = {
  suggestedGasLimit: '0x5',
        totalMaxHex: '0x6',
};

const legacyGasData = {
  legacyGasLimit: '',
            suggestedGasPrice: '',
};

describe('CustomGasModal', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <ThemeContext.Provider value={mockTheme}>
      <Provider store={store}>
        <CustomGasModal 
          gasSelected={gasSelected}
          onChange={mockedAction}
          onCancel={mockedAction}
          isAnimating={false}
          onlyGas={false}
          validateAmount={mockedAction}
          updateParent={updateParentAction}
          legacy={true}
          legacyGasData={legacyGasData}
        />
      </Provider>
      </ThemeContext.Provider>
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should contain gas price if legacy', () => {
    const { queryByText } = render(
      <ThemeContext.Provider value={mockTheme}>
      <CustomGasModal
      gasSelected={gasSelected}
      onChange={mockedAction}
      onCancel={mockedAction}
      isAnimating={false}
      onlyGas={false}
      validateAmount={mockedAction}
      updateParent={updateParentAction}
      legacy={true}
      legacyGasData={legacyGasData}
    />
    </ThemeContext.Provider>
    );

    expect(queryByText('Gas price')).toBeDefined();
    expect(queryByText('Gas limit must be at least 21000')).toBeDefined();
  });

  it('should contain gas fee if EIP1559 if legacy is false', () => {
    const { queryByText } = render(
      <ThemeContext.Provider value={mockTheme}>
      <CustomGasModal
      gasSelected={gasSelected}
      onChange={mockedAction}
      onCancel={mockedAction}
      isAnimating={false}
      onlyGas={false}
      validateAmount={mockedAction}
      updateParent={updateParentAction}
      legacy={false}
      EIP1559GasData={eip1559GasData}
      EIP1559GasTxn={eip1559GasTxn}  
    />
    </ThemeContext.Provider>
    );

    expect(queryByText('Max fee')).toBeDefined();
  });

  it('should call updateParent when saved', () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
      <CustomGasModal
      gasSelected={gasSelected}
      onChange={mockedAction}
      onCancel={mockedAction}
      isAnimating={false}
      onlyGas={false}
      validateAmount={mockedAction}
      updateParent={updateParentAction}
      legacy={true}
      legacyGasData={legacyGasData}
    />
      </ThemeContext.Provider>
    );

    const saveButton = getByText('Save');

    fireEvent.press(saveButton);
    expect(updateParentAction).toHaveBeenCalled();
  })
});
