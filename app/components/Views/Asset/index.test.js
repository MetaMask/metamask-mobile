import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import Asset from './';
import Engine from '../../../core/Engine';

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

jest.mock('../../../core/Engine.ts', () => ({
  init: () => mockedEngine.init({}),
  context: {
    KeyringController: {
      getOrAddQRKeyring: async () => ({ subscribe: () => ({}) }),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
  },
}));

describe('Asset', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: () => null }}
        route={{ params: { symbol: 'ETH', address: 'something', isETH: true } }}
        transactions={[]}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
