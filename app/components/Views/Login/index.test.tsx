import React from 'react';
import { shallow } from 'enzyme';
import Login from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
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
