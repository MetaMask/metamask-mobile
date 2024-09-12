import React from 'react';
import { shallow } from 'enzyme';
import AssetList from './';

describe('AssetList', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AssetList
        searchQuery={''}
        searchResults={[]}
        handleSelectAsset={null}
        selectedAsset={{ address: '0xABC', symbol: 'ABC', decimals: 0 }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
