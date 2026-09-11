import React from 'react';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import DeFiProtocolPositionGroupsV2 from './DeFiProtocolPositionGroupsV2';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockProtocolPositionGroup: DeFiProtocolPositionGroup = {
  protocolId: 'Aave V3',
  productName: 'Aave V3',
  protocolIconUrl: 'https://example.com/aave.png',
  chainId: 'eip155:1',
  marketValue: 4100.5,
  iconGroup: [{ symbol: 'USDC', avatarValue: 'https://example.com/usdc.png' }],
  sections: [
    {
      productName: 'Aave V3 Market',
      positions: [
        {
          assetId: 'eip155:1/erc20:0x1111111111111111111111111111111111111111',
          chainId: 'eip155:1',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          balance: '100.5',
          marketValue: 100.5,
          positionType: 'deposit',
          poolAddress: '0xpool1',
          groupId: 'g1',
          tokenImage: 'https://example.com/usdc.png',
        },
      ],
    },
    {
      productName: 'Aave V3 Staking',
      positions: [
        {
          assetId: 'eip155:1/erc20:0x2222222222222222222222222222222222222222',
          chainId: 'eip155:1',
          symbol: 'stETH',
          name: 'Staked ETH',
          decimals: 18,
          balance: '2',
          marketValue: 4000,
          positionType: 'staked',
          poolAddress: '0xpool2',
          groupId: 'g2',
          tokenImage: 'https://example.com/steth.png',
        },
      ],
    },
  ],
};

describe('DeFiProtocolPositionGroupsV2', () => {
  it('renders a section per product with its tokens, balances, and values', async () => {
    const { findByText } = renderWithProvider(
      <DeFiProtocolPositionGroupsV2
        protocolPositionGroup={mockProtocolPositionGroup}
        networkIconAvatar={10}
        privacyMode={false}
      />,
      { state: mockInitialState },
    );

    expect(await findByText('Aave V3 Market')).toBeOnTheScreen();
    expect(await findByText('Aave V3 Staking')).toBeOnTheScreen();

    expect(await findByText('USDC')).toBeOnTheScreen();
    expect(await findByText('deposit')).toBeOnTheScreen();
    expect(await findByText('$100.50')).toBeOnTheScreen();
    expect(await findByText('100.5 USDC')).toBeOnTheScreen();

    expect(await findByText('stETH')).toBeOnTheScreen();
    expect(await findByText('staked')).toBeOnTheScreen();
    expect(await findByText('$4,000.00')).toBeOnTheScreen();
    expect(await findByText('2 stETH')).toBeOnTheScreen();
  });

  it('hides market values in privacy mode', async () => {
    const { findByText, queryByText } = renderWithProvider(
      <DeFiProtocolPositionGroupsV2
        protocolPositionGroup={mockProtocolPositionGroup}
        networkIconAvatar={10}
        privacyMode
      />,
      { state: mockInitialState },
    );

    expect(await findByText('Aave V3 Market')).toBeOnTheScreen();
    expect(queryByText('$100.50')).not.toBeOnTheScreen();
    expect(queryByText('$4,000.00')).not.toBeOnTheScreen();
  });
});
