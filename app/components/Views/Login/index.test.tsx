import React from 'react';
import { shallow } from 'enzyme';
import Login from './';
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
        provider: {
          type: ROPSTEN,
        },
      },
      TokensController: {
        tokens: [],
      },
      PreferencesController: {},
    },
  },
  user: {
    passwordSet: true,
  },
};
const store = mockStore(initialState);

describe('Login', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Login />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
