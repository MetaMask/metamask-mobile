import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import Asset from './';
import Engine from '../../../core/Engine';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../selectors/accountsController.test';

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine.ts', () => ({
  init: () => mockedEngine.init({}),
  context: {
    KeyringController: {
      getQRKeyringState: async () => ({ subscribe: () => ({}) }),
    },
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
