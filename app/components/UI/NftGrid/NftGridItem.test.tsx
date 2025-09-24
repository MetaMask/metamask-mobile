import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NftGridItem from './NftGridItem';
import { Nft } from '@metamask/assets-controllers';

const mockNavigate = jest.fn();
const mockOnLongPress = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../CollectibleMedia', () => {
  const MockCollectibleMedia = () => null;
  MockCollectibleMedia.displayName = 'CollectibleMedia';
  return MockCollectibleMedia;
});

jest.mock('@metamask/design-system-react-native', () => ({
  Text: ({ children }: { children: React.ReactNode }) => children,
  TextVariant: {
    BodyMd: 'BodyMd',
    BodySm: 'BodySm',
  },
}));

// Mock debounce to execute immediately for testing
jest.mock('lodash', () => ({
  debounce: (fn: (...args: unknown[]) => unknown) => fn,
}));

describe('NftGridItem', () => {
  const mockNft: Nft = {
    address: '0x123',
    tokenId: '456',
    name: 'Test NFT',
    image: 'https://example.com/nft.png',
    collection: {
      name: 'Test Collection',
    },
    chainId: 1,
    isCurrentlyOwned: true,
    standard: 'ERC721',
  } as Nft;

  const defaultProps = {
    item: mockNft,
    chainId: '0x1' as const,
    onLongPress: mockOnLongPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = render(<NftGridItem {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays NFT information correctly', () => {
    const { toJSON } = render(<NftGridItem {...defaultProps} />);

    // Check that component renders without crashing
    const rendered = toJSON();
    expect(rendered).toBeDefined();
    // Component structure should include the necessary elements
    expect(rendered).toHaveProperty('type', 'View');
  });

  it('handles NFT without name gracefully', () => {
    const nftWithoutName = { ...mockNft, name: null };
    const { toJSON } = render(
      <NftGridItem {...defaultProps} item={nftWithoutName} />,
    );

    // Should render without crashing
    expect(toJSON()).toBeDefined();
  });

  it('handles NFT without collection name gracefully', () => {
    const nftWithoutCollection = {
      ...mockNft,
      collection: { name: undefined },
    };
    const { toJSON } = render(
      <NftGridItem {...defaultProps} item={nftWithoutCollection} />,
    );

    // Should render without crashing
    expect(toJSON()).toBeDefined();
  });

  it('navigates to NFT details on press', () => {
    const { getByTestId } = render(<NftGridItem {...defaultProps} />);

    const collectibleButton = getByTestId('collectible-Test NFT-456');
    fireEvent.press(collectibleButton);

    expect(mockNavigate).toHaveBeenCalledWith('NftDetails', {
      collectible: mockNft,
    });
  });

  it('calls onLongPress when long pressed', () => {
    const { getByTestId } = render(<NftGridItem {...defaultProps} />);

    const collectibleButton = getByTestId('collectible-Test NFT-456');
    fireEvent(collectibleButton, 'longPress');

    expect(mockOnLongPress).toHaveBeenCalledWith(mockNft);
  });
});
