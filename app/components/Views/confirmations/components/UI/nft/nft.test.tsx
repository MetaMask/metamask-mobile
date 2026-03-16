import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { Nft as NftType } from '../../../types/token';
import { Nft } from './nft';

describe('Nft', () => {
  const createMockNft = (overrides: Partial<NftType> = {}): NftType => ({
    address: '0x1234567890123456789012345678901234567890',
    standard: 'ERC721',
    name: 'Cool NFT',
    collectionName: 'Awesome Collection',
    image: 'https://example.com/nft.png',
    chainId: '0x1',
    tokenId: '123',
    accountId: 'account1',
    networkBadgeSource: { uri: 'https://example.com/badge.png' },
    balance: '1',
    ...overrides,
  });
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays NFT with collection name and tokenId for ERC721', () => {
    const mockNft = createMockNft({
      standard: 'ERC721',
      collectionName: 'Bored Apes',
      name: 'Ape #456',
      tokenId: '456',
      balance: '0',
    });

    const { getByText } = renderWithProvider(
      <Nft asset={mockNft} onPress={mockOnPress} />,
    );

    expect(getByText('Bored Apes')).toBeOnTheScreen();
    expect(getByText('#456')).toBeOnTheScreen();
  });

  it('displays tokenId when name is missing', () => {
    const mockNft = createMockNft({
      collectionName: 'CryptoPunks',
      name: undefined,
      tokenId: '789',
      balance: '0',
    });

    const { getByText } = renderWithProvider(
      <Nft asset={mockNft} onPress={mockOnPress} />,
    );

    expect(getByText('CryptoPunks')).toBeOnTheScreen();
    expect(getByText('#789')).toBeOnTheScreen();
  });

  it('displays tokenId when collectionName is missing', () => {
    const mockNft = createMockNft({
      collectionName: undefined,
      standard: 'ERC721',
      name: 'Unique Art',
      tokenId: '101',
      balance: '0',
    });

    const { getByText } = renderWithProvider(
      <Nft asset={mockNft} onPress={mockOnPress} />,
    );

    expect(getByText('Unique Art')).toBeOnTheScreen();
  });

  it('displays balance when provided and not zero for ERC1155', () => {
    const mockNft = createMockNft({
      standard: 'ERC1155',
      collectionName: 'Multi Token',
      name: 'Token Item',
      balance: '5',
      tokenId: '202',
    });

    const { getByText } = renderWithProvider(
      <Nft asset={mockNft} onPress={mockOnPress} />,
    );

    expect(getByText('Multi Token')).toBeOnTheScreen();
    expect(getByText('(5) Token Item')).toBeOnTheScreen();
  });

  it('does not display balance when zero', () => {
    const mockNft = createMockNft({
      collectionName: 'Zero Balance',
      name: 'Empty Item',
      balance: '0',
      tokenId: '303',
    });

    const { getByText, queryByText } = renderWithProvider(
      <Nft asset={mockNft} onPress={mockOnPress} />,
    );

    expect(getByText('Zero Balance')).toBeOnTheScreen();
    expect(getByText('#303')).toBeOnTheScreen();
    expect(queryByText('(0)')).not.toBeOnTheScreen();
  });

  it('does not display balance when undefined', () => {
    const mockNft = createMockNft({
      collectionName: 'No Balance',
      name: 'Simple Item',
      balance: undefined,
      tokenId: '404',
    });

    const { getByText, queryByText } = renderWithProvider(
      <Nft asset={mockNft} onPress={mockOnPress} />,
    );

    expect(getByText('No Balance')).toBeOnTheScreen();
    expect(getByText('#404')).toBeOnTheScreen();
    expect(queryByText(/^\(/)).not.toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const mockNft = createMockNft();

    const { getByText } = renderWithProvider(
      <Nft asset={mockNft} onPress={mockOnPress} />,
    );

    fireEvent.press(getByText('Awesome Collection'));

    expect(mockOnPress).toHaveBeenCalledWith(mockNft);
  });

  it('renders without network badge when networkBadgeSource is undefined', () => {
    const mockNft = createMockNft({
      networkBadgeSource: undefined,
      collectionName: 'Simple Collection',
      name: 'Simple NFT',
      balance: '0',
    });

    const { getByText } = renderWithProvider(
      <Nft asset={mockNft} onPress={mockOnPress} />,
    );

    expect(getByText('Simple Collection')).toBeOnTheScreen();
    expect(getByText('#123')).toBeOnTheScreen();
  });
});
