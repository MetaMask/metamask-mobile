import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import NftGridItem from './NftGridItem';
import { Nft } from '@metamask/assets-controllers';
import { StackNavigationProp } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';

interface NftGridNavigationParamList {
  AddAsset: { assetType: string };
  NftDetails: { collectible: Nft };
  [key: string]: undefined | object;
}

const mockNavigate = jest.fn();
const mockShow = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../components/UI/CollectibleMedia', () => 'CollectibleMedia');

const mockNft: Nft = {
  address: '0x123',
  tokenId: '1',
  name: 'Test NFT',
  image: 'test.jpg',
  chainId: 1,
  description: 'Test NFT Description',
  standard: 'ERC721',
  collection: {
    name: 'Test Collection',
  },
};

// Create a more complete navigation mock
const mockNavigation = {
  navigate: mockNavigate,
  dispatch: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  dangerouslyGetState: jest.fn(),
  dangerouslyGetParent: jest.fn(),
  setParams: jest.fn(),
} as unknown as StackNavigationProp<NftGridNavigationParamList, 'AddAsset'>;

const mockActionSheetRef = {
  current: {
    show: mockShow,
  },
};

const mockLongPressedCollectible = {
  current: null as Nft | null,
};

const renderComponent = (props = {}) =>
  renderWithProvider(
    <NftGridItem
      nft={mockNft}
      navigation={mockNavigation}
      actionSheetRef={mockActionSheetRef}
      longPressedCollectible={mockLongPressedCollectible}
      {...props}
    />,
  );

describe('NftGridItem', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockShow.mockClear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly with NFT data', () => {
    const { getByTestId, getByText } = renderComponent();
    const collectionName = mockNft.collection?.name ?? '';

    expect(getByTestId(mockNft.name)).toBeTruthy();
    expect(getByText(mockNft.name)).toBeTruthy();
    if (collectionName) {
      const collectionElement = getByText(collectionName);
      expect(collectionElement).toBeTruthy();
    }
  });

  it('handles press event and navigates to NFT details', async () => {
    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.press(getByTestId(mockNft.name));
    });

    // Fast-forward debounce timer
    jest.advanceTimersByTime(200);

    expect(mockNavigate).toHaveBeenCalledWith('NftDetails', {
      collectible: mockNft,
    });
  });

  it('handles long press event and shows action sheet', () => {
    const { getByTestId } = renderComponent();

    fireEvent(getByTestId(mockNft.name), 'longPress');

    expect(mockShow).toHaveBeenCalled();
    expect(mockLongPressedCollectible.current).toBe(mockNft);
  });

  it('returns null when NFT is not provided', () => {
    const { UNSAFE_getByType } = renderComponent({
      nft: null as unknown as Nft,
    });
    expect(() => UNSAFE_getByType(TouchableOpacity)).toThrow();
  });

  it('handles NFT without collection name', () => {
    const nftWithoutCollection = { ...mockNft, collection: undefined };
    const { getByTestId, getByText, queryByText } = renderComponent({
      nft: nftWithoutCollection,
    });
    const collectionName = mockNft.collection?.name ?? '';

    expect(getByTestId(mockNft.name)).toBeTruthy();
    expect(getByText(mockNft.name)).toBeTruthy();
    if (collectionName) {
      const collectionElement = queryByText(collectionName);
      expect(collectionElement).toBeNull();
    }
  });

  it('debounces navigation on rapid presses', async () => {
    const { getByTestId } = renderComponent();

    // Simulate rapid presses
    await act(async () => {
      fireEvent.press(getByTestId(mockNft.name));
      fireEvent.press(getByTestId(mockNft.name));
      fireEvent.press(getByTestId(mockNft.name));
    });

    // Fast-forward debounce timer
    jest.advanceTimersByTime(200);

    // Should only navigate once despite multiple presses
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
