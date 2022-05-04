import React from 'react';
import { shallow } from 'enzyme';
import AssetElement from './';

describe('AssetElement', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AssetElement
        asset={{
          name: 'name',
          symbol: 'symbol',
          description: 'description',
          address: '0x123',
          totalSupply: 1,
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
