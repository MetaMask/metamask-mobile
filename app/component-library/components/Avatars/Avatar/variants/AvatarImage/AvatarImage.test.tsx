// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarSize, AvatarVariants } from '../../Avatar.types';

// Internal dependencies.
import AvatarImage from './AvatarImage';
import {
  TEST_AVATAR_IMAGE_LOCAL_IMAGE_SOURCE,
  TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE,
  AVATAR_IMAGE_TEST_ID,
  AVATAR_IMAGE_HALO_TEST_ID,
  AVATAR_IMAGE_IMAGE_TEST_ID,
} from './AvatarImage.constants';

describe('AvatarImage - Snapshot', () => {
  it('should render AvatarImage with local imageSource correctly', () => {
    const wrapper = shallow(
      <AvatarImage
        variant={AvatarVariants.Image}
        size={AvatarSize.Md}
        imageSource={TEST_AVATAR_IMAGE_LOCAL_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render AvatarImage with remote imageSource correctly', () => {
    const wrapper = shallow(
      <AvatarImage
        variant={AvatarVariants.Image}
        size={AvatarSize.Md}
        imageSource={TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render AvatarImage with halo if isHaloEnabled=true', () => {
    const wrapper = shallow(
      <AvatarImage
        variant={AvatarVariants.Image}
        size={AvatarSize.Md}
        imageSource={TEST_AVATAR_IMAGE_LOCAL_IMAGE_SOURCE}
        isHaloEnabled
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AvatarImage', () => {
  it('should render AvatarImage component', () => {
    const wrapper = shallow(
      <AvatarImage
        variant={AvatarVariants.Image}
        size={AvatarSize.Md}
        imageSource={TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE}
      />,
    );
    const AvatarImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_IMAGE_TEST_ID,
    );
    expect(AvatarImageComponent.exists()).toBe(true);
  });
  it('should render AvatarImage component with local imageSource', () => {
    const wrapper = shallow(
      <AvatarImage
        variant={AvatarVariants.Image}
        size={AvatarSize.Md}
        imageSource={TEST_AVATAR_IMAGE_LOCAL_IMAGE_SOURCE}
      />,
    );
    const AvatarImageImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_IMAGE_IMAGE_TEST_ID,
    );
    expect(AvatarImageImageComponent.props().source).toBe(
      TEST_AVATAR_IMAGE_LOCAL_IMAGE_SOURCE,
    );
  });
  it('should render AvatarImage component with remote imageSource', () => {
    const wrapper = shallow(
      <AvatarImage
        variant={AvatarVariants.Image}
        size={AvatarSize.Md}
        imageSource={TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE}
      />,
    );
    const AvatarImageImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_IMAGE_IMAGE_TEST_ID,
    );
    expect(AvatarImageImageComponent.props().source).toBe(
      TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE,
    );
  });
  it('should render AvatarImage with halo if isHaloEnabled=true', () => {
    const wrapper = shallow(
      <AvatarImage
        variant={AvatarVariants.Image}
        size={AvatarSize.Md}
        imageSource={TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE}
        isHaloEnabled
      />,
    );
    const AvatarImageHaloComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_IMAGE_HALO_TEST_ID,
    );
    expect(AvatarImageHaloComponent.exists()).toBe(true);
  });
  it('should NOT render AvatarImage with halo if isHaloEnabled=false', () => {
    const wrapper = shallow(
      <AvatarImage
        variant={AvatarVariants.Image}
        size={AvatarSize.Md}
        imageSource={TEST_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE}
        isHaloEnabled={false}
      />,
    );
    const AvatarImageHaloComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_IMAGE_HALO_TEST_ID,
    );
    expect(AvatarImageHaloComponent.exists()).toBe(false);
  });
});
