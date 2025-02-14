import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { render } from '@testing-library/react-native';

import SendFlowAddressFrom from '.';
import { backgroundState } from '../../../../../util/test/initial-root-state';

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
      ...backgroundState,
      AccountTrackerController: {
        accounts: {
          '0xd018538C87232FF95acbCe4870629b75640a78E7': {
            balance: '0x0',
          },
        },
        accountsByChainId: {
          '0x1': {
            '0xd018538C87232FF95acbCe4870629b75640a78E7': {
              balance: '0x0',
            },
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            '30313233-3435-4637-b839-383736353430': {
              // Lower case address to test edge case
              address: '0xd018538c87232ff95acbce4870629b75640a78e7',
              id: '30313233-3435-4637-b839-383736353430',
              options: {},
              metadata: {
                name: 'Account 1',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              methods: [
                'personal_sign',
                'eth_signTransaction',
                'eth_signTypedData_v1',
                'eth_signTypedData_v3',
                'eth_signTypedData_v4',
              ],
              type: 'eip155:eoa',
            },
          },
          selectedAccount: '30313233-3435-4637-b839-383736353430',
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
          chainId="0x1"
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
