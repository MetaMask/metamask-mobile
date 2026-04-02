import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import NftOptions from './NftOptions';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Collectible } from '../../UI/CollectibleMedia/CollectibleMedia.types';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../selectors/networkController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';

const mockDismissModal = jest.fn((callback?: () => void) => {
  if (callback) callback();
});

jest.mock('../../UI/ReusableModal', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return ReactActual.forwardRef(
    (
      { children }: { children: React.ReactNode },
      ref: React.Ref<{ dismissModal: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        dismissModal: mockDismissModal,
      }));
      return <RNView testID="reusable-modal">{children}</RNView>;
    },
  );
});

const mockCollectible: Collectible = {
  name: 'Test NFT',
  tokenId: '42',
  image: 'https://example.com/nft.png',
  imagePreview: 'https://example.com/nft-preview.png',
  address: '0xNFTAddress',
  backgroundColor: 'transparent',
  tokenURI: 'https://example.com/token/42',
  standard: 'ERC721',
  error: undefined,
  chainId: 1,
};

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useRoute: () => ({ params: { collectible: mockCollectible } }),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 10, top: 0, left: 0, right: 0 })),
}));

jest.mock('../../../component-library/hooks', () => ({
  useStyles: () => ({ styles: {} }),
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

jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

const networkConfigurations = {
  '0x1': {
    rpcEndpoints: [{ networkClientId: 'mainnet-client' }],
    defaultRpcEndpointIndex: 0,
  },
};

const setupSelectorMock = (chainId: string) => {
  (useSelector as jest.Mock).mockImplementation((selector) => {
    if (selector === selectChainId) return chainId;
    if (selector === selectSelectedInternalAccountFormattedAddress)
      return '0xUserAddress';
    if (selector === selectEvmNetworkConfigurationsByChainId)
      return networkConfigurations;
    return undefined;
  });
};

describe('NftOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    setupSelectorMock(CHAIN_IDS.MAINNET);
  });

  it('renders the remove NFT option', () => {
    const { getByText } = render(<NftOptions />);
    expect(getByText('Remove NFT')).toBeOnTheScreen();
  });

  it('renders the OpenSea link when on mainnet', () => {
    const { getByText } = render(<NftOptions />);
    expect(getByText('View on OpenSea')).toBeOnTheScreen();
  });

  it('does not render the OpenSea link for unsupported chains', () => {
    setupSelectorMock('0x999');

    const { queryByText } = render(<NftOptions />);
    expect(queryByText('View on OpenSea')).not.toBeOnTheScreen();
  });

  it('renders the OpenSea link on Polygon', () => {
    setupSelectorMock(CHAIN_IDS.POLYGON);

    const { getByText } = render(<NftOptions />);
    expect(getByText('View on OpenSea')).toBeTruthy();
  });

  it('renders the OpenSea link on Goerli', () => {
    setupSelectorMock(CHAIN_IDS.GOERLI);

    const { getByText } = render(<NftOptions />);
    expect(getByText('View on OpenSea')).toBeTruthy();
  });

  it('renders the OpenSea link on Sepolia', () => {
    setupSelectorMock(CHAIN_IDS.SEPOLIA);

    const { getByText } = render(<NftOptions />);
    expect(getByText('View on OpenSea')).toBeTruthy();
  });

  it('navigates to OpenSea via browser when tapped on mainnet', () => {
    const { getByText } = render(<NftOptions />);
    fireEvent.press(getByText('View on OpenSea'));

    expect(mockDismissModal).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: `https://opensea.io/assets/ethereum/${mockCollectible.address}/${mockCollectible.tokenId}`,
      },
    });
  });

  it('navigates to OpenSea testnets URL on Sepolia', () => {
    setupSelectorMock(CHAIN_IDS.SEPOLIA);

    const { getByText } = render(<NftOptions />);
    fireEvent.press(getByText('View on OpenSea'));

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: `https://testnets.opensea.io/assets/sepolia/${mockCollectible.address}/${mockCollectible.tokenId}`,
      },
    });
  });

  it('navigates to OpenSea with matic path on Polygon', () => {
    setupSelectorMock(CHAIN_IDS.POLYGON);

    const { getByText } = render(<NftOptions />);
    fireEvent.press(getByText('View on OpenSea'));

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: `https://opensea.io/assets/matic/${mockCollectible.address}/${mockCollectible.tokenId}`,
      },
    });
  });

  it('removes NFT and shows alert when remove option is pressed', () => {
    jest.spyOn(Alert, 'alert');

    const { getByText } = render(<NftOptions />);
    fireEvent.press(getByText('Remove NFT'));

    expect(removeFavoriteCollectible).toHaveBeenCalledWith(
      '0xUserAddress',
      CHAIN_IDS.MAINNET,
      mockCollectible,
    );
    expect(
      Engine.context.NftController.removeAndIgnoreNft,
    ).toHaveBeenCalledWith(
      mockCollectible.address,
      mockCollectible.tokenId.toString(),
      'mainnet-client',
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      'Collectible removed!',
      expect.any(String),
    );
  });

  it('navigates to wallet home after removing NFT', () => {
    const { getByText } = render(<NftOptions />);
    fireEvent.press(getByText('Remove NFT'));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        screen: expect.any(String),
        params: expect.objectContaining({
          screen: 'WalletView',
        }),
      }),
    );
  });
});
