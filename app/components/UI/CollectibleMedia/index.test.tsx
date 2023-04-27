import React from 'react';
import { shallow } from 'enzyme';
import CollectibleMedia from './';

describe('CollectibleMedia', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: 'IMAGE',
          tokenId: 123,
          address: '0x123',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
