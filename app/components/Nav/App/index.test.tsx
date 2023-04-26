import React from 'react';
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

    const { toJSON } = render(<App />, {
      context: { store: mockStore(initialState) },
    });
    expect(toJSON()).toMatchSnapshot();
    expect(toJSON()).toMatchSnapshot();
  });
});
