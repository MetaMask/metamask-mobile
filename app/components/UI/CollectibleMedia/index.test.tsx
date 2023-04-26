import React from 'react';
import { render } from '@testing-library/react-native';
import CollectibleMedia from './';

describe('CollectibleMedia', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <CollectibleMedia
        collectible={{
          name: 'NAME',
          image: 'IMAGE',
          tokenId: 123,
          address: '0x123',
        }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
