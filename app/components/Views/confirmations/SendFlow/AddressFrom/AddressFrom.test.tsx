import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { render } from '@testing-library/react-native';

import SendFlowAddressFrom from '.';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';

jest.mock('../../../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../../../util/ENSUtils'),
  doENSReverseLookup: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0xd018538C87232FF95acbCe4870629b75640a78E7'],
          },
        ],
      },
    },
  },
}));

const mockInitialState = {
  settings: {},
  transaction: {
    selectedAsset: {
      address: '0xd018538C87232FF95acbCe4870629b75640a78E7',
      decimals: 18,
      symbol: 'ETH',
    },
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountTrackerController: {
        accounts: {
          '0xd018538C87232FF95acbCe4870629b75640a78E7': {
            balance: '0x0',
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0xd018538C87232FF95acbCe4870629b75640a78E7',
        identities: {
          '0xd018538C87232FF95acbCe4870629b75640a78E7': {
            address: '0xd018538C87232FF95acbCe4870629b75640a78E7',
            name: 'Account 1',
          },
        },
      },
      KeyringController: {
        state: {
          keyrings: [],
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

const mockStore = configureMockStore();
const store = mockStore(mockInitialState);

describe('SendFlowAddressFrom', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <SendFlowAddressFrom
          fromAccountBalanceState={jest.fn}
          setFromAddress={jest.fn}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
