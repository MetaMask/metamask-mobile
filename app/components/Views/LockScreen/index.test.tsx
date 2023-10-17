import React from 'react';
import { shallow } from 'enzyme';
import LockScreen from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  user: {
    passwordSet: false,
  },
};
const store = mockStore(initialState);

describe('LockScreen', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <LockScreen />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
