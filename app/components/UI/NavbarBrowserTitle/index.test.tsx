import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import NavbarBrowserTitle from './';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

describe('NavbarBrowserTitle', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(
      <NavbarBrowserTitle hostname={'faucet.metamask.io'} https />,
      { state: mockInitialState },
    );
    expect(getByText('faucet.metamask.io')).toBeOnTheScreen();
  });
});
