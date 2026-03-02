import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Nft } from '@metamask/assets-controllers';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import NftGridItem from './NftGridItem';
import { MetaMetricsEvents } from '../../../core/Analytics';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock('../CollectibleMedia', () => () => null);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const styleFunc = (className: string) => ({ [className]: true });
    styleFunc.style = styleFunc;
    return styleFunc;
  },
}));

const mockNft: Nft = {
  address: '0xABC',
  tokenId: '1',
  name: 'Test NFT',
  image: 'https://example.com/nft.png',
  collection: { name: 'Test Collection' },
  chainId: 1,
  isCurrentlyOwned: true,
  standard: 'ERC721',
} as Nft;

const initialState = {
  engine: { backgroundState },
};

describe('NftGridItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({ builtEvent: true });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
  });

  it('renders NFT name and collection', () => {
    const { getByText } = renderWithProvider(
      <NftGridItem item={mockNft} onLongPress={jest.fn()} />,
      { state: initialState },
    );

    expect(getByText('Test NFT')).toBeTruthy();
    expect(getByText('Test Collection')).toBeTruthy();
  });

  it('tracks NFT_DETAILS_OPENED event with source when NFT is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <NftGridItem
        item={mockNft}
        onLongPress={jest.fn()}
        source="mobile-nft-list"
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('collectible-Test NFT-1'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NFT_DETAILS_OPENED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'mobile-nft-list' }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith({ builtEvent: true });
  });

  it('tracks NFT_DETAILS_OPENED event with mobile-nft-list-page source from full view', () => {
    const { getByTestId } = renderWithProvider(
      <NftGridItem
        item={mockNft}
        onLongPress={jest.fn()}
        source="mobile-nft-list-page"
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('collectible-Test NFT-1'));

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'mobile-nft-list-page' }),
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('tracks NFT_DETAILS_OPENED event without source when source is not provided', () => {
    const { getByTestId } = renderWithProvider(
      <NftGridItem item={mockNft} onLongPress={jest.fn()} />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('collectible-Test NFT-1'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NFT_DETAILS_OPENED,
    );
    const propertiesArg = mockAddProperties.mock.calls[0][0];
    expect(propertiesArg).not.toHaveProperty('source');
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('navigates to NftDetails with correct params when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <NftGridItem
        item={mockNft}
        onLongPress={jest.fn()}
        source="mobile-nft-list"
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('collectible-Test NFT-1'));

    expect(mockNavigate).toHaveBeenCalledWith('NftDetails', {
      collectible: mockNft,
      source: 'mobile-nft-list',
    });
  });

  it('calls onLongPress with the NFT item when long pressed', () => {
    const mockOnLongPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <NftGridItem
        item={mockNft}
        onLongPress={mockOnLongPress}
        source="mobile-nft-list"
      />,
      { state: initialState },
    );

    fireEvent(getByTestId('collectible-Test NFT-1'), 'onLongPress');

    expect(mockOnLongPress).toHaveBeenCalledWith(mockNft);
  });

  it('tracks chain_id from the current EVM chain', () => {
    const { getByTestId } = renderWithProvider(
      <NftGridItem
        item={mockNft}
        onLongPress={jest.fn()}
        source="mobile-nft-list"
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('collectible-Test NFT-1'));

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ chain_id: expect.any(String) }),
    );
  });
});
