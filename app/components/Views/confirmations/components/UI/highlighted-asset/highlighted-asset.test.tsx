import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { HighlightedAssetListItem } from '../../../types/token';
import { HighlightedAsset } from './highlighted-asset';

describe('HighlightedAsset', () => {
  const mockAction = jest.fn();

  const item: HighlightedAssetListItem = {
    type: 'highlighted_asset',
    icon: 'https://example.com/perps.png',
    name: 'Perps Balance',
    name_description: 'USD',
    fiat: '$31.16',
    fiat_description: '31.16 USD',
    action: mockAction,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders highlighted asset content', () => {
    const { getByText } = renderWithProvider(<HighlightedAsset item={item} />);

    expect(getByText('Perps Balance')).toBeOnTheScreen();
    expect(getByText('USD')).toBeOnTheScreen();
    expect(getByText('$31.16')).toBeOnTheScreen();
    expect(getByText('31.16 USD')).toBeOnTheScreen();
  });

  it('calls item action when pressed', () => {
    const { getByText } = renderWithProvider(<HighlightedAsset item={item} />);

    fireEvent.press(getByText('Perps Balance'));

    expect(mockAction).toHaveBeenCalledTimes(1);
  });
});
