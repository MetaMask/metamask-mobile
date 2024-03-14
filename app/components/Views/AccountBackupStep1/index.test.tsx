import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountBackupStep1 from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

describe('AccountBackupStep1', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<AccountBackupStep1 />);
    expect(toJSON()).toMatchSnapshot();
  });
});
