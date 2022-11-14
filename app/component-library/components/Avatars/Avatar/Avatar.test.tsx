// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { SAMPLE_AVATAR_BLOCKIES_ACCOUNT_ADDRESS } from './variants/AvatarBlockies/AvatarBlockies.constants';
import { SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_PROPS } from './variants/AvatarImage/AvatarImage.constants';
import { SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT } from './variants/AvatarInitial/AvatarInitial.constants';
import { SAMPLE_AVATAR_JAZZICON_PROPS } from './variants/AvatarJazzIcon/AvatarJazzIcon.constants';

// Internal dependencies.
import Avatar from './Avatar';
import { AvatarSizes, AvatarVariants } from './Avatar.types';
import {
  AVATAR_AVATAR_BLOCKIES_TEST_ID,
  AVATAR_AVATAR_IMAGE_TEST_ID,
  AVATAR_AVATAR_INITIAL_TEST_ID,
  AVATAR_AVATAR_JAZZICON_TEST_ID,
} from './Avatar.constants';

describe('Avatar - Snapshot', () => {
  it('should render AvatarBlockies correctly', () => {
    const wrapper = shallow(
      <Avatar
        variant={AvatarVariants.Blockies}
        size={AvatarSizes.Md}
        accountAddress={SAMPLE_AVATAR_BLOCKIES_ACCOUNT_ADDRESS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render AvatarImage correctly', () => {
    const wrapper = shallow(
      <Avatar
        variant={AvatarVariants.Image}
        size={AvatarSizes.Md}
        imageProps={SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render AvatarInitial correctly', () => {
    const wrapper = shallow(
      <Avatar
        variant={AvatarVariants.Initial}
        size={AvatarSizes.Md}
        initial={SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render AvatarJazzIcon correctly', () => {
    const wrapper = shallow(
      <Avatar
        variant={AvatarVariants.JazzIcon}
        size={AvatarSizes.Md}
        jazzIconProps={SAMPLE_AVATAR_JAZZICON_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Avatar', () => {
  it('should render AvatarBlockies component', () => {
    const wrapper = shallow(
      <Avatar
        variant={AvatarVariants.Blockies}
        size={AvatarSizes.Md}
        accountAddress={SAMPLE_AVATAR_BLOCKIES_ACCOUNT_ADDRESS}
      />,
    );
    const AvatarBlockiesComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_AVATAR_BLOCKIES_TEST_ID,
    );
    expect(AvatarBlockiesComponent.exists()).toBe(true);
  });
  it('should render AvatarImage component', () => {
    const wrapper = shallow(
      <Avatar
        variant={AvatarVariants.Image}
        size={AvatarSizes.Md}
        imageProps={SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_PROPS}
      />,
    );
    const AvatarImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_AVATAR_IMAGE_TEST_ID,
    );
    expect(AvatarImageComponent.exists()).toBe(true);
  });
  it('should render AvatarInitial component', () => {
    const wrapper = shallow(
      <Avatar
        variant={AvatarVariants.Initial}
        size={AvatarSizes.Md}
        initial={SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT}
      />,
    );
    const AvatarInitialComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_AVATAR_INITIAL_TEST_ID,
    );
    expect(AvatarInitialComponent.exists()).toBe(true);
  });
  it('should render AvatarJazzIcon component', () => {
    const wrapper = shallow(
      <Avatar
        variant={AvatarVariants.JazzIcon}
        size={AvatarSizes.Md}
        jazzIconProps={SAMPLE_AVATAR_JAZZICON_PROPS}
      />,
    );
    const AvatarJazzIconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === AVATAR_AVATAR_JAZZICON_TEST_ID,
    );
    expect(AvatarJazzIconComponent.exists()).toBe(true);
  });
});
