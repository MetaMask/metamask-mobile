import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Nft } from '@metamask/assets-controllers';
import NftGridItem from './NftGridItem';

let mockDisplayNftMedia = true;
jest.mock('react-redux', () => ({
  useSelector: () => mockDisplayNftMedia,
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const styleFunc = (className: string | string[]) => {
      if (Array.isArray(className)) {
        return className.reduce((acc, cls) => ({ ...acc, [cls]: true }), {});
      }
      return { [className]: true };
    };
    styleFunc.style = styleFunc;
    return styleFunc;
  },
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Text: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText {...props}>{children}</RNText>;
  },
  TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm' },
  FontWeight: { Medium: 'Medium' },
  Box: ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID={testID}>{children}</View>;
  },
}));

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: (...args: unknown[]) => unknown) => fn,
}));

let mockOnLoad: (() => void) | undefined;
jest.mock('../CollectibleMedia', () => ({
  __esModule: true,
  default: ({ onLoad }: { onLoad?: () => void }) => {
    mockOnLoad = onLoad;
    const { View } = jest.requireActual('react-native');
    return <View testID="collectible-media" />;
  },
}));

jest.mock('../../../component-library/components-temp/Skeleton', () => ({
  Skeleton: () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="nft-skeleton" />;
  },
}));

describe('NftGridItem', () => {
  const mockNft: Nft = {
    address: '0x123',
    tokenId: '456',
    name: 'Test NFT',
    image: 'https://example.com/nft.png',
    collection: { name: 'Test Collection' },
    chainId: 1,
    isCurrentlyOwned: true,
    standard: 'ERC721',
  } as Nft;

  const mockOnLongPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnLoad = undefined;
    mockDisplayNftMedia = true;
  });

  it('shows skeleton while image is loading when NFT has an image', () => {
    const { getByTestId } = render(
      <NftGridItem
        item={mockNft}
        onLongPress={mockOnLongPress}
        source="mobile-nft-list"
      />,
    );

    expect(getByTestId('nft-skeleton')).toBeOnTheScreen();
  });

  it('hides skeleton after image loads', async () => {
    const { getByTestId, queryByTestId } = render(
      <NftGridItem
        item={mockNft}
        onLongPress={mockOnLongPress}
        source="mobile-nft-list"
      />,
    );

    expect(getByTestId('nft-skeleton')).toBeOnTheScreen();

    await act(async () => {
      mockOnLoad?.();
    });

    await waitFor(() => {
      expect(queryByTestId('nft-skeleton')).toBeNull();
    });
  });

  it('does not show skeleton when NFT has no image', () => {
    const nftWithoutImage: Nft = {
      ...mockNft,
      image: null,
      imageOriginal: undefined,
    };

    const { queryByTestId } = render(
      <NftGridItem
        item={nftWithoutImage}
        onLongPress={mockOnLongPress}
        source="mobile-nft-list"
      />,
    );

    expect(queryByTestId('nft-skeleton')).toBeNull();
  });

  it('does not show skeleton when NFT media display is disabled, even if NFT has an image', () => {
    mockDisplayNftMedia = false;

    const { queryByTestId } = render(
      <NftGridItem
        item={mockNft}
        onLongPress={mockOnLongPress}
        source="mobile-nft-list"
      />,
    );

    expect(queryByTestId('nft-skeleton')).toBeNull();
  });

  it('resets skeleton loading state when NFT item changes to one with an image', async () => {
    const nftWithoutImage: Nft = {
      ...mockNft,
      image: null,
      imageOriginal: undefined,
    };

    const { queryByTestId, rerender } = render(
      <NftGridItem
        item={nftWithoutImage}
        onLongPress={mockOnLongPress}
        source="mobile-nft-list"
      />,
    );

    expect(queryByTestId('nft-skeleton')).toBeNull();

    await act(async () => {
      rerender(
        <NftGridItem
          item={mockNft}
          onLongPress={mockOnLongPress}
          source="mobile-nft-list"
        />,
      );
    });

    await waitFor(() => {
      expect(queryByTestId('nft-skeleton')).not.toBeNull();
    });
  });
});
