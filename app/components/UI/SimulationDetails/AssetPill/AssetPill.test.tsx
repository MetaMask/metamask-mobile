import React from 'react';

import AssetPill from './AssetPill';
import { AssetType, AssetIdentifier } from '../types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockNetworkState } from '../../../../util/test/network';
import { RootState } from '../../../../reducers';
import { SolScope } from '@metamask/keyring-api';

jest.mock(
  '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork',
  () => 'AvatarNetwork',
);
jest.mock('../../Name/Name', () => 'Name');
jest.mock('../../../hooks/useStyles', () => ({
  useStyles: () => ({ styles: {} }),
}));

const CHAIN_ID_MOCK = '0x123';

const STATE_MOCK = {
  engine: {
    backgroundState: {
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_ID_MOCK,
        }),
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetworkChainId: SolScope.Mainnet,

        multichainNetworkConfigurationsByChainId: {},
      },
    },
  },
} as unknown as RootState;

describe('AssetPill', () => {
  it('renders correctly for native assets', () => {
    const asset = {
      type: AssetType.Native,
      chainId: CHAIN_ID_MOCK,
    } as AssetIdentifier;

    const { getByText, getByTestId } = renderWithProvider(
      <AssetPill asset={asset} />,
      {
        state: STATE_MOCK,
      },
    );

    expect(
      getByTestId('simulation-details-asset-pill-avatar-network'),
    ).toBeTruthy();
    expect(getByText('ETH')).toBeTruthy();
  });

  it('renders Name component for ERC20 tokens', () => {
    const asset = {
      type: AssetType.ERC20,
      address: '0xabc123',
      chainId: CHAIN_ID_MOCK,
    } as AssetIdentifier;

    const { getByTestId } = renderWithProvider(<AssetPill asset={asset} />, {
      state: STATE_MOCK,
    });

    expect(getByTestId('simulation-details-asset-pill-name')).toBeTruthy();
  });
});
