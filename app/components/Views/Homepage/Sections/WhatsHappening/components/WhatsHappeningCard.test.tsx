import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import WhatsHappeningCard from './WhatsHappeningCard';
import type { WhatsHappeningItem } from '../types';

const mockRelatedAsset = {
  sourceAssetId: 'btc-mainnet',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
};

const baseItem: WhatsHappeningItem = {
  id: 'trend-0',
  title: 'Bitcoin ETF inflows hit record high',
  description: 'Spot Bitcoin ETFs recorded over $1.2B in net inflows.',
  date: '2026-03-15T10:00:00.000Z',
  category: 'macro',
  impact: 'positive',
  relatedAssets: [mockRelatedAsset],
  articles: [],
};

describe('WhatsHappeningCard', () => {
  it('renders title and description', () => {
    renderWithProvider(<WhatsHappeningCard item={baseItem} />);
    expect(screen.getByText(baseItem.title)).toBeOnTheScreen();
    expect(screen.getByText(baseItem.description)).toBeOnTheScreen();
  });

  it('renders category badge when category is provided', () => {
    renderWithProvider(<WhatsHappeningCard item={baseItem} />);
    expect(screen.getByText('Macro')).toBeOnTheScreen();
  });

  it('does not render category badge when category is absent', () => {
    const item = { ...baseItem, category: undefined };
    renderWithProvider(<WhatsHappeningCard item={item} />);
    expect(screen.queryByText('Macro')).toBeNull();
  });

  it('renders related asset symbol pills', () => {
    renderWithProvider(<WhatsHappeningCard item={baseItem} />);
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('does not render asset pills when relatedAssets is empty', () => {
    const item = { ...baseItem, relatedAssets: [] };
    renderWithProvider(<WhatsHappeningCard item={item} />);
    expect(screen.queryByText('BTC')).toBeNull();
  });

  it('renders multiple related asset symbols', () => {
    const ethAsset = {
      sourceAssetId: 'eth-mainnet',
      symbol: 'ETH',
      name: 'Ethereum',
      caip19: ['eip155:1/slip44:60'],
    };
    const item = { ...baseItem, relatedAssets: [mockRelatedAsset, ethAsset] };
    renderWithProvider(<WhatsHappeningCard item={item} />);
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('ETH')).toBeOnTheScreen();
  });

  it('renders formatted date when date is valid', () => {
    renderWithProvider(<WhatsHappeningCard item={baseItem} />);
    expect(screen.getByText('Mar 15, 2026')).toBeOnTheScreen();
  });

  it('does not render date when date string is invalid', () => {
    const item = { ...baseItem, date: 'not-a-date' };
    renderWithProvider(<WhatsHappeningCard item={item} />);
    expect(screen.queryByText('not-a-date')).toBeNull();
  });

  it('calls onPress with the item when tapped', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <WhatsHappeningCard item={baseItem} onPress={onPress} />,
    );
    fireEvent.press(screen.getByText(baseItem.title));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(baseItem);
  });

  it('does not throw when onPress is not provided', () => {
    renderWithProvider(<WhatsHappeningCard item={baseItem} />);
    expect(() =>
      fireEvent.press(screen.getByText(baseItem.title)),
    ).not.toThrow();
  });
});
