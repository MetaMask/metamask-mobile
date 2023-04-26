import React from 'react';
import { render } from '@testing-library/react-native';
import DrawerView from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('DrawerView', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <DrawerView />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
