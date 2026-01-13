import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// eslint-disable-next-line import/no-namespace
import * as AssetSelectionMetrics from '../../hooks/send/metrics/useAssetSelectionMetrics';
import { NftList } from './nft-list';
import { Nft } from '../../types/token';
import Routes from '../../../../../constants/navigation/Routes';
import { useSendContext } from '../../context/send-context';

const mockGotToSendScreen = jest.fn();

jest.mock('../../hooks/send/useSendScreenNavigation', () => ({
  useSendScreenNavigation: () => ({
    gotToSendScreen: mockGotToSendScreen,
  }),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../UI/nft', () => {
  const { Pressable, Text } = jest.requireActual('react-native');

  return {
    Nft: ({
      asset,
      onPress,
    }: {
      asset: Nft;
      onPress: (asset: Nft) => void;
    }) => (
      <Pressable
        testID={`nft-${asset.name || asset.tokenId}`}
        onPress={() => onPress(asset)}
      >
        <Text>{asset.name || asset.tokenId}</Text>
      </Pressable>
    ),
  };
});

const mockNfts: Nft[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    standard: 'ERC721',
    name: 'Cool NFT #1',
    collectionName: 'Cool Collection',
    image: 'https://example.com/nft1.png',
    chainId: '0x1',
    tokenId: '1',
    accountId: 'account1',
    networkBadgeSource: { uri: 'https://example.com/badge.png' },
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    standard: 'ERC1155',
    name: 'Awesome NFT #2',
    collectionName: 'Awesome Collection',
    image: 'https://example.com/nft2.png',
    chainId: '0x1',
    tokenId: '2',
    accountId: 'account1',
    networkBadgeSource: { uri: 'https://example.com/badge.png' },
  },
];

const manyNfts: Nft[] = Array.from({ length: 12 }, (_, i) => ({
  address: `0x${i.toString().padStart(40, '0')}`,
  standard: 'ERC721' as const,
  name: `NFT ${i}`,
  collectionName: `Collection ${i}`,
  image: `https://example.com/nft${i}.png`,
  chainId: '0x1',
  tokenId: i.toString(),
  accountId: 'account1',
  networkBadgeSource: { uri: 'https://example.com/badge.png' },
}));

describe('NftList', () => {
  const mockUpdateAsset = jest.fn();
  const mockUseSendContext = jest.mocked(useSendContext);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSendContext.mockReturnValue({
      updateAsset: mockUpdateAsset,
      asset: undefined,
    } as unknown as ReturnType<typeof useSendContext>);
  });

  describe('nft rendering', () => {
    it('renders nfts when provided', () => {
      const { getByTestId } = render(<NftList nfts={mockNfts} />);

      expect(getByTestId('nft-Cool NFT #1')).toBeOnTheScreen();
      expect(getByTestId('nft-Awesome NFT #2')).toBeOnTheScreen();
    });

    it('renders empty list when no nfts provided', () => {
      const { queryByTestId } = render(<NftList nfts={[]} />);

      expect(queryByTestId('nft-Cool NFT #1')).toBeNull();
      expect(queryByTestId('nft-Awesome NFT #2')).toBeNull();
    });

    it('renders single nft correctly', () => {
      const singleNft = [mockNfts[0]];
      const { getByTestId } = render(<NftList nfts={singleNft} />);

      expect(getByTestId('nft-Cool NFT #1')).toBeOnTheScreen();
    });
  });

  describe('nft selection', () => {
    it('calls updateAsset and navigates to recipient screen when ERC721 nft is pressed', () => {
      const { getByTestId } = render(<NftList nfts={mockNfts} />);

      fireEvent.press(getByTestId('nft-Cool NFT #1'));

      expect(mockUpdateAsset).toHaveBeenCalledWith(mockNfts[0]);
      expect(mockGotToSendScreen).toHaveBeenCalledWith(Routes.SEND.RECIPIENT);
    });

    it('calls updateTo when there is an existing asset selected', () => {
      const mockUpdateTo = jest.fn();
      mockUseSendContext.mockReturnValue({
        updateAsset: mockUpdateAsset,
        updateTo: mockUpdateTo,
        asset: mockNfts[0],
      } as unknown as ReturnType<typeof useSendContext>);

      const { getByTestId } = render(<NftList nfts={mockNfts} />);

      fireEvent.press(getByTestId('nft-Cool NFT #1'));
      expect(mockUpdateTo).toHaveBeenCalledWith('');
    });

    it('calls updateAsset and navigates to amount screen when ERC1155 nft is pressed', () => {
      const { getByTestId } = render(<NftList nfts={mockNfts} />);

      fireEvent.press(getByTestId('nft-Awesome NFT #2'));

      expect(mockUpdateAsset).toHaveBeenCalledWith(mockNfts[1]);
      expect(mockGotToSendScreen).toHaveBeenCalledWith(Routes.SEND.AMOUNT);
    });

    it('calls captureAssetSelected with correct asset and position', () => {
      const mockCaptureAssetSelected = jest.fn();
      jest
        .spyOn(AssetSelectionMetrics, 'useAssetSelectionMetrics')
        .mockReturnValue({
          captureAssetSelected: mockCaptureAssetSelected,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

      const { getByTestId } = render(<NftList nfts={mockNfts} />);

      fireEvent.press(getByTestId('nft-Cool NFT #1'));

      expect(mockCaptureAssetSelected).toHaveBeenCalledWith(mockNfts[0], '0');
    });

    it('calls captureAssetSelected with correct position for second nft', () => {
      const mockCaptureAssetSelected = jest.fn();
      jest
        .spyOn(AssetSelectionMetrics, 'useAssetSelectionMetrics')
        .mockReturnValue({
          captureAssetSelected: mockCaptureAssetSelected,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

      const { getByTestId } = render(<NftList nfts={mockNfts} />);

      fireEvent.press(getByTestId('nft-Awesome NFT #2'));

      expect(mockCaptureAssetSelected).toHaveBeenCalledWith(mockNfts[1], '1');
    });
  });

  describe('pagination functionality', () => {
    it('shows only first 5 nfts initially', () => {
      const { queryByTestId } = render(<NftList nfts={manyNfts} />);

      expect(queryByTestId('nft-NFT 0')).toBeOnTheScreen();
      expect(queryByTestId('nft-NFT 4')).toBeOnTheScreen();
      expect(queryByTestId('nft-NFT 5')).toBeNull();
      expect(queryByTestId('nft-NFT 11')).toBeNull();
    });

    it('shows "Show more NFTs" button when there are more than 5 nfts', () => {
      const { getByText } = render(<NftList nfts={manyNfts} />);

      expect(getByText('Show more NFTs')).toBeOnTheScreen();
    });

    it('does not show "Show more NFTs" button when 5 or fewer nfts', () => {
      const { queryByText } = render(<NftList nfts={mockNfts} />);

      expect(queryByText('Show more NFTs')).toBeNull();
    });

    it('shows more nfts when "Show more NFTs" is pressed', () => {
      const { getByText, queryByTestId } = render(<NftList nfts={manyNfts} />);

      expect(queryByTestId('nft-NFT 5')).toBeNull();

      fireEvent.press(getByText('Show more NFTs'));

      expect(queryByTestId('nft-NFT 5')).toBeOnTheScreen();
      expect(queryByTestId('nft-NFT 9')).toBeOnTheScreen();
    });

    it('hides "Show more NFTs" button when all nfts are visible', () => {
      const { getByText, queryByText } = render(<NftList nfts={manyNfts} />);

      fireEvent.press(getByText('Show more NFTs'));
      fireEvent.press(getByText('Show more NFTs'));

      expect(queryByText('Show more NFTs')).toBeNull();
    });

    it('shows correct number of nfts after multiple "Show more" presses', () => {
      const largeNftList = Array.from({ length: 20 }, (_, i) => ({
        ...mockNfts[0],
        address: `0x${i.toString().padStart(40, '0')}`,
        name: `NFT ${i}`,
        tokenId: i.toString(),
      }));

      const { getByText, queryByTestId } = render(
        <NftList nfts={largeNftList} />,
      );

      fireEvent.press(getByText('Show more NFTs'));

      expect(queryByTestId('nft-NFT 9')).toBeOnTheScreen();
      expect(queryByTestId('nft-NFT 10')).toBeNull();

      fireEvent.press(getByText('Show more NFTs'));

      expect(queryByTestId('nft-NFT 14')).toBeOnTheScreen();
      expect(queryByTestId('nft-NFT 15')).toBeNull();
    });
  });
});
