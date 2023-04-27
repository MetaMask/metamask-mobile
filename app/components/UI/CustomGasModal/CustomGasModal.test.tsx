import React from 'react';
import configureMockStore from 'redux-mock-store';
import { render } from 'enzyme';
import CustomGasModal from '.';
import { Provider } from 'react-redux';
import Engine from '../../../core/Engine';

Engine.init();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
}));

const initialState = {
  settings: {},
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
          gasSelected={''}
          onChange={undefined}
          onCancel={undefined}
          isAnimating={undefined}
          onlyGas={false}
          validateAmount={undefined}
          updateParent={undefined}
          legacy={false}
          legacyGasObj={{
            legacyGasLimit: '',
            suggestedGasPrice: '',
          }}
          EIP1559GasObj={{
            maxFeePerGas: '',
            maxPriorityFeePerGas: '',
            suggestedMaxFeePerGas: '',
            suggestedMaxPriorityFeePerGas: '',
            suggestedGasLimit: '',
          }}
          EIP1559GasTxn={{
            suggestedGasLimit: '',
            totalMaxHex: '',
            error: undefined,
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
