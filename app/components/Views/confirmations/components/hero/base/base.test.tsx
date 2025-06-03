import React from 'react';
import { View } from 'react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MOCK_STATE_NFT } from '../../../../../../util/test/mock-data/root-state/nft';
import { HeroBase } from './base';

describe('HeroBase', () => {
  it('renders correctly', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <HeroBase
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
