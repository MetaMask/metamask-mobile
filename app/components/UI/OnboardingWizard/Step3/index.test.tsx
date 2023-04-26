import React from 'react';
import Step3 from './';
import { render } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
        identities: {
          '0xe7E125654064EEa56229f273dA586F10DF96B0a1': { name: 'Account 1' },
        },
      },
      AccountTrackerController: {
        accounts: {
          '0xe7E125654064EEa56229f273dA586F10DF96B0a1': {
            name: 'account 1',
            address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
            balance: 0,
          },
        },
      },
      CurrencyRateController: {
        currentCurrecy: 'USD',
      },
    },
  },
};
const store = mockStore(initialState);

describe('Step3', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <Step3 coachmarkRef={{}} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
