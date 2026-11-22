import React from 'react';
import WatchAssetRequest from '.';
import { AssetWatcherSelectorsIDs } from './AssetWatcher.testIds';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';

// Mock ApproveTransactionHeader to avoid deep render tree accessing Engine.context
let mockCapturedHeaderProps: Record<string, unknown> | undefined;
jest.mock('../ApproveTransactionHeader', () => {
  const MockReact = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockCapturedHeaderProps = props;
      return MockReact.createElement('View');
    },
  };
});

const mockGetERC20BalanceOf = jest.fn().mockResolvedValue(null);
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC20BalanceOf: mockGetERC20BalanceOf,
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapturedHeaderProps = undefined;
  });

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

  it('shows the dapp-selected network and its balance when the request carries them', () => {
    const { getByTestId } = renderWithProvider(
      <WatchAssetRequest
        suggestedAssetMeta={{
          asset: {
            address: '0x0000000000000000000000000000000000000002',
            symbol: 'TKN',
            decimals: 0,
          },
          interactingAddress: '0x0000000000000000000000000000000000000001',
          chainId: '0x1234',
          networkClientId: 'custom-network-client-id',
        }}
      />,
      { state: initialState },
    );
    expect(getByTestId(AssetWatcherSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    // The header shows the dapp chain, not the globally active one.
    expect(mockCapturedHeaderProps?.chainId).toBe('0x1234');
    // The balance is queried on the dapp network, not the global one.
    expect(mockGetERC20BalanceOf).toHaveBeenCalledWith(
      '0x0000000000000000000000000000000000000002',
      '0x0000000000000000000000000000000000000001',
      'custom-network-client-id',
    );
  });
});
