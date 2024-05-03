import React from 'react';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';

import BlockaidSettings from './BlockaidSettings';

const initialState = {
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { lockTime: 1000 },
  user: { passwordSet: true },
  engine: {
    backgroundState: initialBackgroundState,
  },
  security: {},
};

describe('BlockaidSettings', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(<BlockaidSettings />, {
      state: initialState,
    });
    expect(wrapper.toJSON()).toMatchSnapshot();
  });
});
