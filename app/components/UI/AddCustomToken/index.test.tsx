import React from 'react';
import AddCustomToken from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

describe('AddCustomToken', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<AddCustomToken />, {
      state: mockInitialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
