import React from 'react';
import { shallow } from 'enzyme';

import { AvatarBaseSize } from '../AvatarBase';

import AvatarFavicon from './AvatarFavicon';
import {
  TEST_IMAGE_URL,
  FAVICON_AVATAR_IMAGE_ID,
} from './AvatarFavicon.constants';

describe('AvatarFavicon', () => {
  it('should match the snapshot', () => {
    const wrapper = shallow(
      <AvatarFavicon size={AvatarBaseSize.Xl} imageUrl={TEST_IMAGE_URL} />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render favicon', () => {
    const wrapper = shallow(
      <AvatarFavicon size={AvatarBaseSize.Xl} imageUrl={TEST_IMAGE_URL} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === FAVICON_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render fallback', () => {
    const wrapper = shallow(
      <AvatarFavicon size={AvatarBaseSize.Xl} imageUrl={TEST_IMAGE_URL} />,
    );
    const prevImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === FAVICON_AVATAR_IMAGE_ID,
    );
    // Simulate onError on Image component
    prevImageComponent.props().onError({ nativeEvent: { error: 'ERROR!' } });
    const currentImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === FAVICON_AVATAR_IMAGE_ID,
    );
    expect(currentImageComponent.exists()).toBe(false);
  });
});
