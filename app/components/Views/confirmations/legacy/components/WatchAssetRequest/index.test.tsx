import React from 'react';
import WatchAssetRequest from '.';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    },
    AssetsContractController: {
      getERC20BalanceOf: jest.fn().mockResolvedValue('0'),
    },
    TokensController: {
      addToken: jest.fn(),
      ignoreTokens: jest.fn(),
    },
  },
}));

const initialState = {
  settings: {},
  engine: {
    backgroundState,
  },
};

describe('WatchAssetRequest', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(
      <WatchAssetRequest
        suggestedAssetMeta={{
          asset: { address: '0x0000000000000000000000000000000000000002', symbol: 'TKN', decimals: 0 },
          interactingAddress: '0x0000000000000000000000000000000000000001',
        }}
      />,
      { state: initialState },
    );
    expect(component).toMatchSnapshot();
  });
});
