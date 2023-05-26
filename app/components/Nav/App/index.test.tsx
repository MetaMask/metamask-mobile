import React from 'react';
import { shallow } from 'enzyme';
import App from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const initialState = {
  user: {
    loggedIn: true,
  },
};
const mockStore = configureMockStore();
const store = mockStore(initialState);

describe('App', () => {
  it('should render correctly when logged in', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
