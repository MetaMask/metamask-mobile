import React from 'react';
import { shallow } from 'enzyme';
import { BaseAvatarSize } from '../BaseAvatar';
import FaviconAvatar from '.';
import { foxImageUri } from './FaviconAvatar.data';
import { FAVICON_AVATAR_IMAGE_ID } from '../../../constants/test-ids';

describe('FaviconAvatar', () => {
  it('should match the snapshot', () => {
    const wrapper = shallow(
      <FaviconAvatar size={BaseAvatarSize.Xl} imageUrl={foxImageUri} />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render favicon', () => {
    const wrapper = shallow(
      <FaviconAvatar size={BaseAvatarSize.Xl} imageUrl={foxImageUri} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === FAVICON_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render fallback', () => {
    const wrapper = shallow(
      <FaviconAvatar size={BaseAvatarSize.Xl} imageUrl={foxImageUri} />,
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
