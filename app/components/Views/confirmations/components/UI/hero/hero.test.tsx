import React from 'react';
import { View } from 'react-native';
import { MOCK_STATE_NFT } from '../../../../../../util/test/mock-data/root-state/nft';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { Hero } from './hero';

describe('Hero', () => {
  it('renders correctly', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <Hero
        componentAsset={<View testID="component-asset"></View>}
        title="Test Title"
        subtitle="Test Subtitle"
      />,
      {
        state: MOCK_STATE_NFT,
      },
    );

    expect(getByText('Test Title')).toBeDefined();
    expect(getByText('Test Subtitle')).toBeDefined();
    expect(getByTestId('component-asset')).toBeDefined();
  });
});
