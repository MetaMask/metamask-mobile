import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import NavbarBrowserTitle from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import Engine from '../../../core/Engine';

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init({}),
  context: {
    NetworkController: {
      state: {
        providerConfig: { chainId: '0x1' },
      },
    },
  },
}));

describe('NavbarBrowserTitle', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NavbarBrowserTitle hostname={'faucet.metamask.io'} https />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
