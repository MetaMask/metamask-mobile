import type { Nft } from '@metamask/assets-controllers';

/** Minimal NFT payload so NftDetails / NftDetailsFullImage render without crashing. */
export const MOCK_NFT_COLLECTIBLE = {
  name: 'Dev Panel NFT',
  tokenId: '42',
  image: 'https://via.placeholder.com/512',
  imagePreview: 'https://via.placeholder.com/128',
  address: '0x7c3Ea2b7B3beFA1115aB51c09F0C9f245C500B18',
  backgroundColor: 'transparent',
  tokenURI: 'https://example.com/token/42',
  standard: 'ERC721',
  chainId: 1,
  description: 'Mock NFT for navigation dev panel testing.',
  favorite: false,
  isCurrentlyOwned: true,
} as Nft;

export const MOCK_WEBVIEW_PARAMS = {
  screen: 'SimpleWebview',
  params: {
    url: 'https://metamask.io',
    title: 'MetaMask',
  },
};

export const MOCK_ADD_BOOKMARK_PARAMS = {
  screen: 'AddBookmark',
  params: {
    title: 'MetaMask',
    url: 'https://metamask.io',
    onAddBookmark: () => {
      // Dev panel noop — real flow persists via Redux + spotlight indexing.
    },
  },
};

export const MOCK_OFFLINE_MODE_PARAMS = {
  screen: 'OfflineMode',
};

export const MOCK_NFT_DETAILS_PARAMS = {
  collectible: MOCK_NFT_COLLECTIBLE,
  source: 'mobile-nft-list' as const,
};

export const MOCK_NFT_FULL_IMAGE_PARAMS = {
  collectible: MOCK_NFT_COLLECTIBLE,
};
