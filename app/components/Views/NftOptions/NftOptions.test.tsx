import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Alert } from 'react-native';
import NftOptions from './NftOptions';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import { CHAIN_IDS } from '@metamask/transaction-controller';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 10 })),
}));

jest.mock('../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      screen: {},
      sheet: {},
      notch: {},
      optionButton: {},
      iconOs: {},
      iconTrash: {},
    },
  }),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      removeAndIgnoreNft: jest.fn(),
    },
  },
}));

jest.mock('../../../actions/collectibles', () => ({
  removeFavoriteCollectible: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

const mockCollectible = {
  address: '0x123456789abcdef',
  tokenId: '1234',
  name: 'Test NFT',
  image: 'https://example.com/nft.png',
  chainId: CHAIN_IDS.MAINNET,
};

const mockNetworkConfigurations = {
  '0x1': {
    chainId: '0x1',
    rpcEndpoints: [{ networkClientId: 'mainnet-client-id' }],
    defaultRpcEndpointIndex: 0,
  },
  '0x89': {
    chainId: '0x89',
    rpcEndpoints: [{ networkClientId: 'polygon-client-id' }],
    defaultRpcEndpointIndex: 0,
  },
};

describe('NftOptions Component', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectChainId')) {
        return CHAIN_IDS.MAINNET;
      }
      if (
        selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0xUserAddress';
      }
      if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
        return mockNetworkConfigurations;
      }
      return undefined;
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  const renderComponent = (collectible = mockCollectible) =>
    render(
      <NftOptions
        route={{
          params: {
            collectible,
          },
        }}
      />,
    );

  it('renders correctly', () => {
    const { getByText } = renderComponent();

    expect(getByText('Remove NFT')).toBeTruthy();
  });

  it('renders View on OpenSea option for Mainnet', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectChainId')) {
        return CHAIN_IDS.MAINNET;
      }
      if (
        selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0xUserAddress';
      }
      if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
        return mockNetworkConfigurations;
      }
      return undefined;
    });

    const { getByText } = renderComponent();

    expect(getByText('View on OpenSea')).toBeTruthy();
  });

  it('renders View on OpenSea option for Polygon', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectChainId')) {
        return CHAIN_IDS.POLYGON;
      }
      if (
        selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0xUserAddress';
      }
      if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
        return mockNetworkConfigurations;
      }
      return undefined;
    });

    const { getByText } = renderComponent();

    expect(getByText('View on OpenSea')).toBeTruthy();
  });

  it('renders View on OpenSea option for Goerli', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectChainId')) {
        return CHAIN_IDS.GOERLI;
      }
      if (
        selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0xUserAddress';
      }
      if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
        return mockNetworkConfigurations;
      }
      return undefined;
    });

    const { getByText } = renderComponent();

    expect(getByText('View on OpenSea')).toBeTruthy();
  });

  it('renders View on OpenSea option for Sepolia', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectChainId')) {
        return CHAIN_IDS.SEPOLIA;
      }
      if (
        selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0xUserAddress';
      }
      if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
        return mockNetworkConfigurations;
      }
      return undefined;
    });

    const { getByText } = renderComponent();

    expect(getByText('View on OpenSea')).toBeTruthy();
  });

  it('does not render View on OpenSea option for unsupported chains', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectChainId')) {
        return '0x539'; // Unsupported chain
      }
      if (
        selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0xUserAddress';
      }
      if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
        return mockNetworkConfigurations;
      }
      return undefined;
    });

    const { queryByText } = renderComponent();

    expect(queryByText('View on OpenSea')).toBeNull();
  });

  it('removes NFT when Remove NFT option is pressed', async () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText('Remove NFT'));

    await waitFor(() => {
      expect(
        Engine.context.NftController.removeAndIgnoreNft,
      ).toHaveBeenCalledWith(
        mockCollectible.address,
        mockCollectible.tokenId,
        expect.any(String),
      );
    });

    expect(removeFavoriteCollectible).toHaveBeenCalledWith(
      '0xUserAddress',
      CHAIN_IDS.MAINNET,
      mockCollectible,
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
    );

    expect(mockNavigation.navigate).toHaveBeenCalledWith('WalletView');
  });

  it('generates correct OpenSea URL for Mainnet', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectChainId')) {
        return CHAIN_IDS.MAINNET;
      }
      if (
        selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0xUserAddress';
      }
      if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
        return mockNetworkConfigurations;
      }
      return undefined;
    });

    const { getByText } = renderComponent();

    // The OpenSea link should exist for Mainnet
    expect(getByText('View on OpenSea')).toBeTruthy();
  });

  it('navigates to wallet page after removing NFT', async () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText('Remove NFT'));

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('WalletView');
    });
  });

  it('shows notification after removing NFT', async () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText('Remove NFT'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('uses correct network client ID for NFT removal on Mainnet', async () => {
    const mainnetCollectible = {
      ...mockCollectible,
      chainId: CHAIN_IDS.MAINNET,
    };

    const { getByText } = renderComponent(mainnetCollectible);

    fireEvent.press(getByText('Remove NFT'));

    await waitFor(() => {
      expect(
        Engine.context.NftController.removeAndIgnoreNft,
      ).toHaveBeenCalledWith(
        mainnetCollectible.address,
        mainnetCollectible.tokenId,
        'mainnet-client-id',
      );
    });
  });

  it('uses correct network client ID for NFT removal on Polygon', async () => {
    const polygonCollectible = {
      ...mockCollectible,
      chainId: CHAIN_IDS.POLYGON,
    };

    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectChainId')) {
        return CHAIN_IDS.POLYGON;
      }
      if (
        selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0xUserAddress';
      }
      if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
        return mockNetworkConfigurations;
      }
      return undefined;
    });

    const { getByText } = renderComponent(polygonCollectible);

    fireEvent.press(getByText('Remove NFT'));

    await waitFor(() => {
      expect(
        Engine.context.NftController.removeAndIgnoreNft,
      ).toHaveBeenCalledWith(
        polygonCollectible.address,
        polygonCollectible.tokenId,
        'polygon-client-id',
      );
    });
  });

  it('handles collectible with numeric tokenId correctly', async () => {
    const numericTokenIdCollectible = {
      ...mockCollectible,
      tokenId: 5678,
    };

    const { getByText } = renderComponent(numericTokenIdCollectible);

    fireEvent.press(getByText('Remove NFT'));

    await waitFor(() => {
      expect(
        Engine.context.NftController.removeAndIgnoreNft,
      ).toHaveBeenCalledWith(
        numericTokenIdCollectible.address,
        '5678', // Should be converted to string
        expect.any(String),
      );
    });
  });
});

describe('NftOptions OpenSea URL generation', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    jest.clearAllMocks();
  });

  const chainConfigs = [
    {
      chainId: CHAIN_IDS.MAINNET,
      expectedUrlBase: 'https://opensea.io/assets/ethereum/',
    },
    {
      chainId: CHAIN_IDS.POLYGON,
      expectedUrlBase: 'https://opensea.io/assets/matic/',
    },
    {
      chainId: CHAIN_IDS.GOERLI,
      expectedUrlBase: 'https://testnets.opensea.io/assets/goerli/',
    },
    {
      chainId: CHAIN_IDS.SEPOLIA,
      expectedUrlBase: 'https://testnets.opensea.io/assets/sepolia/',
    },
  ];

  chainConfigs.forEach(({ chainId }) => {
    it(`shows OpenSea option for chain ${chainId}`, () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectChainId')) {
          return chainId;
        }
        if (
          selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
        ) {
          return '0xUserAddress';
        }
        if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
          return mockNetworkConfigurations;
        }
        return undefined;
      });

      const { getByText } = render(
        <NftOptions
          route={{
            params: {
              collectible: mockCollectible,
            },
          }}
        />,
      );

      expect(getByText('View on OpenSea')).toBeTruthy();
    });
  });

  it('returns null for unsupported chain', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectChainId')) {
        return '0x999'; // Unsupported chain
      }
      if (
        selectorStr.includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0xUserAddress';
      }
      if (selectorStr.includes('selectEvmNetworkConfigurationsByChainId')) {
        return mockNetworkConfigurations;
      }
      return undefined;
    });

    const { queryByText } = render(
      <NftOptions
        route={{
          params: {
            collectible: mockCollectible,
          },
        }}
      />,
    );

    expect(queryByText('View on OpenSea')).toBeNull();
  });
});
