import React from 'react';
import WatchAssetRequest from '.';
import { AssetWatcherSelectorsIDs } from './AssetWatcher.testIds';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Engine from '../../../../../../core/Engine';

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
    SelectedNetworkController: {
      getNetworkClientIdForDomain: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
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
    const { getByTestId } = renderWithProvider(
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
    expect(getByTestId(AssetWatcherSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('queries token balance on the dapp-selected network', () => {
    Engine.context.SelectedNetworkController.getNetworkClientIdForDomain.mockReturnValue(
      'bsc-network',
    );
    Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
      { chainId: '0x38' },
    );

    const { getByTestId } = renderWithProvider(
      <WatchAssetRequest
        origin="https://dapp.example"
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

    expect(
      Engine.context.SelectedNetworkController.getNetworkClientIdForDomain,
    ).toHaveBeenCalledWith('https://dapp.example');
    expect(
      Engine.context.AssetsContractController.getERC20BalanceOf,
    ).toHaveBeenCalledWith(
      '0x0000000000000000000000000000000000000002',
      '0x0000000000000000000000000000000000000001',
      'bsc-network',
    );
    expect(getByTestId(AssetWatcherSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });
});
