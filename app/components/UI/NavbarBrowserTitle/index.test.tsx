import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import NavbarBrowserTitle from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Engine from '../../../core/Engine';

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState,
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
