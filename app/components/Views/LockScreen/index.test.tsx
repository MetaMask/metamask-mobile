import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import LockScreen from './';

const initialState = {
  user: {
    passwordSet: false,
  },
};

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        state: {
          securityAlertsEnabled: true,
          selectedAddress: '0x43727620ca89a4fC2878De582A6AF7c5E4596b70',
        },
      },
    },
  },
};

describe('LockScreen', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <LockScreen route={{ params: {} }} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
