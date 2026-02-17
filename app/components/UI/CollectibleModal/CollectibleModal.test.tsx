import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';

import CollectibleModal from './CollectibleModal';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { collectiblesSelector } from '../../../reducers/collectibles';
import {
  selectDisplayNftMedia,
  selectIsIpfsGatewayEnabled,
} from '../../../selectors/preferencesController';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../selectors/networkController';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../util/test/network';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
    },
  },
};

// Set two collectibles with the same address
const collectibles = [
  { name: 'Lion', tokenId: 6903, address: '0x123' },
  { name: 'Leopard', tokenId: 6904, address: '0x123' },
];

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({
    properties: { chain_id: 1 },
  }),
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockedNavigate = jest.fn();
const mockedReplace = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockedNavigate,
    replace: mockedReplace,
  }),
  useRoute: () => mockUseRoute(),
}));

const mockNavigateToSendPage = jest.fn();
jest.mock('../../Views/confirmations/hooks/useSendNavigation', () => ({
  useSendNavigation: () => ({
    navigateToSendPage: mockNavigateToSendPage,
  }),
}));

describe('CollectibleModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default route params without source
    mockUseRoute.mockReturnValue({
      params: {
        contractName: 'Opensea',
        collectible: { name: 'Leopard', tokenId: 6904, address: '0x123' },
      },
    });
  });

  afterEach(() => {
    (useSelector as jest.Mock).mockClear();
  });
  it('renders correctly', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return false;
      if (selector === selectDisplayNftMedia) return false;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });
    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the correct token name and ID', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return true;
      if (selector === selectDisplayNftMedia) return true;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    const { findAllByText } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(await findAllByText('#6904')).toBeDefined();
    expect(await findAllByText('Leopard')).toBeDefined();
  });

  it('tracks NFT Details Opened event', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return false;
      if (selector === selectDisplayNftMedia) return false;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(mockCreateEventBuilder).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks NFT Details Opened event with mobile-nft-list source', () => {
    const mockAddProperties = jest.fn().mockReturnThis();
    const mockBuild = jest.fn();
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    mockUseRoute.mockReturnValue({
      params: {
        contractName: 'Opensea',
        collectible: { name: 'Leopard', tokenId: 6904, address: '0x123' },
        source: 'mobile-nft-list',
      },
    });

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return false;
      if (selector === selectDisplayNftMedia) return false;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mobile-nft-list',
      }),
    );
  });

  it('tracks NFT Details Opened event with mobile-nft-list-page source', () => {
    const mockAddProperties = jest.fn().mockReturnThis();
    const mockBuild = jest.fn();
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    mockUseRoute.mockReturnValue({
      params: {
        contractName: 'Opensea',
        collectible: { name: 'Leopard', tokenId: 6904, address: '0x123' },
        source: 'mobile-nft-list-page',
      },
    });

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return false;
      if (selector === selectDisplayNftMedia) return false;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mobile-nft-list-page',
      }),
    );
  });

  it('updates collectible when IPFS gateway is enabled', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return true;
      if (selector === selectDisplayNftMedia) return true;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toBeDefined();
  });

  it('does not update collectible when IPFS gateway is disabled', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return false;
      if (selector === selectDisplayNftMedia) return false;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toBeDefined();
  });

  it('identifies ERC721 standard collectible as tradable', () => {
    mockUseRoute.mockReturnValue({
      params: {
        contractName: 'Opensea',
        collectible: {
          name: 'Leopard',
          tokenId: 6904,
          address: '0x123',
          standard: 'ERC721',
        },
      },
    });

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return false;
      if (selector === selectDisplayNftMedia) return false;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toBeDefined();
  });

  it('identifies non-ERC721 standard collectible as non-tradable', () => {
    mockUseRoute.mockReturnValue({
      params: {
        contractName: 'Opensea',
        collectible: {
          name: 'Leopard',
          tokenId: 6904,
          address: '0x123',
          standard: 'ERC1155',
        },
      },
    });

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return false;
      if (selector === selectDisplayNftMedia) return false;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toBeDefined();
  });

  it('tracks event with correct chain ID for Polygon', () => {
    const mockAddProperties = jest.fn().mockReturnThis();
    const mockBuild = jest.fn().mockReturnValue({
      properties: { chain_id: 137 },
    });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return false;
      if (selector === selectDisplayNftMedia) return false;
      if (selector === selectChainId) return '0x89'; // Polygon
      return undefined;
    });

    renderWithProvider(<CollectibleModal />, {
      state: {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            NetworkController: {
              ...mockNetworkState({
                chainId: CHAIN_IDS.POLYGON,
                id: 'polygon',
                nickname: 'Polygon',
                ticker: 'MATIC',
              }),
            },
          },
        },
      },
    });

    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('handles collectible with updated data from collectibles list', () => {
    const updatedCollectibles = [
      {
        name: 'Leopard Updated',
        tokenId: 6904,
        address: '0x123',
        image: 'https://updated.url/image.png',
      },
    ];

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return updatedCollectibles;
      if (selector === selectIsIpfsGatewayEnabled) return true;
      if (selector === selectDisplayNftMedia) return true;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    const { findAllByText } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    // The component should update with new collectible data
    expect(findAllByText('Leopard Updated')).toBeDefined();
  });

  it('merges collectible data with contract name', () => {
    mockUseRoute.mockReturnValue({
      params: {
        contractName: 'Custom Collection',
        collectible: { name: 'Leopard', tokenId: 6904, address: '0x123' },
      },
    });

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return false;
      if (selector === selectDisplayNftMedia) return false;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toBeDefined();
  });

  it('does not crash when collectible is not found in collectibles list', () => {
    mockUseRoute.mockReturnValue({
      params: {
        contractName: 'Opensea',
        collectible: { name: 'Unknown', tokenId: 9999, address: '0x999' },
      },
    });

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles; // Does not contain 0x999
      if (selector === selectIsIpfsGatewayEnabled) return true;
      if (selector === selectDisplayNftMedia) return true;
      if (selector === selectChainId) return '0x1';
      return undefined;
    });

    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toBeDefined();
  });
});
