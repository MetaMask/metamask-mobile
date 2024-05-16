import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

import DAPPDisconnectModal from './index';

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const store = mockStore(initialState);

jest.mock('../../hooks/useRejectionToRequestFromOriginInfo', () => () => ({
  blockedOrigins: ['www.test.com'],
}));

function render() {
  return renderWithProvider(
    <Provider store={store}>
      <DAPPDisconnectModal />
    </Provider>,
  );
}

describe('DAPPDisconnectModal', () => {
  it('should render correctly', () => {
    const wrapper = render();
    expect(wrapper).toMatchSnapshot();
  });
});
