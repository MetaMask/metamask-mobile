// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import {
  TEST_REMOTE_IMAGE_SOURCE,
  FAVICON_AVATAR_IMAGE_ID,
  TEST_LOCAL_IMAGE_SOURCE,
} from './AvatarFavicon.constants';

describe('AvatarFavicon', () => {
  it('should match the snapshot', () => {
    const wrapper = shallow(
      <AvatarFavicon
        size={AvatarSize.Xl}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render favicon with remote image', () => {
    const wrapper = shallow(
      <AvatarFavicon
        size={AvatarSize.Xl}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === FAVICON_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render favicon with local image', () => {
    const wrapper = shallow(
      <AvatarFavicon
        size={AvatarSize.Xl}
        imageSource={TEST_LOCAL_IMAGE_SOURCE}
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
        size={AvatarSize.Xl}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
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
