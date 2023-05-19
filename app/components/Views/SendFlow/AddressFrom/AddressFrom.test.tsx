import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { render } from '@testing-library/react-native';

import SendFlowAddressFrom from './';

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  isQRHardwareAccount: jest.fn(),
}));

jest.mock('../../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../../util/ENSUtils'),
  doENSReverseLookup: jest.fn(),
}));

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
            balance: '0x0',
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

describe('SendFlowAddressFrom', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <SendFlowAddressFrom fromAccountBalanceState={() => undefined} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
