import React from 'react';
import WatchAssetRequest from '.';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';

// Mock ApproveTransactionHeader to avoid deep render tree accessing Engine.context
jest.mock('../ApproveTransactionHeader', () => {
  const MockReact = jest.requireActual('react');
  return {
    __esModule: true,
    default: () => MockReact.createElement('View'),
  };
});

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC20BalanceOf: jest.fn().mockResolvedValue(null),
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
    const { toJSON } = renderWithProvider(
      <WatchAssetRequest
        suggestedAssetMeta={{
          asset: {
            address: '0x0000000000000000000000000000000000000002',
            symbol: 'TKN',
            decimals: 0,
          },
          interactingAddress: '0x0000000000000000000000000000000000000001',
        }}
      />,
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
