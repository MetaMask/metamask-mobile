import React from 'react';
import { shallow } from 'enzyme';
import Login from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
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
