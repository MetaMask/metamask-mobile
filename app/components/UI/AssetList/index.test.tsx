import React from 'react';
import { shallow } from 'enzyme';
import AssetList from './';
import mockedEngine from '../../../core/__mocks__/MockedEngine';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

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
