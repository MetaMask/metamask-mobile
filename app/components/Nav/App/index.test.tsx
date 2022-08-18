import React from 'react';
import { shallow } from 'enzyme';
import App from './';
import configureMockStore from 'redux-mock-store';
import { MAINNET } from '../../../constants/network';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        provider: {
          type: MAINNET,
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('App', () => {
  it('should render correctly when logged in', () => {
    const state = {
      user: {
        loggedIn: true,
      },
    };

    const wrapper = shallow(
      <Provider store={store}>
        <App />
      </Provider>,
      {
        context: { store: mockStore(state) },
      },
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper).toMatchSnapshot();
  });
});
