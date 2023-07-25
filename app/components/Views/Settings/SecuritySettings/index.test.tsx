import React from 'react';
import { shallow } from 'enzyme';
import SecuritySettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { lockTime: 1000 },
  user: { passwordSet: true },
  engine: {
    backgroundState: initialBackgroundState,
  },
  security: {
    allowLoginWithRememberMe: true,
  },
};
const store = mockStore(initialState);

describe('SecuritySettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <SecuritySettings />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
