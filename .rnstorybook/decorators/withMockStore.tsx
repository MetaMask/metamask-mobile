// Third party dependencies
import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

// External dependencies
import { storybookStore } from '../storybook-store';

const mockStore = configureMockStore();
const store = mockStore(storybookStore);

const withMockStore = (Story: React.ComponentType) => (
  <Provider store={store}>
    <Story />
  </Provider>
);

export default withMockStore;
