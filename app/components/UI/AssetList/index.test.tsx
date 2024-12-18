import React from 'react';
import { render } from '@testing-library/react-native';
import AssetList from './';

describe('AssetList', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <AssetList
        searchQuery={''}
        searchResults={[]}
        handleSelectAsset={null}
        selectedAsset={{ address: '0xABC', symbol: 'ABC', decimals: 0 }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
