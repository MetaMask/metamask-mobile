import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { RootState } from 'app/reducers';
import { backgroundState } from '../../../util/test/initial-root-state';
import NftDetails from './';
import { Collectible } from '../../../components/UI/CollectibleMedia/CollectibleMedia.types';
// eslint-disable-next-line import/no-namespace
import * as allSelectors from '../../../../app/reducers/collectibles/index.js';
import Routes from '../../../constants/navigation/Routes';

const TEST_COLLECTIBLE = {
  address: '0x7c3Ea2b7B3beFA1115aB51c09F0C9f245C500B18',
  tokenId: '23000044',
  favorite: false,
  isCurrentlyOwned: true,
  name: 'Aura #44',
  description:
    'Aura is a collection of 100 high resolution AI-generated portraits, exploring the boundaries of realism versus imagination... how far a portrait image can be deconstructed so that a sense of humanity and emotion would still remain? Aura plays with our appreciation of realistic details in photography.',
  image:
    'https://img.reservoir.tools/images/v2/mainnet/m8Rol%2FE80oMmjzi7K7IQ0u6HzXVyHUh6MaSEPbYQy1GRP1ztTkhG1VSzAwMMXv97QfX8ZgwGwpR8nf9yb12HQqI%2BXfaLY%2BhMdAJk7UThICr6sEjrTDK%2BhfdaXGiZnjM%2BawmNp3vHAw1Ev5N5b97XEQ%3D%3D.png?width=512',
  imageThumbnail:
    'https://img.reservoir.tools/images/v2/mainnet/m8Rol%2FE80oMmjzi7K7IQ0u6HzXVyHUh6MaSEPbYQy1GRP1ztTkhG1VSzAwMMXv97QfX8ZgwGwpR8nf9yb12HQqI%2BXfaLY%2BhMdAJk7UThICr6sEjrTDK%2BhfdaXGiZnjM%2BawmNp3vHAw1Ev5N5b97XEQ%3D%3D.png?width=250',
  imageOriginal:
    'https://media-proxy.artblocks.io/0x7c3ea2b7b3befa1115ab51c09f0c9f245c500b18/23000044.png',
  standard: 'ERC721',
  attributes: [
    {
      key: 'Title',
      kind: 'string',
      value: 'You Came To See Me',
      tokenCount: 1,
      onSaleCount: 0,
      floorAskPrice: null,
      topBidValue: null,
      createdAt: '2024-02-22T11:03:01.829Z',
    },
  ],
  topBid: {
    id: '0x853dc9bf7cdf966f2b59768b08dfd75816ae7adb7cf9ec12014bf8884ea4c71f',
    price: {
      currency: {
        contract: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
      },
      amount: {
        raw: '62600000000000000',
        decimal: 0.0626,
        usd: 188.98127,
        native: 0.0626,
      },
      netAmount: {
        raw: '62287000000000000',
        decimal: 0.06229,
        usd: 188.03636,
        native: 0.06229,
      },
    },
    source: {
      id: '0x5b3256965e7c3cf26e11fcaf296dfc8807c01073',
      domain: 'opensea.io',
      name: 'OpenSea',
      icon: 'https://raw.githubusercontent.com/reservoirprotocol/assets/main/sources/opensea-logo.svg',
      url: 'https://opensea.io/assets/ethereum/0x7c3ea2b7b3befa1115ab51c09f0c9f245c500b18/23000044',
    },
  },
  rarityRank: 1,
  rarityScore: 4,
  collection: {
    id: '0x7c3ea2b7b3befa1115ab51c09f0c9f245c500b18:23000000:23999999',
    name: 'Aura by Roope Rainisto',
    slug: 'aura-by-roope-rainisto',
    symbol: 'MOMENT-FLEX',
    contractDeployedAt: '2023-05-05T08:24:59.000Z',
    imageUrl:
      'https://img.reservoir.tools/images/v2/mainnet/m8Rol%2FE80oMmjzi7K7IQ0u6HzXVyHUh6MaSEPbYQy1GRP1ztTkhG1VSzAwMMXv97QfX8ZgwGwpR8nf9yb12HQqI%2BXfaLY%2BhMdAJk7UThICq3VpXqP8R9a7UJJWaudViqrlaZXcB%2B9WiV9avzgRprPEfJ1chTNYa3%2B36V9Areb6V%2BqwbskYYLZjPXCrV525seJSJnfQqrVwl64p9PV9sCkw%3D%3D?width=250',
    isSpam: false,
    isNsfw: false,
    metadataDisabled: false,
    openseaVerificationStatus: 'verified',
    tokenCount: '100',
    floorAsk: {
      id: '0x8d9ac3875c6939f9085346e9ff869af643a4d3085da1c6d4d1c47ce49360ca3f',
      price: {
        currency: {
          contract: '0x0000000000000000000000000000000000000000',
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        amount: {
          raw: '400000000000000000',
          decimal: 0.4,
          usd: 1206.43334,
          native: 0.4,
        },
      },
      maker: '0x02e1821ad27d690cf2ee2af83aaf957dacfd5966',
      validFrom: 1718582323,
      validUntil: 1721174204,
      source: {
        id: '0x5b3256965e7c3cf26e11fcaf296dfc8807c01073',
        domain: 'opensea.io',
        name: 'OpenSea',
        icon: 'https://raw.githubusercontent.com/reservoirprotocol/assets/main/sources/opensea-logo.svg',
        url: 'https://opensea.io/assets/ethereum/0x7c3ea2b7b3befa1115ab51c09f0c9f245c500b18/23000002',
      },
    },
    royaltiesBps: 1000,
    royalties: [
      { bps: 250, recipient: '0x43a7d26a271f5801b8092d94dfd5b36ea5d01f5f' },
      { bps: 750, recipient: '0x5f19463dda395e08b78b99a99c52413ed941edf7' },
    ],
  },
  logo: 'https://img.reservoir.tools/images/v2/mainnet/m8Rol%2FE80oMmjzi7K7IQ0u6HzXVyHUh6MaSEPbYQy1GRP1ztTkhG1VSzAwMMXv97QfX8ZgwGwpR8nf9yb12HQqI%2BXfaLY%2BhMdAJk7UThICq3VpXqP8R9a7UJJWaudViqrlaZXcB%2B9WiV9avzgRprPEfJ1chTNYa3%2B36V9Areb6V%2BqwbskYYLZjPXCrV525seJSJnfQqrVwl64p9PV9sCkw%3D%3D?width=250',
};

const mockUseParamsValues: {
  collectible: Collectible;
} = {
  collectible: TEST_COLLECTIBLE,
};

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      checkAndUpdateSingleNftOwnershipStatus: jest.fn(),
    },
  },
}));

type PartialDeepState<T> = {
  [P in keyof T]?: PartialDeepState<T[P]>;
};

const initialState = {
  engine: {
    backgroundState,
  },
};

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

const Stack = createStackNavigator();

const renderComponent = (state: PartialDeepState<RootState> = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="NftDetails">{() => <NftDetails />}</Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

describe('NftDetails', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should should show a disabled send button when NFT is no longer owned', async () => {
    const mockCollectibleSelectorData = [
      {
        address: '0x7c3Ea2b7B3beFA1115aB51c09F0C9f245C500B18',
        description: null,
        favorite: false,
        isCurrentlyOwned: false,
        standard: 'ERC721',
        tokenId: 23000044,
        tokenURI:
          'https://cloudflare-ipfs.com/ipfs/bafybeidxfmwycgzcp4v2togflpqh2gnibuexjy4m4qqwxp7nh3jx5zlh4y/20.json',
      },
    ];
    const spyOnContracts = jest
      .spyOn(allSelectors, 'collectiblesSelector')
      .mockReturnValue(mockCollectibleSelectorData);

    const { getByTestId } = renderComponent(initialState);
    const sendButton = getByTestId('send');

    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(sendButton.props.disabled).toBe(true);
    });

    spyOnContracts.mockRestore();
  });

  it('should navigate to nft options after clicking on more icon in navbar menu', () => {
    const { getByTestId } = renderComponent(initialState);
    const moreButton = getByTestId('more');

    fireEvent.press(moreButton);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: 'NftOptions',
      params: {
        collectible: TEST_COLLECTIBLE,
      },
    });
  });
});
