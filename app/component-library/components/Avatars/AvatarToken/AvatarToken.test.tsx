// Third party dependencies.
import React from 'react';
import { ImageSourcePropType } from 'react-native';
import { shallow } from 'enzyme';

// External dependencies.
// eslint-disable-next-line
// @ts-ignore
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarToken from './AvatarToken';
import {
  TOKEN_AVATAR_IMAGE_ID,
  TEST_NETWORK_NAME,
} from './AvatarToken.constants';

describe('AvatarToken', () => {
  /* eslint-disable-next-line */
  const ethLogo: ImageSourcePropType = require('../../../../images/eth-logo.png');

  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarToken
        size={AvatarBaseSize.Xl}
        name={TEST_NETWORK_NAME}
        imageSource={ethLogo}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render network image', () => {
    const wrapper = shallow(
      <AvatarToken
        size={AvatarBaseSize.Xl}
        name={TEST_NETWORK_NAME}
        imageSource={ethLogo}
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
        size={AvatarBaseSize.Xl}
        name={TEST_NETWORK_NAME}
        imageSource={ethLogo}
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
      <AvatarToken size={AvatarBaseSize.Xl} name={TEST_NETWORK_NAME} />,
    );
    const imageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_AVATAR_IMAGE_ID,
    );
    expect(imageComponent.exists()).toBe(false);
  });
});
