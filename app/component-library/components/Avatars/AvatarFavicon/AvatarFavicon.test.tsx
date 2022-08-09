// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import {
  TEST_IMAGE_SOURCE,
  FAVICON_AVATAR_IMAGE_ID,
} from './AvatarFavicon.constants';

describe('AvatarFavicon', () => {
  it('should match the snapshot', () => {
    const wrapper = shallow(
      <AvatarFavicon
        size={AvatarBaseSize.Xl}
        imageSource={TEST_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render favicon', () => {
    const wrapper = shallow(
      <AvatarFavicon
        size={AvatarBaseSize.Xl}
        imageSource={TEST_IMAGE_SOURCE}
      />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === FAVICON_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render fallback', () => {
    const wrapper = shallow(
      <AvatarFavicon
        size={AvatarBaseSize.Xl}
        imageSource={TEST_IMAGE_SOURCE}
      />,
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
