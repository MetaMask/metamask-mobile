import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Onboarding from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
};

const routeProp = {
  route: {
    params: {
      screen: 'Onboarding',
    },
  },
};

describe('Onboarding', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <Onboarding route={routeProp} navigation={{ setOptions: () => null }} />,
      {
        state: mockInitialState,
      },
    );
    expect(wrapper).toMatchSnapshot();
  });
});
