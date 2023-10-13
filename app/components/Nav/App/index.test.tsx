import React from 'react';
import { shallow } from 'enzyme';
import App from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('App', () => {
  it('should render correctly when logged in', () => {
    const initialState = {
      user: {
        loggedIn: true,
      },
    };

    const wrapper = shallow(<App />, {
      context: { store: mockStore(initialState) },
    });
    expect(wrapper).toMatchSnapshot();
    expect(wrapper).toMatchSnapshot();
  });
});
