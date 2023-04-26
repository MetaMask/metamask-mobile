import React from 'react';
import AccountApproval from './';
import { render } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { ROPSTEN } from '../../../constants/network';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: { '0x2': { balance: '0' } },
      },
      NetworkController: {
        providerConfig: {
          type: ROPSTEN,
        },
      },
      TokensController: {
        tokens: [],
      },
      PreferencesController: {
        selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
        identities: {
          '0xe7E125654064EEa56229f273dA586F10DF96B0a1': { name: 'Account 1' },
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('AccountApproval', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AccountApproval
          currentPageInformation={{ icon: '', url: '', title: '' }}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
