import React from 'react';
import Collectibles from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { SolScope } from '@metamask/keyring-api';
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});
describe('Collectibles', () => {
  it('should render empty collectibles correctly', () => {
    const { toJSON } = renderWithProvider(<Collectibles />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly collectibles', () => {
    const testCollectibles = [
      {
        address: '0x0fFf2B70d503f5D2338baBFBD5543Bf79f38b936',
        attributes: ['Array'],
        chainId: 1,
        collection: ['Object'],
        description: 'New parrot',
        favorite: false,
        image:
          'https://img.reservoir.tools/images/v2/mainnet/7%2FrdF%2Fe%2F0iXY8HduhRCoIehkmFeXPeOQQFbbmIPfjCYLapx5D%2FHfgAdkVqiLDYeAuYvkErlgvEb4j3GXPLlSSxRuSpAPzzdPW09BoCPpfOXSHgGi%2BecZL9GPQzFwIkBgPCmRnk7MRRaqdrVLVr3GdQ%3D%3D.png?width=512',
        imageOriginal:
          'ipfs://bafybeibdpyixlnmk5fqnexn4zchpiiygmbxzb2gvlip26bekiu5yzj4mra/2',
        imageThumbnail:
          'https://img.reservoir.tools/images/v2/mainnet/7%2FrdF%2Fe%2F0iXY8HduhRCoIehkmFeXPeOQQFbbmIPfjCYLapx5D%2FHfgAdkVqiLDYeAuYvkErlgvEb4j3GXPLlSSxRuSpAPzzdPW09BoCPpfOXSHgGi%2BecZL9GPQzFwIkBgPCmRnk7MRRaqdrVLVr3GdQ%3D%3D.png?width=250',
        isCurrentlyOwned: true,
        lastSale: ['Object'],
        name: 'Parrot',
        rarityRank: 2,
        rarityScore: 10.667,
        standard: 'ERC1155',
        tokenId: '2',
      },
    ];
    const { toJSON } = renderWithProvider(
      <Collectibles
        collectibles={testCollectibles}
        navigation={{ navigate: jest.fn(), goBack: jest.fn() }}
      />,
      {
        state: {
          engine: {
            backgroundState: {
              PreferencesController: {
                displayNftMedia: false,
                isIpfsGatewayEnabled: false,
              },
              MultichainNetworkController: {
                selectedMultichainNetworkChainId: SolScope.Mainnet,
              },
            },
          },
        },
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
