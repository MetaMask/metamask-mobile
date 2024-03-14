import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

describe('NetworksSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NetworksSettings navigation={{ setOptions: jest.fn() }} />,
      {
        state: initialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
