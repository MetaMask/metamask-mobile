import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import Asset from './';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Asset', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <Asset transactions={[]} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
