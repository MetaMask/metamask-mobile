import React from 'react';
import { render } from '@testing-library/react-native';
import { UpdateNeeded } from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('UpdateNeeded', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <UpdateNeeded />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
