import React from 'react';
import { render } from '@testing-library/react-native';
import SyncWithExtensionSuccess from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {};
const store = mockStore(initialState);

describe('SyncWithExtensionSuccess', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <SyncWithExtensionSuccess />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
