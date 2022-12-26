// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
// eslint-disable-next-line
// @ts-ignore
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import AvatarToken from './AvatarToken';
import {
  TOKEN_AVATAR_IMAGE_ID,
  TEST_TOKEN_NAME,
  TEST_LOCAL_IMAGE_SOURCE,
  TEST_REMOTE_IMAGE_SOURCE,
} from './AvatarToken.constants';

describe('AvatarToken', () => {
  /* eslint-disable-next-line */

  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarToken
        size={AvatarSize.Xl}
        name={TEST_TOKEN_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render remote network image', () => {
    const wrapper = shallow(
      <AvatarToken
        size={AvatarSize.Xl}
        name={TEST_TOKEN_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );

    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render local network image', () => {
    const wrapper = shallow(
      <AvatarToken
        size={AvatarSize.Xl}
        name={TEST_TOKEN_NAME}
        imageSource={TEST_LOCAL_IMAGE_SOURCE}
      />,
    );

    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(true);
  });

  it('should render fallback when image fails to load', () => {
    const wrapper = shallow(
      <AvatarToken
        size={AvatarSize.Xl}
        name={TEST_TOKEN_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );
    const prevImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    // Simulate onError on Image component
    prevImageComponent.props().onError({ nativeEvent: { error: 'ERROR!' } });
    const currentImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    expect(currentImageComponent.exists()).toBe(false);
  });

  it('should render fallback when tokenImageUrl is not provided', () => {
    const wrapper = shallow(
      <AvatarToken size={AvatarSize.Xl} name={TEST_TOKEN_NAME} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(false);
  });
});
